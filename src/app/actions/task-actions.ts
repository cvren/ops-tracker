"use server";

import {
  ActivityEventType,
  TaskStatus,
  type Prisma
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createActivityEvent,
  getTaskTransitionActivityDescriptor,
  resolveTaskCommentNotificationRecipients,
  summarizeChangedFields,
  uniqueUserIds
} from "@/lib/activity";
import { taskStatusLabels } from "@/lib/constants";
import { type ActionState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import {
  flattenFieldErrors,
  getStringValue,
  normalizeDueDate,
  normalizeOptionalText,
  parseCommentFormData,
  parseTaskFormData
} from "@/lib/validation";
import {
  getTaskTransitionResult,
  type TaskTransitionIntent
} from "@/lib/task-workflow";
import { formatDate } from "@/lib/utils";
import { requireWorkspaceRole } from "@/lib/workspace";

function revalidateTaskSurfaces(input: {
  taskId?: string;
  projectIds?: string[];
}) {
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/inbox");
  revalidatePath("/workspace");

  if (input.taskId) {
    revalidatePath(`/tasks/${input.taskId}`);
  }

  for (const projectId of input.projectIds ?? []) {
    revalidatePath(`/projects/${projectId}`);
  }
}

function collectSelectedUserIds(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value));
}

async function assertWorkspaceUsers(
  workspaceId: string,
  userIds: string[]
) {
  if (userIds.length === 0) {
    return;
  }

  const uniqueIds = [...new Set(userIds)];
  const memberships = await prisma.membership.findMany({
    where: {
      workspaceId,
      userId: {
        in: uniqueIds
      }
    },
    select: {
      userId: true
    }
  });

  if (memberships.length !== uniqueIds.length) {
    throw new Error("Choose assignees, reviewers, and mentions from the workspace members.");
  }
}

async function getWorkspaceProject(
  workspaceId: string,
  projectId: string
) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      workspaceId
    },
    select: {
      id: true,
      code: true
    }
  });
}

async function getWorkspaceTask(
  workspaceId: string,
  taskId: string
) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        workspaceId
      }
    },
    include: {
      project: {
        select: {
          id: true,
          code: true,
          workspaceId: true
        }
      },
      assignee: {
        select: {
          id: true,
          name: true
        }
      },
      reviewer: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
}

function isSameDueDate(
  left: Date | null | undefined,
  right: Date | null | undefined
) {
  return (left?.toISOString().slice(0, 10) ?? "") ===
    (right?.toISOString().slice(0, 10) ?? "")
    ? true
    : false;
}

function formatAssigneeName(name: string | null | undefined) {
  return name ?? "Unassigned";
}

type Tx = Prisma.TransactionClient;

async function getUserNameMap(tx: Tx, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, string>();
  }

  const users = await tx.user.findMany({
    where: {
      id: {
        in: [...new Set(userIds)]
      }
    },
    select: {
      id: true,
      name: true
    }
  });

  return new Map(users.map((user) => [user.id, user.name]));
}

async function createTaskChangeEvents(
  tx: Tx,
  input: {
    actorId: string;
    workspaceId: string;
    task: {
      id: string;
      title: string;
      projectId: string;
      assigneeId: string | null;
      reviewerId: string | null;
      createdById: string;
      dueDate: Date | null;
      assigneeName?: string | null;
      reviewerName?: string | null;
    };
    previous: {
      assigneeId: string | null;
      reviewerId: string | null;
      dueDate: Date | null;
    };
    generalChangedFields: string[];
  }
) {
  if (input.generalChangedFields.length > 0) {
    await createActivityEvent(tx, {
      workspaceId: input.workspaceId,
      projectId: input.task.projectId,
      taskId: input.task.id,
      actorId: input.actorId,
      type: ActivityEventType.TASK_UPDATED,
      payload: {
        changedFields: input.generalChangedFields,
        summary: summarizeChangedFields(input.generalChangedFields)
      }
    });
  }

  if (input.previous.assigneeId !== input.task.assigneeId) {
    await createActivityEvent(tx, {
      workspaceId: input.workspaceId,
      projectId: input.task.projectId,
      taskId: input.task.id,
      actorId: input.actorId,
      type: ActivityEventType.TASK_ASSIGNEE_CHANGED,
      payload: {
        summary: `changed owner to ${formatAssigneeName(input.task.assigneeName)}`
      },
      notificationUserIds: [input.task.assigneeId]
    });
  }

  if (input.previous.reviewerId !== input.task.reviewerId) {
    await createActivityEvent(tx, {
      workspaceId: input.workspaceId,
      projectId: input.task.projectId,
      taskId: input.task.id,
      actorId: input.actorId,
      type: ActivityEventType.TASK_REVIEWER_CHANGED,
      payload: {
        summary: input.task.reviewerName
          ? `set reviewer to ${input.task.reviewerName}`
          : "cleared the reviewer"
      },
      notificationUserIds: [input.task.reviewerId]
    });
  }

  if (!isSameDueDate(input.previous.dueDate, input.task.dueDate)) {
    await createActivityEvent(tx, {
      workspaceId: input.workspaceId,
      projectId: input.task.projectId,
      taskId: input.task.id,
      actorId: input.actorId,
      type: ActivityEventType.TASK_DUE_DATE_CHANGED,
      payload: {
        summary: input.task.dueDate
          ? `set due date to ${formatDate(input.task.dueDate)}`
          : "cleared the due date"
      }
    });
  }
}

export async function createTaskAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole();
    const parsed = parseTaskFormData(formData);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Task validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    if (
      ([
        TaskStatus.NEEDS_REVIEW,
        TaskStatus.CHANGES_REQUESTED,
        TaskStatus.DONE
      ] as TaskStatus[]).includes(parsed.data.status)
    ) {
      return {
        status: "error",
        message: "Create the task first, then move it through review from the detail page."
      };
    }

    const project = await getWorkspaceProject(
      context.workspace.id,
      parsed.data.projectId
    );

    if (!project) {
      return {
        status: "error",
        message: "Choose a valid project."
      };
    }

    await assertWorkspaceUsers(
      context.workspace.id,
      collectSelectedUserIds([
        parsed.data.assigneeId,
        parsed.data.reviewerId
      ])
    );

    const dueDate = normalizeDueDate(parsed.data.dueDate);
    const blockedReason = normalizeOptionalText(parsed.data.blockedReason);
    const blockedCategory =
      parsed.data.blockedCategory === ""
        ? null
        : parsed.data.blockedCategory;
    const now = new Date();

    const task = await prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
        data: {
          projectId: parsed.data.projectId,
          title: parsed.data.title,
          description: parsed.data.description,
          status: parsed.data.status,
          priority: parsed.data.priority,
          assigneeId: parsed.data.assigneeId || null,
          reviewerId: parsed.data.reviewerId || null,
          createdById: context.user.id,
          updatedById: context.user.id,
          dueDate,
          blockedReason,
          blockedCategory,
          startedAt:
            parsed.data.status === TaskStatus.IN_PROGRESS ? now : null
        },
      });

      const userNameMap = await getUserNameMap(
        tx,
        collectSelectedUserIds([
          createdTask.assigneeId,
          createdTask.reviewerId
        ])
      );

      await createActivityEvent(tx, {
        workspaceId: context.workspace.id,
        projectId: createdTask.projectId,
        taskId: createdTask.id,
        actorId: context.user.id,
        type: ActivityEventType.TASK_CREATED,
        payload: {
          summary: `created task "${createdTask.title}"`
        }
      });

      await createTaskChangeEvents(tx, {
        actorId: context.user.id,
        workspaceId: context.workspace.id,
        task: {
          id: createdTask.id,
          title: createdTask.title,
          projectId: createdTask.projectId,
          assigneeId: createdTask.assigneeId,
          reviewerId: createdTask.reviewerId,
          createdById: createdTask.createdById,
          dueDate: createdTask.dueDate,
          assigneeName: createdTask.assigneeId
            ? userNameMap.get(createdTask.assigneeId)
            : null,
          reviewerName: createdTask.reviewerId
            ? userNameMap.get(createdTask.reviewerId)
            : null
        },
        previous: {
          assigneeId: null,
          reviewerId: null,
          dueDate: null
        },
        generalChangedFields: []
      });

      if (createdTask.status !== TaskStatus.BACKLOG) {
        await createActivityEvent(tx, {
          workspaceId: context.workspace.id,
          projectId: createdTask.projectId,
          taskId: createdTask.id,
          actorId: context.user.id,
          type: ActivityEventType.TASK_STATUS_CHANGED,
          payload: {
            summary: `set status to ${taskStatusLabels[createdTask.status]}`
          }
        });
      }

      return createdTask;
    });

    revalidateTaskSurfaces({
      projectIds: [task.projectId]
    });

    return {
      status: "success",
      message: "Task created and linked to the project.",
      entityId: task.id
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Task creation failed."
    };
  }
}

export async function updateTaskAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole();
    const taskId = getStringValue(formData, "taskId");
    const existingTask = await getWorkspaceTask(context.workspace.id, taskId);

    if (!existingTask) {
      return {
        status: "error",
        message: "Task not found."
      };
    }

    const parsed = parseTaskFormData(formData);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Task validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    const project = await getWorkspaceProject(
      context.workspace.id,
      parsed.data.projectId
    );

    if (!project) {
      return {
        status: "error",
        message: "Choose a valid project."
      };
    }

    await assertWorkspaceUsers(
      context.workspace.id,
      collectSelectedUserIds([
        parsed.data.assigneeId,
        parsed.data.reviewerId
      ])
    );

    if (parsed.data.status !== existingTask.status) {
      return {
        status: "error",
        message: "Use the task workflow controls to change status."
      };
    }

    if (
      existingTask.status === TaskStatus.NEEDS_REVIEW &&
      existingTask.reviewerId !== (parsed.data.reviewerId || null)
    ) {
      return {
        status: "error",
        message: "Finish the pending review before changing the reviewer."
      };
    }

    const dueDate = normalizeDueDate(parsed.data.dueDate);
    const blockedReason = normalizeOptionalText(parsed.data.blockedReason);
    const blockedCategory =
      parsed.data.blockedCategory === ""
        ? null
        : parsed.data.blockedCategory;
    const generalChangedFields = [
      existingTask.title !== parsed.data.title ? "title" : null,
      existingTask.description !== parsed.data.description
        ? "description"
        : null,
      existingTask.priority !== parsed.data.priority ? "priority" : null,
      existingTask.projectId !== parsed.data.projectId ? "project" : null,
      existingTask.blockedReason !== blockedReason ? "blocked reason" : null,
      existingTask.blockedCategory !== blockedCategory
        ? "blocked category"
        : null
    ].filter(Boolean) as string[];

    const task = await prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: {
          id: taskId
        },
        data: {
          projectId: parsed.data.projectId,
          title: parsed.data.title,
          description: parsed.data.description,
          priority: parsed.data.priority,
          assigneeId: parsed.data.assigneeId || null,
          reviewerId: parsed.data.reviewerId || null,
          dueDate,
          blockedReason,
          blockedCategory,
          updatedById: context.user.id
        },
      });

      const userNameMap = await getUserNameMap(
        tx,
        collectSelectedUserIds([
          updatedTask.assigneeId,
          updatedTask.reviewerId
        ])
      );

      await createTaskChangeEvents(tx, {
        actorId: context.user.id,
        workspaceId: context.workspace.id,
        task: {
          id: updatedTask.id,
          title: updatedTask.title,
          projectId: updatedTask.projectId,
          assigneeId: updatedTask.assigneeId,
          reviewerId: updatedTask.reviewerId,
          createdById: updatedTask.createdById,
          dueDate: updatedTask.dueDate,
          assigneeName: updatedTask.assigneeId
            ? userNameMap.get(updatedTask.assigneeId)
            : null,
          reviewerName: updatedTask.reviewerId
            ? userNameMap.get(updatedTask.reviewerId)
            : null
        },
        previous: {
          assigneeId: existingTask.assigneeId,
          reviewerId: existingTask.reviewerId,
          dueDate: existingTask.dueDate
        },
        generalChangedFields
      });

      return updatedTask;
    });

    revalidateTaskSurfaces({
      taskId: task.id,
      projectIds: uniqueUserIds([existingTask.projectId, task.projectId])
    });

    return {
      status: "success",
      message: "Task updated.",
      entityId: task.id
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Task update failed."
    };
  }
}

export async function addTaskCommentAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole();
    const parsed = parseCommentFormData(formData);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Comment validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    const task = await getWorkspaceTask(context.workspace.id, parsed.data.taskId);

    if (!task) {
      return {
        status: "error",
        message: "Task not found."
      };
    }

    await assertWorkspaceUsers(
      context.workspace.id,
      parsed.data.mentionedUserIds
    );

    await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          taskId: task.id,
          authorId: context.user.id,
          body: parsed.data.body,
          mentions: {
            create: parsed.data.mentionedUserIds.map((userId) => ({
              userId
            }))
          }
        }
      });

      const mentionedNames =
        parsed.data.mentionedUserIds.length > 0
          ? await tx.user.findMany({
              where: {
                id: {
                  in: parsed.data.mentionedUserIds
                }
              },
              select: {
                name: true
              }
            })
          : [];

      const { commentUserIds, mentionUserIds } =
        resolveTaskCommentNotificationRecipients({
          task,
          mentionedUserIds: parsed.data.mentionedUserIds,
          authorId: context.user.id
        });

      await createActivityEvent(tx, {
        workspaceId: context.workspace.id,
        projectId: task.projectId,
        taskId: task.id,
        commentId: comment.id,
        actorId: context.user.id,
        type: ActivityEventType.COMMENT_CREATED,
        payload: {
          body: comment.body,
          mentionedUserIds: parsed.data.mentionedUserIds,
          summary: "commented on the task"
        },
        notificationUserIds: commentUserIds
      });

      if (mentionUserIds.length > 0) {
        await createActivityEvent(tx, {
          workspaceId: context.workspace.id,
          projectId: task.projectId,
          taskId: task.id,
          commentId: comment.id,
          actorId: context.user.id,
          type: ActivityEventType.COMMENT_MENTIONED,
          payload: {
            body: comment.body,
            mentionedUserIds: parsed.data.mentionedUserIds,
            summary: `mentioned ${mentionedNames.map((user) => user.name).join(", ")} in a comment`
          },
          notificationUserIds: mentionUserIds
        });
      }
    });

    revalidateTaskSurfaces({
      taskId: task.id,
      projectIds: [task.projectId]
    });

    return {
      status: "success",
      message: "Comment added."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Comment failed."
    };
  }
}

export async function transitionTaskAction(
  taskId: string,
  intent: TaskTransitionIntent
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole();
    const existingTask = await getWorkspaceTask(context.workspace.id, taskId);

    if (!existingTask) {
      return {
        status: "error",
        message: "Task not found."
      };
    }

    const transition = getTaskTransitionResult({
      intent,
      actorId: context.user.id,
      membership: {
        role: context.membership.role,
        userId: context.user.id
      },
      task: existingTask
    });

    if (!transition.ok) {
      return {
        status: "error",
        message: transition.error
      };
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: {
          id: existingTask.id
        },
        data: {
          ...transition.data,
          updatedById: context.user.id
        }
      });

      const descriptor = getTaskTransitionActivityDescriptor({
        eventType: transition.eventType,
        task: existingTask,
        currentStatus: taskStatusLabels[existingTask.status],
        nextStatus: taskStatusLabels[transition.nextStatus]
      });

      await createActivityEvent(tx, {
        workspaceId: context.workspace.id,
        projectId: existingTask.projectId,
        taskId: existingTask.id,
        actorId: context.user.id,
        type: transition.eventType,
        payload: {
          fromStatus: existingTask.status,
          toStatus: transition.nextStatus,
          summary: descriptor.summary
        },
        notificationUserIds: descriptor.notificationUserIds
      });

      return task;
    });

    revalidateTaskSurfaces({
      taskId: updatedTask.id,
      projectIds: [existingTask.projectId]
    });

    return {
      status: "success",
      message:
        transition.eventType === ActivityEventType.TASK_REVIEW_REQUESTED
          ? "Review requested."
          : transition.eventType === ActivityEventType.TASK_REVIEW_APPROVED
            ? "Task approved and marked done."
            : transition.eventType === ActivityEventType.TASK_CHANGES_REQUESTED
              ? "Changes requested."
              : `Status changed to ${taskStatusLabels[transition.nextStatus]}.`
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Task transition failed."
    };
  }
}

export async function deleteTaskAction(formData: FormData) {
  const context = await requireWorkspaceRole();
  const taskId = getStringValue(formData, "taskId");
  const task = await getWorkspaceTask(context.workspace.id, taskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  await prisma.task.delete({
    where: {
      id: taskId
    }
  });

  revalidateTaskSurfaces({
    projectIds: [task.projectId]
  });
  redirect(`/projects/${task.projectId}`);
}

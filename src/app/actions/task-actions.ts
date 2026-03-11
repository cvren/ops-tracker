"use server";

import {
  ActivityEventType,
  TaskStatus
} from "@prisma/client";
import { redirect } from "next/navigation";

import {
  createActivityEvent,
  getTaskTransitionActivityDescriptor,
  resolveTaskCommentNotificationRecipients,
  uniqueUserIds
} from "@/lib/activity";
import { taskStatusLabels } from "@/lib/constants";
import { type ActionState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import {
  assertWorkspaceUsers,
  collectSelectedUserIds,
  createTaskChangeEvents,
  getUserNameMap,
  getWorkspaceProject,
  getWorkspaceTask,
  revalidateTaskSurfaces
} from "@/lib/task-action-helpers";
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
import { requireWorkspaceRole } from "@/lib/workspace";

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

import {
  ActivityEventType,
  type Prisma
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  createActivityEvent,
  summarizeChangedFields
} from "@/lib/activity";
import { taskStatusLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export function revalidateTaskSurfaces(input: {
  taskId?: string;
  projectIds?: string[];
}) {
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/inbox");
  revalidatePath("/workspace");
  revalidatePath("/templates");

  if (input.taskId) {
    revalidatePath(`/tasks/${input.taskId}`);
  }

  for (const projectId of input.projectIds ?? []) {
    revalidatePath(`/projects/${projectId}`);
  }
}

export function collectSelectedUserIds(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value));
}

export async function assertWorkspaceUsers(
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

export async function getWorkspaceProject(
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

export async function getWorkspaceTask(
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

export function isSameDueDate(
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

export type Tx = Prisma.TransactionClient;

export async function getUserNameMap(tx: Tx, userIds: string[]) {
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

export async function createTaskChangeEvents(
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

export function getTaskStatusSummary(status: keyof typeof taskStatusLabels) {
  return taskStatusLabels[status];
}

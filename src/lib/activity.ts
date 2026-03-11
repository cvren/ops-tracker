import {
  ActivityEventType,
  type Prisma,
  type Task,
  type User
} from "@prisma/client";

type Tx = Prisma.TransactionClient;

type ActivityPayload = Prisma.InputJsonValue;

export async function createActivityEvent(
  tx: Tx,
  input: {
    workspaceId: string;
    projectId?: string | null;
    taskId?: string | null;
    commentId?: string | null;
    actorId?: string | null;
    type: ActivityEventType;
    payload?: ActivityPayload;
    notificationUserIds?: Array<string | null | undefined>;
  }
) {
  const event = await tx.activityEvent.create({
    data: {
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      commentId: input.commentId ?? null,
      actorId: input.actorId ?? null,
      type: input.type,
      payload: input.payload
    }
  });

  const userIds = uniqueUserIds(
    input.notificationUserIds ?? [],
    input.actorId
  );

  if (userIds.length > 0) {
    await tx.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        activityEventId: event.id
      })),
      skipDuplicates: true
    });
  }

  return event;
}

export function uniqueUserIds(
  userIds: Array<string | null | undefined>,
  excludedUserId?: string | null
) {
  return [...new Set(userIds.filter(Boolean) as string[])].filter(
    (userId) => userId !== excludedUserId
  );
}

export function summarizeChangedFields(fields: string[]) {
  if (fields.length === 0) {
    return "updated the task details";
  }

  if (fields.length === 1) {
    return `updated ${fields[0]}`;
  }

  return `updated ${fields.slice(0, -1).join(", ")} and ${fields.at(-1)}`;
}

export function getTaskInvolvedUserIds(task: {
  assigneeId?: string | null;
  reviewerId?: string | null;
  createdById?: string | null;
}) {
  return uniqueUserIds([task.assigneeId, task.reviewerId, task.createdById]);
}

export function resolveTaskCommentNotificationRecipients(input: {
  task: Pick<Task, "assigneeId" | "reviewerId" | "createdById">;
  mentionedUserIds: string[];
  authorId: string;
}) {
  const mentionUserIds = uniqueUserIds(input.mentionedUserIds, input.authorId);
  const commentUserIds = uniqueUserIds(
    getTaskInvolvedUserIds(input.task).filter(
      (userId) => !mentionUserIds.includes(userId)
    ),
    input.authorId
  );

  return {
    commentUserIds,
    mentionUserIds
  };
}

export function getTaskTransitionActivityDescriptor(input: {
  eventType: ActivityEventType;
  task: Pick<
    Task,
    "assigneeId" | "reviewerId" | "createdById" | "blockedReason"
  > & {
    reviewer?: Pick<User, "name"> | null;
  };
  currentStatus: string;
  nextStatus: string;
}) {
  switch (input.eventType) {
    case ActivityEventType.TASK_REVIEW_REQUESTED:
      return {
        summary: `requested review from ${input.task.reviewer?.name ?? "the reviewer"}`,
        notificationUserIds: [input.task.reviewerId]
      };
    case ActivityEventType.TASK_REVIEW_APPROVED:
      return {
        summary: "approved the task",
        notificationUserIds: [input.task.assigneeId, input.task.createdById]
      };
    case ActivityEventType.TASK_CHANGES_REQUESTED:
      return {
        summary: "requested changes",
        notificationUserIds: [input.task.assigneeId, input.task.createdById]
      };
    case ActivityEventType.TASK_BLOCKED:
      return {
        summary: input.task.blockedReason
          ? `blocked the task: ${input.task.blockedReason}`
          : "blocked the task",
        notificationUserIds: [input.task.reviewerId, input.task.createdById]
      };
    case ActivityEventType.TASK_UNBLOCKED:
      return {
        summary: "cleared the blocked state and resumed work",
        notificationUserIds: [input.task.reviewerId, input.task.createdById]
      };
    default:
      return {
        summary: `changed status from ${input.currentStatus} to ${input.nextStatus}`,
        notificationUserIds: []
      };
  }
}

export function formatPersonName(user?: Pick<User, "name"> | null) {
  return user?.name ?? "Someone";
}

export function getActivitySummary(
  payload: Prisma.JsonValue | null | undefined
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const summary = payload.summary;
  return typeof summary === "string" ? summary : null;
}

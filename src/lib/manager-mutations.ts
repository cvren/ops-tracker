import {
  type BlockedCategory,
  type TaskPriority,
  TaskStatus
} from "@prisma/client";

import { addDays, getDueDateBoundary } from "@/lib/task-views";

export type BulkBlockedState = "keep" | "block" | "unblock";

export type BulkTaskUpdateValues = {
  assigneeId?: string | null;
  reviewerId?: string | null;
  dueDate?: Date | null;
  status?: TaskStatus | null;
  priority?: TaskPriority | null;
  blockedState: BulkBlockedState;
  blockedReason?: string | null;
  blockedCategory?: BlockedCategory | null;
};

type BulkTaskRecord = {
  title?: string;
  assigneeId: string | null;
  reviewerId: string | null;
  dueDate: Date | null;
  status: TaskStatus;
  priority: TaskPriority;
  blockedReason: string | null;
  blockedCategory: BlockedCategory | null;
  startedAt: Date | null;
  completedAt: Date | null;
};

const bulkBlockableStatuses: TaskStatus[] = [
  TaskStatus.BACKLOG,
  TaskStatus.IN_PROGRESS,
  TaskStatus.CHANGES_REQUESTED,
  TaskStatus.BLOCKED
];

export function dedupeBulkTaskIds(taskIds: string[]) {
  return [...new Set(taskIds)];
}

export function getBulkTaskValidationError(
  task: BulkTaskRecord,
  values: BulkTaskUpdateValues
) {
  const nextAssigneeId = values.assigneeId ?? task.assigneeId;
  const nextReviewerId = values.reviewerId ?? task.reviewerId;

  if (
    nextAssigneeId !== null &&
    nextReviewerId !== null &&
    nextAssigneeId === nextReviewerId
  ) {
    return `Task "${task.title ?? "Untitled task"}" cannot assign the same person as owner and reviewer.`;
  }

  if (
    values.reviewerId !== undefined &&
    task.status === TaskStatus.NEEDS_REVIEW &&
    values.reviewerId !== task.reviewerId
  ) {
    return `Task "${task.title ?? "Untitled task"}" is already waiting on review. Finish the pending review before changing the reviewer.`;
  }

  if (values.status !== undefined) {
    if (task.status === TaskStatus.NEEDS_REVIEW) {
      return `Task "${task.title ?? "Untitled task"}" is in review. Use the review controls before changing its status.`;
    }

    if (task.status === TaskStatus.BLOCKED) {
      return `Task "${task.title ?? "Untitled task"}" is blocked. Unblock it before applying a bulk status change.`;
    }
  }

  if (values.blockedState === "block") {
    if (!bulkBlockableStatuses.includes(task.status)) {
      return `Task "${task.title ?? "Untitled task"}" cannot be marked blocked from its current status.`;
    }
  }

  if (values.blockedState === "unblock" && task.status !== TaskStatus.BLOCKED) {
    return `Task "${task.title ?? "Untitled task"}" is not blocked.`;
  }

  return null;
}

export function buildBulkTaskUpdatePlan(
  task: BulkTaskRecord,
  values: BulkTaskUpdateValues,
  now = new Date()
) {
  const data: Partial<BulkTaskRecord> = {};
  const changedFields: string[] = [];

  if (values.assigneeId && values.assigneeId !== task.assigneeId) {
    data.assigneeId = values.assigneeId;
    changedFields.push("owner");
  }

  if (values.reviewerId && values.reviewerId !== task.reviewerId) {
    data.reviewerId = values.reviewerId;
    changedFields.push("reviewer");
  }

  if (values.dueDate && values.dueDate.getTime() !== task.dueDate?.getTime()) {
    data.dueDate = values.dueDate;
    changedFields.push("due date");
  }

  if (values.priority && values.priority !== task.priority) {
    data.priority = values.priority;
    changedFields.push("priority");
  }

  if (values.blockedState === "block") {
    if (task.status !== TaskStatus.BLOCKED) {
      data.status = TaskStatus.BLOCKED;
    }
    if ((values.blockedReason ?? null) !== task.blockedReason) {
      data.blockedReason = values.blockedReason ?? null;
    }
    if ((values.blockedCategory ?? null) !== task.blockedCategory) {
      data.blockedCategory = values.blockedCategory ?? null;
    }
    if (
      data.status ||
      data.blockedReason !== undefined ||
      data.blockedCategory !== undefined
    ) {
      data.completedAt = null;
      changedFields.push("blocked state");
    }
  } else if (
    values.blockedState === "unblock" &&
    task.status === TaskStatus.BLOCKED
  ) {
    data.status = TaskStatus.IN_PROGRESS;
    data.completedAt = null;
    data.startedAt = task.startedAt ?? now;
    data.blockedReason = null;
    data.blockedCategory = null;
    changedFields.push("blocked state");
  } else if (values.status && values.status !== task.status) {
    data.status = values.status;
    changedFields.push("status");

    if (values.status === TaskStatus.BACKLOG) {
      data.completedAt = null;
    }

    if (values.status === TaskStatus.IN_PROGRESS) {
      data.startedAt = task.startedAt ?? now;
      data.completedAt = null;
    }
  }

  return {
    changedFields,
    data
  };
}

type TaskTemplateRecord = {
  title: string;
  description: string;
  defaultAssigneeId: string | null;
  defaultReviewerId: string | null;
  defaultDueOffsetDays: number | null;
  defaultPriority: TaskPriority;
  defaultStatus: TaskStatus;
};

export function buildTaskFromTemplateValues(
  template: TaskTemplateRecord,
  now = new Date()
) {
  const dueDate =
    template.defaultDueOffsetDays === null
      ? null
      : addDays(getDueDateBoundary(now), template.defaultDueOffsetDays);

  return {
    title: template.title,
    description: template.description,
    assigneeId: template.defaultAssigneeId,
    reviewerId: template.defaultReviewerId,
    dueDate,
    priority: template.defaultPriority,
    status: template.defaultStatus,
    startedAt:
      template.defaultStatus === TaskStatus.IN_PROGRESS ? now : null,
    completedAt: null,
    blockedReason: null,
    blockedCategory: null
  };
}

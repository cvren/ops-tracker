import {
  TaskStatus,
  type TaskPriority,
  type WorkspaceRole
} from "@prisma/client";

import { addDays, getDueDateBoundary, getStaleReviewBoundary } from "@/lib/task-views";

export const agingBucketDefinitions = [
  { key: "fresh", label: "Updated < 2 days", minDays: 0, maxDays: 2 },
  { key: "watch", label: "Updated 2-7 days ago", minDays: 2, maxDays: 8 },
  { key: "stale", label: "Updated 8+ days ago", minDays: 8, maxDays: Infinity }
] as const;

export type AgingBucketKey = (typeof agingBucketDefinitions)[number]["key"];

type AgingTask = {
  updatedAt: Date;
  status: TaskStatus;
};

type WorkloadTask = {
  assigneeId: string | null;
  reviewerId: string | null;
  dueDate: Date | null;
  status: TaskStatus;
};

type DueSoonTask = {
  dueDate: Date | null;
  status: TaskStatus;
};

type ReviewAgeTask = {
  status: TaskStatus;
  reviewRequestedAt: Date | null;
  updatedAt: Date;
};

type WorkloadMember = {
  id: string;
  name: string;
  role: WorkspaceRole;
};

export function getTaskAgeInDays(updatedAt: Date, now = new Date()) {
  return Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
}

export function getAgingBucketKey(updatedAt: Date, now = new Date()) {
  const ageInDays = getTaskAgeInDays(updatedAt, now);

  const bucket = agingBucketDefinitions.find(
    (definition) =>
      ageInDays >= definition.minDays && ageInDays < definition.maxDays
  );

  return bucket?.key ?? "fresh";
}

export function buildAgingBuckets(tasks: ReadonlyArray<AgingTask>, now = new Date()) {
  const counts = new Map<AgingBucketKey, number>(
    agingBucketDefinitions.map((bucket) => [bucket.key, 0])
  );

  for (const task of tasks) {
    if (task.status === TaskStatus.DONE) {
      continue;
    }

    const bucketKey = getAgingBucketKey(task.updatedAt, now);
    counts.set(bucketKey, (counts.get(bucketKey) ?? 0) + 1);
  }

  return agingBucketDefinitions.map((bucket) => ({
    ...bucket,
    count: counts.get(bucket.key) ?? 0
  }));
}

export function buildWorkloadByMember(
  members: ReadonlyArray<WorkloadMember>,
  tasks: ReadonlyArray<WorkloadTask>,
  now = new Date()
) {
  const dueBoundary = getDueDateBoundary(now);

  return members
    .map((member) => {
      const openTasks = tasks.filter(
        (task) =>
          task.assigneeId === member.id && task.status !== TaskStatus.DONE
      );
      const reviewQueueCount = tasks.filter(
        (task) =>
          task.reviewerId === member.id && task.status === TaskStatus.NEEDS_REVIEW
      ).length;
      const overdueCount = openTasks.filter(
        (task) => task.dueDate !== null && task.dueDate < dueBoundary
      ).length;
      const blockedCount = openTasks.filter(
        (task) => task.status === TaskStatus.BLOCKED
      ).length;

      return {
        ...member,
        openCount: openTasks.length,
        reviewQueueCount,
        overdueCount,
        blockedCount,
        totalLoad: openTasks.length + reviewQueueCount
      };
    })
    .filter((member) => member.openCount > 0 || member.reviewQueueCount > 0)
    .sort((left, right) => {
      return (
        right.totalLoad - left.totalLoad ||
        right.overdueCount - left.overdueCount ||
        right.reviewQueueCount - left.reviewQueueCount ||
        left.name.localeCompare(right.name)
      );
    });
}

export function getDueTodayCount(
  tasks: ReadonlyArray<DueSoonTask>,
  now = new Date()
) {
  const todayBoundary = getDueDateBoundary(now);
  const tomorrowBoundary = addDays(todayBoundary, 1);

  return tasks.filter(
    (task) =>
      task.status !== TaskStatus.DONE &&
      task.dueDate !== null &&
      task.dueDate >= todayBoundary &&
      task.dueDate < tomorrowBoundary
  ).length;
}

export function getDueNextSevenDaysCount(
  tasks: ReadonlyArray<DueSoonTask>,
  now = new Date()
) {
  const todayBoundary = getDueDateBoundary(now);
  const tomorrowBoundary = addDays(todayBoundary, 1);
  const sevenDaysBoundary = addDays(todayBoundary, 8);

  return tasks.filter(
    (task) =>
      task.status !== TaskStatus.DONE &&
      task.dueDate !== null &&
      task.dueDate >= tomorrowBoundary &&
      task.dueDate < sevenDaysBoundary
  ).length;
}

export function isStaleReviewTask(task: ReviewAgeTask, now = new Date()) {
  if (task.status !== TaskStatus.NEEDS_REVIEW) {
    return false;
  }

  const staleReviewBoundary = getStaleReviewBoundary(now);
  return (
    (task.reviewRequestedAt !== null &&
      task.reviewRequestedAt < staleReviewBoundary) ||
    task.updatedAt < staleReviewBoundary
  );
}

export function getBulkUpdateSummary(fields: string[]) {
  if (fields.length === 0) {
    return "applied a bulk update";
  }

  if (fields.length === 1) {
    return `bulk updated ${fields[0]}`;
  }

  return `bulk updated ${fields.slice(0, -1).join(", ")} and ${fields.at(-1)}`;
}

export function getDefaultTemplateTaskSummary(input: {
  templateName: string;
  taskTitle: string;
}) {
  return `created "${input.taskTitle}" from template ${input.templateName}`;
}

export function getPriorityLabel(priority: TaskPriority) {
  return priority.toLowerCase();
}

import { TaskPriority, TaskStatus, type Prisma } from "@prisma/client";

import { allTaskViewOptions, type TaskView } from "@/lib/constants";

const STALE_REVIEW_WINDOW_HOURS = 48;

export function parseTaskView(value: string | undefined): TaskView | undefined {
  if (!value) {
    return undefined;
  }

  return allTaskViewOptions.some((option) => option.value === value)
    ? (value as TaskView)
    : undefined;
}

export function getDueDateBoundary(now = new Date()) {
  const localDate = [
    now.getFullYear(),
    `${now.getMonth() + 1}`.padStart(2, "0"),
    `${now.getDate()}`.padStart(2, "0")
  ].join("-");

  return new Date(`${localDate}T12:00:00.000Z`);
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

export function getDueThisWeekRange(now = new Date()) {
  const start = getDueDateBoundary(now);
  const end = addDays(start, 7);
  return { start, end };
}

export function getStaleReviewBoundary(now = new Date()) {
  return new Date(now.getTime() - STALE_REVIEW_WINDOW_HOURS * 60 * 60 * 1000);
}

export function isManagerTaskView(view?: TaskView) {
  return (
    view === "review-queue" ||
    view === "blocked-aging" ||
    view === "due-this-week" ||
    view === "high-risk" ||
    view === "workload"
  );
}

export function getHighRiskWhere(now = new Date()): Prisma.TaskWhereInput {
  const overdueBoundary = getDueDateBoundary(now);
  const dueSoonRange = getDueThisWeekRange(now);
  const staleReviewBoundary = getStaleReviewBoundary(now);

  return {
    status: {
      not: TaskStatus.DONE
    },
    OR: [
      {
        dueDate: {
          lt: overdueBoundary
        }
      },
      {
        status: TaskStatus.BLOCKED
      },
      {
        assigneeId: null
      },
      {
        status: TaskStatus.NEEDS_REVIEW,
        OR: [
          {
            reviewRequestedAt: {
              lt: staleReviewBoundary
            }
          },
          {
            updatedAt: {
              lt: staleReviewBoundary
            }
          }
        ]
      },
      {
        priority: TaskPriority.HIGH,
        dueDate: {
          gte: overdueBoundary,
          lt: dueSoonRange.end
        }
      }
    ]
  };
}

export function getTaskViewWhere(input: {
  view?: TaskView;
  userId: string;
  now?: Date;
}): Prisma.TaskWhereInput {
  const now = input.now ?? new Date();

  switch (input.view) {
    case "my-tasks":
      return {
        assigneeId: input.userId,
        status: {
          not: TaskStatus.DONE
        }
      };
    case "needs-review":
      return {
        reviewerId: input.userId,
        status: TaskStatus.NEEDS_REVIEW
      };
    case "overdue":
      return {
        dueDate: {
          lt: getDueDateBoundary(now)
        },
        status: {
          not: TaskStatus.DONE
        }
      };
    case "unassigned":
      return {
        assigneeId: null,
        status: {
          not: TaskStatus.DONE
        }
      };
    case "review-queue":
      return {
        status: TaskStatus.NEEDS_REVIEW
      };
    case "blocked-aging":
      return {
        status: TaskStatus.BLOCKED
      };
    case "due-this-week": {
      const { start, end } = getDueThisWeekRange(now);
      return {
        dueDate: {
          gte: start,
          lt: end
        },
        status: {
          not: TaskStatus.DONE
        }
      };
    }
    case "high-risk":
      return getHighRiskWhere(now);
    case "workload":
    default:
      return {};
  }
}

export function getTaskViewOrderBy(
  view?: TaskView
): Prisma.TaskOrderByWithRelationInput[] {
  switch (view) {
    case "overdue":
      return [{ dueDate: "asc" }, { updatedAt: "asc" }];
    case "unassigned":
      return [{ createdAt: "asc" }, { updatedAt: "asc" }];
    case "review-queue":
      return [{ reviewRequestedAt: "asc" }, { updatedAt: "asc" }];
    case "blocked-aging":
      return [{ updatedAt: "asc" }, { dueDate: "asc" }];
    case "due-this-week":
      return [{ dueDate: "asc" }, { priority: "desc" }, { updatedAt: "asc" }];
    case "high-risk":
      return [{ dueDate: "asc" }, { updatedAt: "asc" }];
    default:
      return [{ updatedAt: "desc" }];
  }
}

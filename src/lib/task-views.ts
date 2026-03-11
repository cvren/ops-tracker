import { TaskStatus, type Prisma } from "@prisma/client";

import { type TaskView } from "@/lib/constants";

export function parseTaskView(value: string | undefined): TaskView | undefined {
  if (
    value === "my-tasks" ||
    value === "needs-review" ||
    value === "overdue" ||
    value === "unassigned"
  ) {
    return value;
  }

  return undefined;
}

export function getDueDateBoundary(now = new Date()) {
  const localDate = [
    now.getFullYear(),
    `${now.getMonth() + 1}`.padStart(2, "0"),
    `${now.getDate()}`.padStart(2, "0")
  ].join("-");

  return new Date(`${localDate}T12:00:00.000Z`);
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
    default:
      return {};
  }
}

import { describe, expect, it } from "vitest";

import {
  getDueDateBoundary,
  getHighRiskWhere,
  getTaskViewOrderBy,
  getTaskViewWhere,
  isManagerTaskView,
  parseTaskView
} from "@/lib/task-views";

describe("task views", () => {
  it("parses known views only", () => {
    expect(parseTaskView("my-tasks")).toBe("my-tasks");
    expect(parseTaskView("review-queue")).toBe("review-queue");
    expect(parseTaskView("workload")).toBe("workload");
    expect(parseTaskView("unknown")).toBeUndefined();
  });

  it("builds the my tasks filter", () => {
    expect(
      getTaskViewWhere({ view: "my-tasks", userId: "user-1" })
    ).toMatchObject({
      assigneeId: "user-1",
      status: { not: "DONE" }
    });
  });

  it("builds the needs review filter", () => {
    expect(
      getTaskViewWhere({ view: "needs-review", userId: "user-1" })
    ).toMatchObject({
      reviewerId: "user-1",
      status: "NEEDS_REVIEW"
    });
  });

  it("builds overdue, unassigned, and manager filters", () => {
    const overdue = getTaskViewWhere({
      view: "overdue",
      userId: "user-1",
      now: new Date("2026-03-11T08:00:00.000Z")
    });

    expect(overdue).toMatchObject({
      dueDate: { lt: getDueDateBoundary(new Date("2026-03-11T08:00:00.000Z")) },
      status: { not: "DONE" }
    });

    expect(
      getTaskViewWhere({ view: "unassigned", userId: "user-1" })
    ).toMatchObject({
      assigneeId: null,
      status: { not: "DONE" }
    });

    expect(
      getTaskViewWhere({ view: "review-queue", userId: "user-1" })
    ).toMatchObject({
      status: "NEEDS_REVIEW"
    });

    expect(
      getTaskViewWhere({
        view: "due-this-week",
        userId: "user-1",
        now: new Date("2026-03-11T08:00:00.000Z")
      })
    ).toMatchObject({
      dueDate: {
        gte: getDueDateBoundary(new Date("2026-03-11T08:00:00.000Z"))
      },
      status: { not: "DONE" }
    });
  });

  it("builds the high-risk queue filter", () => {
    const highRisk = getHighRiskWhere(new Date("2026-03-11T08:00:00.000Z"));

    expect(highRisk).toMatchObject({
      status: { not: "DONE" }
    });
    expect(highRisk.OR).toEqual(
      expect.arrayContaining([{ status: "BLOCKED" }, { assigneeId: null }])
    );
  });

  it("marks manager-only views and orders drill-down queues predictably", () => {
    expect(isManagerTaskView("review-queue")).toBe(true);
    expect(isManagerTaskView("workload")).toBe(true);
    expect(isManagerTaskView("my-tasks")).toBe(false);

    expect(getTaskViewOrderBy("blocked-aging")).toEqual([
      { updatedAt: "asc" },
      { dueDate: "asc" }
    ]);
    expect(getTaskViewOrderBy("due-this-week")).toEqual([
      { dueDate: "asc" },
      { priority: "desc" },
      { updatedAt: "asc" }
    ]);
  });
});

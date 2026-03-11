import { describe, expect, it } from "vitest";

import { getDueDateBoundary, getTaskViewWhere, parseTaskView } from "@/lib/task-views";

describe("task views", () => {
  it("parses known views only", () => {
    expect(parseTaskView("my-tasks")).toBe("my-tasks");
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

  it("builds overdue and unassigned filters", () => {
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
  });
});

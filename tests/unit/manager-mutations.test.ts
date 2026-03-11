import { describe, expect, it } from "vitest";

import {
  buildBulkTaskUpdatePlan,
  buildTaskFromTemplateValues,
  dedupeBulkTaskIds,
  getBulkTaskValidationError
} from "@/lib/manager-mutations";

describe("manager mutation helpers", () => {
  it("plans a bulk owner, due date, and priority update", () => {
    const plan = buildBulkTaskUpdatePlan(
      {
        assigneeId: null,
        reviewerId: null,
        dueDate: null,
        status: "BACKLOG",
        priority: "MEDIUM",
        blockedReason: null,
        blockedCategory: null,
        startedAt: null,
        completedAt: null
      },
      {
        assigneeId: "member-1",
        dueDate: new Date("2026-03-15T12:00:00.000Z"),
        priority: "HIGH",
        blockedState: "keep"
      },
      new Date("2026-03-11T00:00:00.000Z")
    );

    expect(plan.changedFields).toEqual(["owner", "due date", "priority"]);
    expect(plan.data).toMatchObject({
      assigneeId: "member-1",
      priority: "HIGH"
    });
  });

  it("plans a block and unblock flow safely", () => {
    const blockedPlan = buildBulkTaskUpdatePlan(
      {
        assigneeId: "member-1",
        reviewerId: "reviewer-1",
        dueDate: null,
        status: "IN_PROGRESS",
        priority: "HIGH",
        blockedReason: null,
        blockedCategory: null,
        startedAt: new Date("2026-03-10T00:00:00.000Z"),
        completedAt: null
      },
      {
        blockedState: "block",
        blockedReason: "Waiting on dependency",
        blockedCategory: "DEPENDENCY"
      },
      new Date("2026-03-11T00:00:00.000Z")
    );

    expect(blockedPlan.changedFields).toEqual(["blocked state"]);
    expect(blockedPlan.data).toMatchObject({
      status: "BLOCKED",
      blockedReason: "Waiting on dependency"
    });

    const unblockedPlan = buildBulkTaskUpdatePlan(
      {
        assigneeId: "member-1",
        reviewerId: "reviewer-1",
        dueDate: null,
        status: "BLOCKED",
        priority: "HIGH",
        blockedReason: "Waiting on dependency",
        blockedCategory: "DEPENDENCY",
        startedAt: null,
        completedAt: null
      },
      {
        blockedState: "unblock"
      },
      new Date("2026-03-11T00:00:00.000Z")
    );

    expect(unblockedPlan.changedFields).toEqual(["blocked state"]);
    expect(unblockedPlan.data).toMatchObject({
      status: "IN_PROGRESS",
      blockedReason: null,
      blockedCategory: null
    });
  });

  it("dedupes selected task ids before the batch runs", () => {
    expect(
      dedupeBulkTaskIds(["task-1", "task-2", "task-1", "task-3", "task-2"])
    ).toEqual(["task-1", "task-2", "task-3"]);
  });

  it("blocks unsafe reviewer, review, and blocked-state bulk mutations", () => {
    expect(
      getBulkTaskValidationError(
        {
          title: "Pending review task",
          assigneeId: "assignee-1",
          reviewerId: "reviewer-1",
          dueDate: null,
          status: "NEEDS_REVIEW",
          priority: "HIGH",
          blockedReason: null,
          blockedCategory: null,
          startedAt: new Date("2026-03-10T00:00:00.000Z"),
          completedAt: null
        },
        {
          reviewerId: "reviewer-2",
          blockedState: "keep"
        }
      )
    ).toContain("Finish the pending review before changing the reviewer");

    expect(
      getBulkTaskValidationError(
        {
          title: "Blocked task",
          assigneeId: "assignee-1",
          reviewerId: "reviewer-1",
          dueDate: null,
          status: "BLOCKED",
          priority: "HIGH",
          blockedReason: "Waiting on vendor",
          blockedCategory: "DEPENDENCY",
          startedAt: new Date("2026-03-10T00:00:00.000Z"),
          completedAt: null
        },
        {
          status: "BACKLOG",
          blockedState: "keep"
        }
      )
    ).toContain("Unblock it before applying a bulk status change");

    expect(
      getBulkTaskValidationError(
        {
          title: "Review queue task",
          assigneeId: "assignee-1",
          reviewerId: "reviewer-1",
          dueDate: null,
          status: "NEEDS_REVIEW",
          priority: "HIGH",
          blockedReason: null,
          blockedCategory: null,
          startedAt: new Date("2026-03-10T00:00:00.000Z"),
          completedAt: null
        },
        {
          blockedState: "block",
          blockedReason: "Waiting on answer",
          blockedCategory: "DECISION"
        }
      )
    ).toContain("cannot be marked blocked");
  });

  it("blocks owner and reviewer collisions against existing task values", () => {
    expect(
      getBulkTaskValidationError(
        {
          title: "Queue task",
          assigneeId: "assignee-1",
          reviewerId: "reviewer-1",
          dueDate: null,
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          blockedReason: null,
          blockedCategory: null,
          startedAt: new Date("2026-03-10T00:00:00.000Z"),
          completedAt: null
        },
        {
          reviewerId: "assignee-1",
          blockedState: "keep"
        }
      )
    ).toContain("same person as owner and reviewer");
  });

  it("builds a task payload from a template", () => {
    const taskValues = buildTaskFromTemplateValues(
      {
        title: "Run weekly sweep",
        description: "Sweep the queue and follow up on overdue review work.",
        defaultAssigneeId: "member-1",
        defaultReviewerId: "reviewer-1",
        defaultDueOffsetDays: 2,
        defaultPriority: "HIGH",
        defaultStatus: "IN_PROGRESS"
      },
      new Date("2026-03-11T00:00:00.000Z")
    );

    expect(taskValues).toMatchObject({
      title: "Run weekly sweep",
      assigneeId: "member-1",
      reviewerId: "reviewer-1",
      priority: "HIGH",
      status: "IN_PROGRESS"
    });
    expect(taskValues.dueDate?.toISOString().slice(0, 10)).toBe("2026-03-13");
  });
});

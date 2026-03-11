import { describe, expect, it } from "vitest";

import {
  getAvailableTaskTransitions,
  getTaskTransitionResult
} from "@/lib/task-workflow";

const baseMembership = {
  role: "MEMBER" as const,
  userId: "operator-1"
};

const baseTask = {
  assigneeId: "operator-1",
  blockedReason: null,
  createdById: "admin-1",
  reviewerId: "reviewer-1",
  startedAt: null,
  status: "IN_PROGRESS" as const
};

describe("task workflow", () => {
  it("offers the expected transitions for an in-progress task with a reviewer", () => {
    expect(
      getAvailableTaskTransitions({
        membership: baseMembership,
        task: baseTask
      }).map((transition) => transition.intent)
    ).toEqual(["move-to-backlog", "mark-blocked", "request-review"]);
  });

  it("prevents direct completion when a reviewer exists", () => {
    const result = getTaskTransitionResult({
      intent: "mark-done",
      actorId: "operator-1",
      membership: baseMembership,
      task: baseTask
    });

    expect(result.ok).toBe(false);
  });

  it("requires a blocked reason before blocking", () => {
    const result = getTaskTransitionResult({
      intent: "mark-blocked",
      actorId: "operator-1",
      membership: baseMembership,
      task: {
        ...baseTask,
        blockedReason: null
      }
    });

    expect(result).toEqual({
      ok: false,
      error: "Add a blocked reason before moving this task to blocked."
    });
  });

  it("allows an assignee to request review", () => {
    const result = getTaskTransitionResult({
      intent: "request-review",
      actorId: "operator-1",
      membership: baseMembership,
      task: baseTask,
      now: new Date("2026-03-11T10:00:00.000Z")
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.eventType).toBe("TASK_REVIEW_REQUESTED");
      expect(result.nextStatus).toBe("NEEDS_REVIEW");
      expect(result.data.reviewRequestedById).toBe("operator-1");
    }
  });

  it("emits blocked and unblocked event types for blocked-state transitions", () => {
    const blockedResult = getTaskTransitionResult({
      intent: "mark-blocked",
      actorId: "operator-1",
      membership: baseMembership,
      task: {
        ...baseTask,
        blockedReason: "Waiting on partner"
      }
    });

    expect(blockedResult.ok).toBe(true);
    if (blockedResult.ok) {
      expect(blockedResult.eventType).toBe("TASK_BLOCKED");
    }

    const resumedResult = getTaskTransitionResult({
      intent: "resume-work",
      actorId: "operator-1",
      membership: baseMembership,
      task: {
        ...baseTask,
        status: "BLOCKED",
        blockedReason: "Waiting on partner"
      }
    });

    expect(resumedResult.ok).toBe(true);
    if (resumedResult.ok) {
      expect(resumedResult.eventType).toBe("TASK_UNBLOCKED");
    }
  });

  it("allows the reviewer to approve a pending review", () => {
    const result = getTaskTransitionResult({
      intent: "approve-review",
      actorId: "reviewer-1",
      membership: {
        role: "MEMBER",
        userId: "reviewer-1"
      },
      task: {
        ...baseTask,
        status: "NEEDS_REVIEW"
      },
      now: new Date("2026-03-11T12:00:00.000Z")
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextStatus).toBe("DONE");
      expect(result.data.reviewedById).toBe("reviewer-1");
    }
  });
});

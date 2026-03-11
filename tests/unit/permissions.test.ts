import { describe, expect, it } from "vitest";

import {
  canManageMemberships,
  canManageTaskLifecycle,
  canMutateWorkspace,
  canRequestTaskReview,
  canReviewTask
} from "@/lib/permissions";

describe("workspace permissions", () => {
  it("blocks viewers from mutations", () => {
    expect(canMutateWorkspace("VIEWER")).toBe(false);
    expect(canMutateWorkspace("MEMBER")).toBe(true);
  });

  it("limits membership changes to admins", () => {
    expect(canManageMemberships("ADMIN")).toBe(true);
    expect(canManageMemberships("MEMBER")).toBe(false);
  });

  it("allows assignees and admins to move the lifecycle", () => {
    expect(
      canManageTaskLifecycle({
        membership: { role: "MEMBER", userId: "assignee-1" },
        task: { assigneeId: "assignee-1", createdById: "creator-1" }
      })
    ).toBe(true);

    expect(
      canManageTaskLifecycle({
        membership: { role: "ADMIN", userId: "admin-1" },
        task: { assigneeId: "assignee-1", createdById: "creator-1" }
      })
    ).toBe(true);
  });

  it("allows only assignees or admins to request review", () => {
    expect(
      canRequestTaskReview({
        membership: { role: "MEMBER", userId: "assignee-1" },
        task: { assigneeId: "assignee-1" }
      })
    ).toBe(true);

    expect(
      canRequestTaskReview({
        membership: { role: "MEMBER", userId: "other-1" },
        task: { assigneeId: "assignee-1" }
      })
    ).toBe(false);
  });

  it("allows only reviewers or admins to complete review", () => {
    expect(
      canReviewTask({
        membership: { role: "MEMBER", userId: "reviewer-1" },
        task: { reviewerId: "reviewer-1" }
      })
    ).toBe(true);

    expect(
      canReviewTask({
        membership: { role: "VIEWER", userId: "reviewer-1" },
        task: { reviewerId: "reviewer-1" }
      })
    ).toBe(false);
  });
});

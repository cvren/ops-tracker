import { describe, expect, it } from "vitest";

import {
  canManageManagerConsole,
  canManageMemberships,
  canManageTaskLifecycle,
  canMutateWorkspace,
  canRequestTaskReview,
  canReviewTask,
  getWorkspaceRoleErrorMessage,
  hasWorkspaceRoleAccess
} from "@/lib/permissions";

describe("workspace permissions", () => {
  it("blocks viewers from mutations", () => {
    expect(canMutateWorkspace("VIEWER")).toBe(false);
    expect(canMutateWorkspace("MEMBER")).toBe(true);
    expect(canMutateWorkspace("MANAGER")).toBe(true);
  });

  it("limits membership changes to admins and opens the manager console to managers", () => {
    expect(canManageMemberships("ADMIN")).toBe(true);
    expect(canManageMemberships("MANAGER")).toBe(false);
    expect(canManageMemberships("MEMBER")).toBe(false);
    expect(canManageManagerConsole("ADMIN")).toBe(true);
    expect(canManageManagerConsole("MANAGER")).toBe(true);
    expect(canManageManagerConsole("MEMBER")).toBe(false);
  });

  it("maps minimum workspace roles to the correct access boundary", () => {
    expect(
      hasWorkspaceRoleAccess({
        role: "ADMIN",
        minimumRole: "ADMIN"
      })
    ).toBe(true);
    expect(
      hasWorkspaceRoleAccess({
        role: "MANAGER",
        minimumRole: "MANAGER"
      })
    ).toBe(true);
    expect(
      hasWorkspaceRoleAccess({
        role: "MEMBER",
        minimumRole: "MANAGER"
      })
    ).toBe(false);
    expect(
      hasWorkspaceRoleAccess({
        role: "VIEWER",
        minimumRole: "MEMBER"
      })
    ).toBe(false);
    expect(getWorkspaceRoleErrorMessage("MANAGER")).toBe(
      "Only workspace admins or managers can perform that action."
    );
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

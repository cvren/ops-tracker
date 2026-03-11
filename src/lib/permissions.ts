import {
  type Membership,
  type Task,
  type WorkspaceRole
} from "@prisma/client";

export function canMutateWorkspace(role: WorkspaceRole) {
  return role !== "VIEWER";
}

export function canManageMemberships(role: WorkspaceRole) {
  return role === "ADMIN";
}

export function assertCanMutateWorkspace(role: WorkspaceRole) {
  if (!canMutateWorkspace(role)) {
    throw new Error("Viewer access is read-only.");
  }
}

export function assertCanManageMemberships(role: WorkspaceRole) {
  if (!canManageMemberships(role)) {
    throw new Error("Only workspace admins can manage members.");
  }
}

export function canReviewTask(input: {
  membership: Pick<Membership, "role" | "userId">;
  task: Pick<Task, "reviewerId">;
}) {
  return (
    canMutateWorkspace(input.membership.role) &&
    (input.membership.role === "ADMIN" ||
      input.task.reviewerId === input.membership.userId)
  );
}

export function canRequestTaskReview(input: {
  membership: Pick<Membership, "role" | "userId">;
  task: Pick<Task, "assigneeId">;
}) {
  return (
    canMutateWorkspace(input.membership.role) &&
    (input.membership.role === "ADMIN" ||
      input.task.assigneeId === input.membership.userId)
  );
}

export function canManageTaskLifecycle(input: {
  membership: Pick<Membership, "role" | "userId">;
  task: Pick<Task, "assigneeId" | "createdById">;
}) {
  return (
    canMutateWorkspace(input.membership.role) &&
    (input.membership.role === "ADMIN" ||
      input.task.assigneeId === input.membership.userId ||
      input.task.createdById === input.membership.userId)
  );
}

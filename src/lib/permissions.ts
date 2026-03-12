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

export function canManageManagerConsole(role: WorkspaceRole) {
  return role === "ADMIN" || role === "MANAGER";
}

export function hasWorkspaceRoleAccess(input: {
  role: WorkspaceRole;
  minimumRole: WorkspaceRole;
}) {
  switch (input.minimumRole) {
    case "ADMIN":
      return canManageMemberships(input.role);
    case "MANAGER":
      return canManageManagerConsole(input.role);
    case "MEMBER":
      return canMutateWorkspace(input.role);
    case "VIEWER":
      return true;
  }
}

export function getWorkspaceRoleErrorMessage(minimumRole: WorkspaceRole) {
  switch (minimumRole) {
    case "ADMIN":
      return "Only workspace admins can perform that action.";
    case "MANAGER":
      return "Only workspace admins or managers can perform that action.";
    case "MEMBER":
      return "Viewer access is read-only.";
    case "VIEWER":
      return "Workspace access is required.";
  }
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

export function assertCanManageManagerConsole(role: WorkspaceRole) {
  if (!canManageManagerConsole(role)) {
    throw new Error(
      "Only workspace admins or managers can access the manager console."
    );
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

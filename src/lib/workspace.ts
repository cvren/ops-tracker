import {
  WorkspaceRole,
  type Membership,
  type User,
  type Workspace
} from "@prisma/client";
import { cache } from "react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type WorkspaceContext = {
  membership: Membership & {
    workspace: Workspace;
  };
  user: User;
  workspace: Workspace;
};

export const getCurrentWorkspaceContext = cache(
  async (): Promise<WorkspaceContext> => {
    const user = await requireUser();
    const membership = await prisma.membership.findFirst({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: "asc"
      },
      include: {
        workspace: true
      }
    });

    if (!membership) {
      throw new Error("Workspace membership not found.");
    }

    return {
      user,
      membership,
      workspace: membership.workspace
    };
  }
);

export async function requireWorkspaceRole(
  minimumRole: WorkspaceRole = WorkspaceRole.MEMBER
) {
  const context = await getCurrentWorkspaceContext();

  if (
    minimumRole === WorkspaceRole.ADMIN &&
    context.membership.role !== WorkspaceRole.ADMIN
  ) {
    throw new Error("Only workspace admins can perform that action.");
  }

  if (
    minimumRole === WorkspaceRole.MEMBER &&
    context.membership.role === WorkspaceRole.VIEWER
  ) {
    throw new Error("Viewer access is read-only.");
  }

  return context;
}

"use server";

import { ActivityEventType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { createActivityEvent } from "@/lib/activity";
import { type ActionState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import {
  createMembershipSchema,
  flattenFieldErrors,
  getStringValue,
  updateMembershipRoleSchema
} from "@/lib/validation";
import { workspaceRoleLabels } from "@/lib/constants";
import { requireWorkspaceRole } from "@/lib/workspace";

async function ensureNotLastAdmin(workspaceId: string, membershipId: string) {
  const membership = await prisma.membership.findUnique({
    where: {
      id: membershipId
    },
    select: {
      id: true,
      workspaceId: true,
      role: true
    }
  });

  if (!membership || membership.workspaceId !== workspaceId) {
    throw new Error("Member not found.");
  }

  if (membership.role !== "ADMIN") {
    return;
  }

  const adminCount = await prisma.membership.count({
    where: {
      workspaceId,
      role: "ADMIN"
    }
  });

  if (adminCount <= 1) {
    throw new Error("Keep at least one workspace admin.");
  }
}

export async function addWorkspaceMemberAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole("ADMIN");
    const parsed = createMembershipSchema.safeParse({
      userId: getStringValue(formData, "userId"),
      role: getStringValue(formData, "role")
    });

    if (!parsed.success) {
      return {
        status: "error",
        message: "Member validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    const user = await prisma.user.findUnique({
      where: {
        id: parsed.data.userId
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!user) {
      return {
        status: "error",
        message: "User not found."
      };
    }

    const existingMembership = await prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: context.workspace.id,
          userId: user.id
        }
      }
    });

    if (existingMembership) {
      return {
        status: "error",
        message: "That user is already in the workspace."
      };
    }

    await prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          workspaceId: context.workspace.id,
          userId: user.id,
          role: parsed.data.role,
          addedById: context.user.id
        }
      });

      await createActivityEvent(tx, {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        type: ActivityEventType.MEMBERSHIP_ADDED,
        payload: {
          membershipId: membership.id,
          summary: `added ${user.name} as ${workspaceRoleLabels[parsed.data.role]}`
        }
      });
    });

    revalidatePath("/workspace");
    revalidatePath("/dashboard");
    revalidatePath("/tasks");

    return {
      status: "success",
      message: `${user.name} added to the workspace.`
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Member update failed."
    };
  }
}

export async function updateWorkspaceMemberRoleAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole("ADMIN");
    const parsed = updateMembershipRoleSchema.safeParse({
      membershipId: getStringValue(formData, "membershipId"),
      role: getStringValue(formData, "role")
    });

    if (!parsed.success) {
      return {
        status: "error",
        message: "Role validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    const membership = await prisma.membership.findUnique({
      where: {
        id: parsed.data.membershipId
      },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    });

    if (!membership || membership.workspaceId !== context.workspace.id) {
      return {
        status: "error",
        message: "Member not found."
      };
    }

    if (membership.role === parsed.data.role) {
      return {
        status: "success",
        message: "Role already up to date."
      };
    }

    if (membership.role === "ADMIN" && parsed.data.role !== "ADMIN") {
      await ensureNotLastAdmin(context.workspace.id, membership.id);
    }

    await prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: {
          id: membership.id
        },
        data: {
          role: parsed.data.role
        }
      });

      await createActivityEvent(tx, {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        type: ActivityEventType.MEMBERSHIP_ROLE_CHANGED,
        payload: {
          membershipId: membership.id,
          summary: `changed ${membership.user.name} to ${workspaceRoleLabels[parsed.data.role]}`
        }
      });
    });

    revalidatePath("/workspace");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message: `${membership.user.name} is now ${workspaceRoleLabels[parsed.data.role]}.`
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Role update failed."
    };
  }
}

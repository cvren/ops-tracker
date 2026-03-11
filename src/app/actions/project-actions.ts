"use server";

import { ActivityEventType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createActivityEvent } from "@/lib/activity";
import { type ActionState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import {
  flattenFieldErrors,
  getStringValue,
  parseProjectFormData
} from "@/lib/validation";
import { requireWorkspaceRole } from "@/lib/workspace";

export async function createProjectAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole();
    const parsed = parseProjectFormData(formData);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Project validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    const existingProject = await prisma.project.findUnique({
      where: {
        code: parsed.data.code
      }
    });

    if (existingProject) {
      return {
        status: "error",
        message: "Project code already exists.",
        fieldErrors: {
          code: ["Use a unique project code."]
        }
      };
    }

    const project = await prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          ...parsed.data,
          workspaceId: context.workspace.id,
          ownerId: context.user.id,
          updatedById: context.user.id
        }
      });

      await createActivityEvent(tx, {
        workspaceId: context.workspace.id,
        projectId: createdProject.id,
        actorId: context.user.id,
        type: ActivityEventType.PROJECT_CREATED,
        payload: {
          summary: `created project ${createdProject.code}`
        }
      });

      return createdProject;
    });

    revalidatePath("/dashboard");
    revalidatePath("/projects");

    return {
      status: "success",
      message: `Project ${project.code} created.`,
      entityId: project.id
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Project creation failed."
    };
  }
}

export async function updateProjectAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole();
    const projectId = getStringValue(formData, "projectId");
    const parsed = parseProjectFormData(formData);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Project validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId: context.workspace.id
      }
    });

    if (!existingProject) {
      return {
        status: "error",
        message: "Project not found."
      };
    }

    const conflictingProject = await prisma.project.findFirst({
      where: {
        code: parsed.data.code,
        id: {
          not: projectId
        }
      }
    });

    if (conflictingProject) {
      return {
        status: "error",
        message: "Project code already exists.",
        fieldErrors: {
          code: ["Use a unique project code."]
        }
      };
    }

    const changedFields = [
      existingProject.name !== parsed.data.name ? "name" : null,
      existingProject.code !== parsed.data.code ? "code" : null,
      existingProject.description !== parsed.data.description
        ? "description"
        : null,
      existingProject.status !== parsed.data.status ? "status" : null
    ].filter(Boolean) as string[];

    const project = await prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: {
          id: projectId
        },
        data: {
          ...parsed.data,
          updatedById: context.user.id
        }
      });

      if (changedFields.length > 0) {
        await createActivityEvent(tx, {
          workspaceId: context.workspace.id,
          projectId: updatedProject.id,
          actorId: context.user.id,
          type: ActivityEventType.PROJECT_UPDATED,
          payload: {
            changedFields,
            summary: `updated project ${updatedProject.code}`
          }
        });
      }

      return updatedProject;
    });

    revalidatePath("/dashboard");
    revalidatePath("/projects");
    revalidatePath(`/projects/${project.id}`);
    revalidatePath("/tasks");

    return {
      status: "success",
      message: "Project changes saved.",
      entityId: project.id
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Project update failed."
    };
  }
}

export async function deleteProjectAction(formData: FormData) {
  const context = await requireWorkspaceRole();
  const projectId = getStringValue(formData, "projectId");

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspaceId: context.workspace.id
    },
    select: {
      id: true
    }
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  await prisma.project.delete({
    where: {
      id: projectId
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath("/tasks");
  redirect("/projects");
}

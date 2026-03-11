"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { type ActionState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import {
  flattenFieldErrors,
  getStringValue,
  parseProjectFormData
} from "@/lib/validation";

export async function createProjectAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
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

  const project = await prisma.project.create({
    data: {
      ...parsed.data,
      ownerId: user.id,
      updatedById: user.id
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/projects");

  return {
    status: "success",
    message: `Project ${project.code} created.`,
    entityId: project.id
  };
}

export async function updateProjectAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
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
      code: parsed.data.code,
      id: {
        not: projectId
      }
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

  const project = await prisma.project.update({
    where: {
      id: projectId
    },
    data: {
      ...parsed.data,
      updatedById: user.id
    }
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
}

export async function deleteProjectAction(formData: FormData) {
  await requireUser();
  const projectId = getStringValue(formData, "projectId");

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

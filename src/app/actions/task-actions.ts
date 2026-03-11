"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { type ActionState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import {
  flattenFieldErrors,
  getStringValue,
  normalizeDueDate,
  parseTaskFormData
} from "@/lib/validation";

export async function createTaskAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser();
  const parsed = parseTaskFormData(formData);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Task validation failed.",
      fieldErrors: flattenFieldErrors(parsed.error)
    };
  }

  const project = await prisma.project.findUnique({
    where: {
      id: parsed.data.projectId
    }
  });

  if (!project) {
    return {
      status: "error",
      message: "Choose a valid project."
    };
  }

  const task = await prisma.task.create({
    data: {
      projectId: parsed.data.projectId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      assigneeId: parsed.data.assigneeId || null,
      dueDate: normalizeDueDate(parsed.data.dueDate)
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath(`/projects/${task.projectId}`);

  return {
    status: "success",
    message: "Task created and linked to the project.",
    entityId: task.id
  };
}

export async function updateTaskAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser();
  const taskId = getStringValue(formData, "taskId");
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId }
  });

  if (!existingTask) {
    return {
      status: "error",
      message: "Task not found."
    };
  }

  const parsed = parseTaskFormData(formData);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Task validation failed.",
      fieldErrors: flattenFieldErrors(parsed.error)
    };
  }

  const task = await prisma.task.update({
    where: {
      id: taskId
    },
    data: {
      projectId: parsed.data.projectId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      assigneeId: parsed.data.assigneeId || null,
      dueDate: normalizeDueDate(parsed.data.dueDate)
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${task.id}`);
  revalidatePath(`/projects/${existingTask.projectId}`);
  revalidatePath(`/projects/${task.projectId}`);

  return {
    status: "success",
    message: "Task updated.",
    entityId: task.id
  };
}

export async function deleteTaskAction(formData: FormData) {
  await requireUser();
  const taskId = getStringValue(formData, "taskId");
  const projectId = getStringValue(formData, "projectId");

  await prisma.task.delete({
    where: {
      id: taskId
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

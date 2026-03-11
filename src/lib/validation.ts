import {
  ProjectStatus,
  TaskPriority,
  TaskStatus
} from "@prisma/client";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Use a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Project name must be at least 3 characters.")
    .max(80, "Project name must be 80 characters or fewer."),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Project code must be at least 2 characters.")
    .max(12, "Project code must be 12 characters or fewer.")
    .regex(
      /^[A-Z0-9-]+$/,
      "Project code may only contain uppercase letters, numbers, and dashes."
    ),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters.")
    .max(600, "Description must be 600 characters or fewer."),
  status: z.nativeEnum(ProjectStatus)
});

export const taskSchema = z.object({
  projectId: z.string().cuid("Select a valid project."),
  title: z
    .string()
    .trim()
    .min(3, "Task title must be at least 3 characters.")
    .max(120, "Task title must be 120 characters or fewer."),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters.")
    .max(1000, "Description must be 1000 characters or fewer."),
  status: z.nativeEnum(TaskStatus),
  priority: z.nativeEnum(TaskPriority),
  assigneeId: z.string().cuid().optional().or(z.literal("")),
  dueDate: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? "")
    .refine(
      (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "Use a valid due date."
    )
});

export const taskStatusUpdateSchema = z.object({
  status: z.nativeEnum(TaskStatus)
});

export function getStringValue(
  formData: FormData,
  key: string
): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function parseProjectFormData(formData: FormData) {
  return projectSchema.safeParse({
    name: getStringValue(formData, "name"),
    code: getStringValue(formData, "code"),
    description: getStringValue(formData, "description"),
    status: getStringValue(formData, "status")
  });
}

export function parseTaskFormData(formData: FormData) {
  return taskSchema.safeParse({
    projectId: getStringValue(formData, "projectId"),
    title: getStringValue(formData, "title"),
    description: getStringValue(formData, "description"),
    status: getStringValue(formData, "status"),
    priority: getStringValue(formData, "priority"),
    assigneeId: getStringValue(formData, "assigneeId"),
    dueDate: getStringValue(formData, "dueDate")
  });
}

export function flattenFieldErrors(error: z.ZodError) {
  return error.flatten().fieldErrors;
}

export function normalizeDueDate(value: string) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T12:00:00.000Z`);
}

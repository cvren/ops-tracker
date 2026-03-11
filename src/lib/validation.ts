import {
  BlockedCategory,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  WorkspaceRole
} from "@prisma/client";
import { z } from "zod";

const optionalIdSchema = z.string().cuid().optional().or(z.literal(""));

const dateInputSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() ?? "")
  .refine(
    (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Use a valid due date."
  );

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

export const taskSchema = z
  .object({
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
    assigneeId: optionalIdSchema,
    reviewerId: optionalIdSchema,
    dueDate: dateInputSchema,
    blockedReason: z
      .string()
      .optional()
      .transform((value) => value?.trim() ?? ""),
    blockedCategory: z
      .union([z.nativeEnum(BlockedCategory), z.literal("")])
      .optional()
      .transform((value) => value ?? "")
  })
  .superRefine((data, context) => {
    if (data.status === TaskStatus.BLOCKED && data.blockedReason === "") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blockedReason"],
        message: "Blocked tasks require a reason."
      });
    }

    if (
      data.assigneeId &&
      data.reviewerId &&
      data.assigneeId === data.reviewerId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewerId"],
        message: "Reviewer must be different from the assignee."
      });
    }
  });

export const commentSchema = z.object({
  taskId: z.string().cuid("Comment target is invalid."),
  body: z
    .string()
    .trim()
    .min(2, "Comment must be at least 2 characters.")
    .max(2000, "Comment must be 2000 characters or fewer."),
  mentionedUserIds: z.array(z.string().cuid()).max(10)
});

export const createMembershipSchema = z.object({
  userId: z.string().cuid("Choose a valid user."),
  role: z.nativeEnum(WorkspaceRole)
});

export const updateMembershipRoleSchema = z.object({
  membershipId: z.string().cuid("Choose a valid member."),
  role: z.nativeEnum(WorkspaceRole)
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

export function getStringArrayValues(
  formData: FormData,
  key: string
): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
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
    reviewerId: getStringValue(formData, "reviewerId"),
    dueDate: getStringValue(formData, "dueDate"),
    blockedReason: getStringValue(formData, "blockedReason"),
    blockedCategory: getStringValue(formData, "blockedCategory")
  });
}

export function parseCommentFormData(formData: FormData) {
  return commentSchema.safeParse({
    taskId: getStringValue(formData, "taskId"),
    body: getStringValue(formData, "body"),
    mentionedUserIds: getStringArrayValues(formData, "mentionedUserIds")
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

export function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeOptionalEnum(value: ""): null;
export function normalizeOptionalEnum<T extends string>(value: T): T;
export function normalizeOptionalEnum<T extends string>(value: T | "") {
  return value === "" ? null : value;
}

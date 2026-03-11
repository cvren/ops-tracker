import {
  BlockedCategory,
  ProjectStatus,
  RecurringCadence,
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

const integerInputSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() ?? "")
  .refine((value) => value === "" || /^\d+$/.test(value), "Use a whole number.");

const bulkSelectionSchema = z.array(z.string().cuid()).min(1).max(50);

const bulkStatusSchema = z.union([
  z.literal(""),
  z.literal(TaskStatus.BACKLOG),
  z.literal(TaskStatus.IN_PROGRESS)
]);

const bulkBlockedStateSchema = z.union([
  z.literal("keep"),
  z.literal("block"),
  z.literal("unblock")
]);

const templateStatusSchema = z.union([
  z.literal(TaskStatus.BACKLOG),
  z.literal(TaskStatus.IN_PROGRESS)
]);

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

export const bulkTaskUpdateSchema = z
  .object({
    taskIds: bulkSelectionSchema,
    assigneeId: optionalIdSchema,
    reviewerId: optionalIdSchema,
    dueDate: dateInputSchema,
    status: bulkStatusSchema,
    priority: z.union([z.nativeEnum(TaskPriority), z.literal("")]),
    blockedState: bulkBlockedStateSchema,
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
    const hasChange =
      data.assigneeId !== "" ||
      data.reviewerId !== "" ||
      data.dueDate !== "" ||
      data.status !== "" ||
      data.priority !== "" ||
      data.blockedState !== "keep";

    if (!hasChange) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["taskIds"],
        message: "Choose at least one bulk change to apply."
      });
    }

    if (data.assigneeId && data.reviewerId && data.assigneeId === data.reviewerId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewerId"],
        message: "Reviewer must be different from the assignee."
      });
    }

    if (data.blockedState === "block" && data.blockedReason === "") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blockedReason"],
        message: "Blocked bulk updates require a reason."
      });
    }
  });

export const taskTemplateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Template name must be at least 2 characters.")
      .max(80, "Template name must be 80 characters or fewer."),
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
    defaultAssigneeId: optionalIdSchema,
    defaultReviewerId: optionalIdSchema,
    defaultDueOffsetDays: integerInputSchema,
    defaultPriority: z.nativeEnum(TaskPriority),
    defaultStatus: templateStatusSchema
  })
  .superRefine((data, context) => {
    if (
      data.defaultAssigneeId &&
      data.defaultReviewerId &&
      data.defaultAssigneeId === data.defaultReviewerId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["defaultReviewerId"],
        message: "Reviewer must be different from the assignee."
      });
    }
  });

export const createTaskFromTemplateSchema = z.object({
  templateId: z.string().cuid("Choose a valid template."),
  projectId: z.string().cuid("Choose a valid project.")
});

export const recurringScheduleSchema = z.object({
  templateId: z.string().cuid("Choose a valid template."),
  projectId: z.string().cuid("Choose a valid project."),
  cadence: z.nativeEnum(RecurringCadence),
  interval: integerInputSchema.refine(
    (value) => value !== "" && Number(value) >= 1 && Number(value) <= 90,
    "Interval must be between 1 and 90."
  ),
  nextRunAt: dateInputSchema.refine(
    (value) => value !== "",
    "Choose the next run date."
  ),
  isActive: z.boolean()
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

export function parseBulkTaskUpdateFormData(formData: FormData) {
  return bulkTaskUpdateSchema.safeParse({
    taskIds: [...new Set(getStringArrayValues(formData, "taskIds"))],
    assigneeId: getStringValue(formData, "assigneeId"),
    reviewerId: getStringValue(formData, "reviewerId"),
    dueDate: getStringValue(formData, "dueDate"),
    status: getStringValue(formData, "status"),
    priority: getStringValue(formData, "priority"),
    blockedState: getStringValue(formData, "blockedState") || "keep",
    blockedReason: getStringValue(formData, "blockedReason"),
    blockedCategory: getStringValue(formData, "blockedCategory")
  });
}

export function parseTaskTemplateFormData(formData: FormData) {
  return taskTemplateSchema.safeParse({
    name: getStringValue(formData, "name"),
    title: getStringValue(formData, "title"),
    description: getStringValue(formData, "description"),
    defaultAssigneeId: getStringValue(formData, "defaultAssigneeId"),
    defaultReviewerId: getStringValue(formData, "defaultReviewerId"),
    defaultDueOffsetDays: getStringValue(formData, "defaultDueOffsetDays"),
    defaultPriority: getStringValue(formData, "defaultPriority"),
    defaultStatus: getStringValue(formData, "defaultStatus")
  });
}

export function parseCreateTaskFromTemplateFormData(formData: FormData) {
  return createTaskFromTemplateSchema.safeParse({
    templateId: getStringValue(formData, "templateId"),
    projectId: getStringValue(formData, "projectId")
  });
}

export function parseRecurringScheduleFormData(formData: FormData) {
  return recurringScheduleSchema.safeParse({
    templateId: getStringValue(formData, "templateId"),
    projectId: getStringValue(formData, "projectId"),
    cadence: getStringValue(formData, "cadence"),
    interval: getStringValue(formData, "interval"),
    nextRunAt: getStringValue(formData, "nextRunAt"),
    isActive:
      getStringValue(formData, "isActive") === "on" ||
      getStringValue(formData, "isActive") === "true"
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

export function normalizeOptionalInteger(value: string) {
  if (!value) {
    return null;
  }

  return Number(value);
}

export function normalizeOptionalEnum(value: ""): null;
export function normalizeOptionalEnum<T extends string>(value: T): T;
export function normalizeOptionalEnum<T extends string>(value: T | "") {
  return value === "" ? null : value;
}

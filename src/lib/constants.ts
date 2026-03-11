import {
  ProjectStatus,
  TaskPriority,
  TaskStatus
} from "@prisma/client";

export const projectStatusOptions = [
  { value: ProjectStatus.ACTIVE, label: "Active" },
  { value: ProjectStatus.ON_HOLD, label: "On hold" },
  { value: ProjectStatus.COMPLETED, label: "Completed" },
  { value: ProjectStatus.ARCHIVED, label: "Archived" }
] as const;

export const projectStatusLabels = Object.fromEntries(
  projectStatusOptions.map((option) => [option.value, option.label])
) as Record<ProjectStatus, string>;

export const taskStatusOptions = [
  { value: TaskStatus.BACKLOG, label: "Backlog" },
  { value: TaskStatus.IN_PROGRESS, label: "In progress" },
  { value: TaskStatus.BLOCKED, label: "Blocked" },
  { value: TaskStatus.DONE, label: "Done" }
] as const;

export const taskStatusLabels = Object.fromEntries(
  taskStatusOptions.map((option) => [option.value, option.label])
) as Record<TaskStatus, string>;

export const taskPriorityOptions = [
  { value: TaskPriority.LOW, label: "Low" },
  { value: TaskPriority.MEDIUM, label: "Medium" },
  { value: TaskPriority.HIGH, label: "High" }
] as const;

export const taskPriorityLabels = Object.fromEntries(
  taskPriorityOptions.map((option) => [option.value, option.label])
) as Record<TaskPriority, string>;

export const projectStatusClasses: Record<ProjectStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-900",
  ON_HOLD: "bg-amber-100 text-amber-900",
  COMPLETED: "bg-sky-100 text-sky-900",
  ARCHIVED: "bg-stone-200 text-stone-700"
};

export const taskStatusClasses: Record<TaskStatus, string> = {
  BACKLOG: "bg-stone-200 text-stone-800",
  IN_PROGRESS: "bg-sky-100 text-sky-900",
  BLOCKED: "bg-rose-100 text-rose-900",
  DONE: "bg-emerald-100 text-emerald-900"
};

export const taskPriorityClasses: Record<TaskPriority, string> = {
  LOW: "bg-stone-200 text-stone-800",
  MEDIUM: "bg-amber-100 text-amber-900",
  HIGH: "bg-rose-100 text-rose-900"
};

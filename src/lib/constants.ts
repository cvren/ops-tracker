import {
  BlockedCategory,
  ProjectStatus,
  RecurringCadence,
  RecurringExecutionStatus,
  TaskPriority,
  TaskStatus,
  WorkspaceRole
} from "@prisma/client";
import type { ActivityEventType, RecurringTriggerSource } from "@prisma/client";

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
  { value: TaskStatus.NEEDS_REVIEW, label: "Needs review" },
  { value: TaskStatus.CHANGES_REQUESTED, label: "Changes requested" },
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

export const recurringCadenceOptions = [
  { value: RecurringCadence.DAILY, label: "Daily" },
  { value: RecurringCadence.WEEKLY, label: "Weekly" },
  { value: RecurringCadence.MONTHLY, label: "Monthly" }
] as const;

export const recurringCadenceLabels = Object.fromEntries(
  recurringCadenceOptions.map((option) => [option.value, option.label])
) as Record<RecurringCadence, string>;

export const recurringExecutionStatusOptions = [
  { value: RecurringExecutionStatus.RUNNING, label: "Running" },
  { value: RecurringExecutionStatus.SUCCESS, label: "Success" },
  { value: RecurringExecutionStatus.FAILED, label: "Failed" },
  { value: RecurringExecutionStatus.SKIPPED, label: "Skipped" }
] as const;

export const recurringExecutionStatusLabels = Object.fromEntries(
  recurringExecutionStatusOptions.map((option) => [option.value, option.label])
) as Record<RecurringExecutionStatus, string>;

export const recurringTriggerSourceLabels = {
  SYSTEM: "System",
  USER: "User"
} as const satisfies Record<RecurringTriggerSource, string>;

export const workspaceRoleOptions = [
  { value: WorkspaceRole.ADMIN, label: "Admin" },
  { value: WorkspaceRole.MANAGER, label: "Manager" },
  { value: WorkspaceRole.MEMBER, label: "Member" },
  { value: WorkspaceRole.VIEWER, label: "Viewer" }
] as const;

export const workspaceRoleLabels = Object.fromEntries(
  workspaceRoleOptions.map((option) => [option.value, option.label])
) as Record<WorkspaceRole, string>;

export const blockedCategoryOptions = [
  { value: BlockedCategory.DEPENDENCY, label: "Dependency" },
  { value: BlockedCategory.EXTERNAL, label: "External" },
  { value: BlockedCategory.DECISION, label: "Decision" },
  { value: BlockedCategory.CAPACITY, label: "Capacity" },
  { value: BlockedCategory.OTHER, label: "Other" }
] as const;

export const blockedCategoryLabels = Object.fromEntries(
  blockedCategoryOptions.map((option) => [option.value, option.label])
) as Record<BlockedCategory, string>;

export const taskViewOptions = [
  {
    value: "my-tasks",
    label: "My Tasks",
    description: "Assigned to me and not done yet."
  },
  {
    value: "needs-review",
    label: "Needs Review",
    description: "Waiting on my review."
  },
  {
    value: "overdue",
    label: "Overdue",
    description: "Past due and still open."
  },
  {
    value: "unassigned",
    label: "Unassigned",
    description: "Open work without an owner."
  }
] as const;

export const managerTaskViewOptions = [
  {
    value: "review-queue",
    label: "Review Queue",
    description: "All tasks waiting on review."
  },
  {
    value: "blocked-aging",
    label: "Blocked Aging",
    description: "Blocked tasks sorted by their oldest stall."
  },
  {
    value: "due-this-week",
    label: "Due This Week",
    description: "Open work due today or in the next seven days."
  },
  {
    value: "high-risk",
    label: "High-Risk Queue",
    description: "Overdue, blocked, stale review, or unassigned risk."
  },
  {
    value: "workload",
    label: "Workload by Member",
    description: "Open ownership and review load grouped by teammate."
  }
] as const;

export const allTaskViewOptions = [
  ...taskViewOptions,
  ...managerTaskViewOptions
] as const;

export type TaskView = (typeof allTaskViewOptions)[number]["value"];

export const taskViewLabels = Object.fromEntries(
  allTaskViewOptions.map((option) => [option.value, option.label])
) as Record<TaskView, string>;

export const projectStatusClasses: Record<ProjectStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-900",
  ON_HOLD: "bg-amber-100 text-amber-900",
  COMPLETED: "bg-sky-100 text-sky-900",
  ARCHIVED: "bg-stone-200 text-stone-700"
};

export const taskStatusClasses: Record<TaskStatus, string> = {
  BACKLOG: "bg-stone-200 text-stone-800",
  IN_PROGRESS: "bg-sky-100 text-sky-900",
  NEEDS_REVIEW: "bg-violet-100 text-violet-900",
  CHANGES_REQUESTED: "bg-amber-100 text-amber-900",
  BLOCKED: "bg-rose-100 text-rose-900",
  DONE: "bg-emerald-100 text-emerald-900"
};

export const taskPriorityClasses: Record<TaskPriority, string> = {
  LOW: "bg-stone-200 text-stone-800",
  MEDIUM: "bg-amber-100 text-amber-900",
  HIGH: "bg-rose-100 text-rose-900"
};

export const workspaceRoleClasses: Record<WorkspaceRole, string> = {
  ADMIN: "bg-sky-100 text-sky-900",
  MANAGER: "bg-amber-100 text-amber-900",
  MEMBER: "bg-emerald-100 text-emerald-900",
  VIEWER: "bg-stone-200 text-stone-800"
};

export const recurringExecutionStatusClasses: Record<
  RecurringExecutionStatus,
  string
> = {
  RUNNING: "bg-sky-100 text-sky-900",
  SUCCESS: "bg-emerald-100 text-emerald-900",
  FAILED: "bg-rose-100 text-rose-900",
  SKIPPED: "bg-amber-100 text-amber-900"
};

export const activityEventLabels: Record<ActivityEventType, string> = {
  PROJECT_CREATED: "Project created",
  PROJECT_UPDATED: "Project updated",
  TASK_CREATED: "Task created",
  TASK_UPDATED: "Task updated",
  TASK_BULK_UPDATED: "Bulk updated",
  TASK_ASSIGNEE_CHANGED: "Owner changed",
  TASK_REVIEWER_CHANGED: "Reviewer changed",
  TASK_DUE_DATE_CHANGED: "Due date changed",
  TASK_STATUS_CHANGED: "Status changed",
  TASK_BLOCKED: "Task blocked",
  TASK_UNBLOCKED: "Task unblocked",
  TASK_REVIEW_REQUESTED: "Review requested",
  TASK_REVIEW_APPROVED: "Review approved",
  TASK_CHANGES_REQUESTED: "Changes requested",
  TASK_CREATED_FROM_TEMPLATE: "Created from template",
  TASK_TEMPLATE_CREATED: "Template created",
  TASK_TEMPLATE_UPDATED: "Template updated",
  RECURRING_SCHEDULE_CREATED: "Recurring schedule created",
  RECURRING_SCHEDULE_UPDATED: "Recurring schedule updated",
  RECURRING_SCHEDULE_EXECUTED: "Recurring schedule executed",
  RECURRING_EXECUTION_STARTED: "Recurring execution started",
  RECURRING_EXECUTION_SUCCEEDED: "Recurring execution succeeded",
  RECURRING_EXECUTION_FAILED: "Recurring execution failed",
  RECURRING_EXECUTION_RERUN: "Recurring execution rerun",
  RECURRING_EXECUTION_SKIPPED: "Recurring execution skipped",
  COMMENT_CREATED: "Comment added",
  COMMENT_MENTIONED: "Mentioned teammate",
  MEMBERSHIP_ADDED: "Member added",
  MEMBERSHIP_ROLE_CHANGED: "Role changed",
  MANAGER_ROLE_GRANTED: "Manager access granted",
  MANAGER_ROLE_REVOKED: "Manager access revoked",
  MEMBERSHIP_REMOVED: "Member removed"
};

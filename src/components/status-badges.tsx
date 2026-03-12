import {
  type RecurringExecutionStatus,
  type ProjectStatus,
  type TaskPriority,
  type TaskStatus,
  type WorkspaceRole
} from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  projectStatusClasses,
  projectStatusLabels,
  recurringExecutionStatusClasses,
  recurringExecutionStatusLabels,
  taskPriorityClasses,
  taskPriorityLabels,
  taskStatusClasses,
  taskStatusLabels,
  workspaceRoleClasses,
  workspaceRoleLabels
} from "@/lib/constants";

export function ProjectStatusBadge({
  status
}: {
  status: ProjectStatus;
}) {
  return (
    <Badge className={projectStatusClasses[status]}>
      {projectStatusLabels[status]}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge className={taskStatusClasses[status]}>
      {taskStatusLabels[status]}
    </Badge>
  );
}

export function TaskPriorityBadge({
  priority
}: {
  priority: TaskPriority;
}) {
  return (
    <Badge className={taskPriorityClasses[priority]}>
      {taskPriorityLabels[priority]}
    </Badge>
  );
}

export function WorkspaceRoleBadge({ role }: { role: WorkspaceRole }) {
  return (
    <Badge className={workspaceRoleClasses[role]}>
      {workspaceRoleLabels[role]}
    </Badge>
  );
}

export function RecurringExecutionStatusBadge({
  status
}: {
  status: RecurringExecutionStatus;
}) {
  return (
    <Badge className={recurringExecutionStatusClasses[status]}>
      {recurringExecutionStatusLabels[status]}
    </Badge>
  );
}

"use client";

import {
  type Project,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type User
} from "@prisma/client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateTaskAction } from "@/app/actions/task-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  taskPriorityOptions,
  taskStatusOptions
} from "@/lib/constants";
import { INITIAL_ACTION_STATE } from "@/lib/forms";

type TaskEditFormProps = {
  projects: Pick<Project, "id" | "code" | "name">[];
  task: Task;
  users: Pick<User, "id" | "name" | "email">[];
};

export function TaskEditForm({
  projects,
  task,
  users
}: TaskEditFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    updateTaskAction,
    INITIAL_ACTION_STATE
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <Panel className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Task detail
        </p>
        <h2 className="text-2xl font-semibold text-ink">Refine the work item</h2>
      </div>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="taskId" value={task.id} />
        <div className="space-y-2">
          <label htmlFor="edit-task-project" className="text-sm font-medium text-ink">
            Project
          </label>
          <Select
            id="edit-task-project"
            name="projectId"
            defaultValue={task.projectId}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} · {project.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="edit-task-title" className="text-sm font-medium text-ink">
            Task title
          </label>
          <Input
            id="edit-task-title"
            name="title"
            defaultValue={task.title}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="edit-task-description"
            className="text-sm font-medium text-ink"
          >
            Description
          </label>
          <Textarea
            id="edit-task-description"
            name="description"
            defaultValue={task.description}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="edit-task-status"
              className="text-sm font-medium text-ink"
            >
              Status
            </label>
            <Select
              id="edit-task-status"
              name="status"
              defaultValue={task.status satisfies TaskStatus}
            >
              {taskStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="edit-task-priority"
              className="text-sm font-medium text-ink"
            >
              Priority
            </label>
            <Select
              id="edit-task-priority"
              name="priority"
              defaultValue={task.priority satisfies TaskPriority}
            >
              {taskPriorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="edit-task-assignee"
              className="text-sm font-medium text-ink"
            >
              Assignee
            </label>
            <Select
              id="edit-task-assignee"
              name="assigneeId"
              defaultValue={task.assigneeId ?? ""}
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.email}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="edit-task-due-date"
              className="text-sm font-medium text-ink"
            >
              Due date
            </label>
            <Input
              id="edit-task-due-date"
              name="dueDate"
              type="date"
              defaultValue={task.dueDate?.toISOString().slice(0, 10) ?? ""}
            />
          </div>
        </div>
        <ActionFeedback state={state} />
        <SubmitButton label="Save task" pendingLabel="Saving..." />
      </form>
    </Panel>
  );
}

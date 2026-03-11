"use client";

import {
  type Project,
  type Task,
  type TaskPriority
} from "@prisma/client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { updateTaskAction } from "@/app/actions/task-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  blockedCategoryOptions,
  taskPriorityOptions
} from "@/lib/constants";
import { INITIAL_ACTION_STATE } from "@/lib/forms";

type TaskEditFormProps = {
  projects: Pick<Project, "id" | "code" | "name">[];
  task: Pick<
    Task,
    | "id"
    | "projectId"
    | "title"
    | "description"
    | "status"
    | "priority"
    | "assigneeId"
    | "reviewerId"
    | "dueDate"
    | "blockedCategory"
    | "blockedReason"
  >;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
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
  const [persistedMessage, setPersistedMessage] = useState<string | null>(null);
  const feedbackStorageKey = `ops-tracker:task-edit-feedback:${task.id}`;

  useEffect(() => {
    const storedMessage = window.sessionStorage.getItem(feedbackStorageKey);

    if (storedMessage) {
      setPersistedMessage(storedMessage);
      window.sessionStorage.removeItem(feedbackStorageKey);
    }
  }, [feedbackStorageKey]);

  useEffect(() => {
    if (state.status === "success") {
      const nextMessage = state.message ?? "Task updated.";
      setPersistedMessage(nextMessage);
      window.sessionStorage.setItem(feedbackStorageKey, nextMessage);
      router.refresh();
    }
  }, [feedbackStorageKey, router, state.message, state.status]);

  const feedbackState =
    state.status === "idle" && persistedMessage
      ? {
          status: "success" as const,
          message: persistedMessage
        }
      : state;

  return (
    <Panel className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Task detail
        </p>
        <h2 className="text-2xl font-semibold text-ink">
          Update task details
        </h2>
        <p className="text-sm leading-6 text-ink/70">
          Edit ownership, reviewer, deadline, and blocker context here. Status
          handoff happens in the workflow panel beside this form.
        </p>
      </div>
      <form
        action={formAction}
        className="space-y-4"
        onSubmit={() => {
          setPersistedMessage(null);
          window.sessionStorage.removeItem(feedbackStorageKey);
        }}
      >
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="status" value={task.status} />
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="edit-task-assignee"
              className="text-sm font-medium text-ink"
            >
              Current owner
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
              htmlFor="edit-task-reviewer"
              className="text-sm font-medium text-ink"
            >
              Reviewer
            </label>
            <Select
              id="edit-task-reviewer"
              name="reviewerId"
              defaultValue={task.reviewerId ?? ""}
            >
              <option value="">No reviewer yet</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.email}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="edit-task-blocked-category"
              className="text-sm font-medium text-ink"
            >
              Blocked category
            </label>
            <Select
              id="edit-task-blocked-category"
              name="blockedCategory"
              defaultValue={task.blockedCategory ?? ""}
            >
              <option value="">None</option>
              {blockedCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="edit-task-blocked-reason"
              className="text-sm font-medium text-ink"
            >
              Blocked reason
            </label>
            <Textarea
              id="edit-task-blocked-reason"
              name="blockedReason"
              defaultValue={task.blockedReason ?? ""}
              className="min-h-24"
            />
          </div>
        </div>
        <ActionFeedback state={feedbackState} />
        <SubmitButton label="Save task" pendingLabel="Saving..." />
      </form>
    </Panel>
  );
}

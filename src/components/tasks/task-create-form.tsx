"use client";

import {
  type Project,
  type TaskPriority,
  type TaskStatus
} from "@prisma/client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createTaskAction } from "@/app/actions/task-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  blockedCategoryOptions,
  taskPriorityOptions,
  taskStatusOptions
} from "@/lib/constants";
import { INITIAL_ACTION_STATE } from "@/lib/forms";

type TaskCreateFormProps = {
  defaultProjectId: string;
  projects: Pick<Project, "id" | "code" | "name">[];
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
};

const creatableStatusOptions = taskStatusOptions.filter((option) =>
  ["BACKLOG", "IN_PROGRESS", "BLOCKED"].includes(option.value)
);

export function TaskCreateForm({
  defaultProjectId,
  projects,
  users
}: TaskCreateFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    createTaskAction,
    INITIAL_ACTION_STATE
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [persistedMessage, setPersistedMessage] = useState<string | null>(null);
  const feedbackStorageKey = "ops-tracker:task-create-feedback";

  useEffect(() => {
    const storedMessage = window.sessionStorage.getItem(feedbackStorageKey);

    if (storedMessage) {
      setPersistedMessage(storedMessage);
      window.sessionStorage.removeItem(feedbackStorageKey);
    }
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      const nextMessage = state.message ?? "Task created.";
      formRef.current?.reset();
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
          New task
        </p>
        <h2 className="text-2xl font-semibold text-ink">Capture the next handoff</h2>
        <p className="text-sm leading-6 text-ink/70">
          Set the current owner, reviewer, due date, and any blocker context up
          front so the next person knows what to do.
        </p>
      </div>
      <form
        ref={formRef}
        action={formAction}
        className="space-y-4"
        onSubmit={() => {
          setPersistedMessage(null);
          window.sessionStorage.removeItem(feedbackStorageKey);
        }}
      >
        <div className="space-y-2">
          <label htmlFor="task-project" className="text-sm font-medium text-ink">
            Project
          </label>
          <Select
            id="task-project"
            name="projectId"
            defaultValue={defaultProjectId}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} · {project.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="task-title" className="text-sm font-medium text-ink">
            Task title
          </label>
          <Input
            id="task-title"
            name="title"
            placeholder="Confirm inventory scan on site"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="task-description"
            className="text-sm font-medium text-ink"
          >
            Description
          </label>
          <Textarea
            id="task-description"
            name="description"
            placeholder="Describe the current step, the handoff risk, and the expected outcome."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="task-status" className="text-sm font-medium text-ink">
              Starting status
            </label>
            <Select
              id="task-status"
              name="status"
              defaultValue={"BACKLOG" satisfies TaskStatus}
            >
              {creatableStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="task-priority"
              className="text-sm font-medium text-ink"
            >
              Priority
            </label>
            <Select
              id="task-priority"
              name="priority"
              defaultValue={"MEDIUM" satisfies TaskPriority}
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
            <label htmlFor="task-assignee" className="text-sm font-medium text-ink">
              Current owner
            </label>
            <Select id="task-assignee" name="assigneeId" defaultValue="">
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.email}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="task-reviewer" className="text-sm font-medium text-ink">
              Reviewer
            </label>
            <Select id="task-reviewer" name="reviewerId" defaultValue="">
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
            <label htmlFor="task-due-date" className="text-sm font-medium text-ink">
              Due date
            </label>
            <Input id="task-due-date" name="dueDate" type="date" />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="task-blocked-category"
              className="text-sm font-medium text-ink"
            >
              Blocked category
            </label>
            <Select id="task-blocked-category" name="blockedCategory" defaultValue="">
              <option value="">None</option>
              {blockedCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="task-blocked-reason"
            className="text-sm font-medium text-ink"
          >
            Blocked reason
          </label>
          <Textarea
            id="task-blocked-reason"
            name="blockedReason"
            placeholder="Required if the task starts blocked."
            className="min-h-24"
          />
        </div>
        <ActionFeedback state={feedbackState} />
        <SubmitButton label="Create task" pendingLabel="Creating..." />
      </form>
    </Panel>
  );
}

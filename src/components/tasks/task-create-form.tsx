"use client";

import {
  type Project,
  type TaskPriority,
  type TaskStatus,
  type User
} from "@prisma/client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createTaskAction } from "@/app/actions/task-actions";
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

type TaskCreateFormProps = {
  defaultProjectId: string;
  projects: Project[];
  users: Pick<User, "id" | "name" | "email">[];
};

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

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <Panel className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          New task
        </p>
        <h2 className="text-2xl font-semibold text-ink">Capture the next move</h2>
      </div>
      <form ref={formRef} action={formAction} className="space-y-4">
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
            placeholder="Describe the next operational step, handoff risk, and outcome."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="task-status" className="text-sm font-medium text-ink">
              Status
            </label>
            <Select
              id="task-status"
              name="status"
              defaultValue={"BACKLOG" satisfies TaskStatus}
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
              Assignee
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
            <label htmlFor="task-due-date" className="text-sm font-medium text-ink">
              Due date
            </label>
            <Input id="task-due-date" name="dueDate" type="date" />
          </div>
        </div>
        <ActionFeedback state={state} />
        <SubmitButton label="Create task" pendingLabel="Creating..." />
      </form>
    </Panel>
  );
}

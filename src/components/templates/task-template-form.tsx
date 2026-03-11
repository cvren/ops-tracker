"use client";

import { type TaskPriority, type TaskStatus } from "@prisma/client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createTaskTemplateAction,
  updateTaskTemplateAction
} from "@/app/actions/manager-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { taskPriorityOptions } from "@/lib/constants";
import { INITIAL_ACTION_STATE } from "@/lib/forms";

type TaskTemplateFormProps = {
  mode: "create" | "update";
  template?: {
    id: string;
    name: string;
    title: string;
    description: string;
    defaultAssigneeId: string | null;
    defaultReviewerId: string | null;
    defaultDueOffsetDays: number | null;
    defaultPriority: TaskPriority;
    defaultStatus: TaskStatus;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
  }>;
};

export function TaskTemplateForm({
  mode,
  template,
  users
}: TaskTemplateFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    mode === "create" ? createTaskTemplateAction : updateTaskTemplateAction,
    INITIAL_ACTION_STATE
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <Panel className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          {mode === "create" ? "New template" : "Edit template"}
        </p>
        <h2 className="text-2xl font-semibold text-ink">
          {mode === "create" ? "Capture repeatable work" : template?.name}
        </h2>
      </div>
      <form action={formAction} className="space-y-4">
        {template ? (
          <input type="hidden" name="templateId" value={template.id} />
        ) : null}
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor={`${mode}-template-name`} className="text-sm font-medium text-ink">
              Template name
            </label>
            <Input
              id={`${mode}-template-name`}
              name="name"
              defaultValue={template?.name ?? ""}
              placeholder="Weekly review sweep"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor={`${mode}-template-title`} className="text-sm font-medium text-ink">
              Task title
            </label>
            <Input
              id={`${mode}-template-title`}
              name="title"
              defaultValue={template?.title ?? ""}
              placeholder="Run weekly review sweep"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`${mode}-template-description`}
            className="text-sm font-medium text-ink"
          >
            Description
          </label>
          <Textarea
            id={`${mode}-template-description`}
            name="description"
            defaultValue={template?.description ?? ""}
            className="min-h-28"
          />
        </div>
        <div className="grid gap-4 xl:grid-cols-4">
          <div className="space-y-2">
            <label
              htmlFor={`${mode}-template-assignee`}
              className="text-sm font-medium text-ink"
            >
              Default owner
            </label>
            <Select
              id={`${mode}-template-assignee`}
              name="defaultAssigneeId"
              defaultValue={template?.defaultAssigneeId ?? ""}
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
              htmlFor={`${mode}-template-reviewer`}
              className="text-sm font-medium text-ink"
            >
              Default reviewer
            </label>
            <Select
              id={`${mode}-template-reviewer`}
              name="defaultReviewerId"
              defaultValue={template?.defaultReviewerId ?? ""}
            >
              <option value="">No reviewer</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.email}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`${mode}-template-offset`}
              className="text-sm font-medium text-ink"
            >
              Due offset days
            </label>
            <Input
              id={`${mode}-template-offset`}
              name="defaultDueOffsetDays"
              type="number"
              min={0}
              defaultValue={template?.defaultDueOffsetDays ?? ""}
              placeholder="2"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`${mode}-template-priority`}
              className="text-sm font-medium text-ink"
            >
              Default priority
            </label>
            <Select
              id={`${mode}-template-priority`}
              name="defaultPriority"
              defaultValue={template?.defaultPriority ?? "MEDIUM"}
            >
              {taskPriorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`${mode}-template-status`}
            className="text-sm font-medium text-ink"
          >
            Default status
          </label>
          <Select
            id={`${mode}-template-status`}
            name="defaultStatus"
            defaultValue={template?.defaultStatus ?? "BACKLOG"}
          >
            <option value="BACKLOG">Backlog</option>
            <option value="IN_PROGRESS">In progress</option>
          </Select>
        </div>
        <ActionFeedback state={state} />
        <SubmitButton
          label={mode === "create" ? "Create template" : "Save template"}
          pendingLabel={mode === "create" ? "Creating..." : "Saving..."}
          fullWidth={false}
        />
      </form>
    </Panel>
  );
}

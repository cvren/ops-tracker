"use client";

import { type RecurringCadence } from "@prisma/client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createRecurringScheduleAction,
  updateRecurringScheduleAction
} from "@/app/actions/manager-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { recurringCadenceOptions } from "@/lib/constants";
import { INITIAL_ACTION_STATE } from "@/lib/forms";

type RecurringScheduleFormProps = {
  mode: "create" | "update";
  projects: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  schedule?: {
    id: string;
    templateId: string;
    projectId: string;
    cadence: RecurringCadence;
    interval: number;
    nextRunAt: Date;
    isActive: boolean;
  };
  templates: Array<{
    id: string;
    name: string;
    title: string;
  }>;
};

export function RecurringScheduleForm({
  mode,
  projects,
  schedule,
  templates
}: RecurringScheduleFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    mode === "create"
      ? createRecurringScheduleAction
      : updateRecurringScheduleAction,
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
          {mode === "create" ? "New schedule" : "Edit schedule"}
        </p>
        <h2 className="text-2xl font-semibold text-ink">
          {mode === "create" ? "Generate repeat work on demand" : "Recurring settings"}
        </h2>
      </div>
      <form action={formAction} className="space-y-4">
        {schedule ? (
          <input type="hidden" name="scheduleId" value={schedule.id} />
        ) : null}
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor={`${mode}-schedule-template`} className="text-sm font-medium text-ink">
              Template
            </label>
            <Select
              id={`${mode}-schedule-template`}
              name="templateId"
              defaultValue={schedule?.templateId ?? ""}
            >
              <option value="">Choose template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · {template.title}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor={`${mode}-schedule-project`} className="text-sm font-medium text-ink">
              Project
            </label>
            <Select
              id={`${mode}-schedule-project`}
              name="projectId"
              defaultValue={schedule?.projectId ?? ""}
            >
              <option value="">Choose project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} · {project.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-4">
          <div className="space-y-2">
            <label htmlFor={`${mode}-schedule-cadence`} className="text-sm font-medium text-ink">
              Cadence
            </label>
            <Select
              id={`${mode}-schedule-cadence`}
              name="cadence"
              defaultValue={schedule?.cadence ?? "WEEKLY"}
            >
              {recurringCadenceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`${mode}-schedule-interval`}
              className="text-sm font-medium text-ink"
            >
              Interval
            </label>
            <Input
              id={`${mode}-schedule-interval`}
              name="interval"
              type="number"
              min={1}
              max={90}
              defaultValue={schedule?.interval ?? 1}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`${mode}-schedule-next-run`}
              className="text-sm font-medium text-ink"
            >
              Next run date
            </label>
            <Input
              id={`${mode}-schedule-next-run`}
              name="nextRunAt"
              type="date"
              defaultValue={schedule?.nextRunAt.toISOString().slice(0, 10) ?? ""}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink">Status</label>
            <label className="flex min-h-11 items-center gap-3 rounded-[1.25rem] border border-black/10 bg-canvas/70 px-4 py-3 text-sm text-ink">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={schedule?.isActive ?? true}
                className="size-4 rounded border-black/20"
              />
              Active schedule
            </label>
          </div>
        </div>
        <ActionFeedback state={state} />
        <SubmitButton
          label={mode === "create" ? "Create schedule" : "Save schedule"}
          pendingLabel={mode === "create" ? "Creating..." : "Saving..."}
          fullWidth={false}
        />
      </form>
    </Panel>
  );
}

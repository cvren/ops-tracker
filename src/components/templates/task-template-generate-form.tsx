"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createTaskFromTemplateAction } from "@/app/actions/manager-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { Select } from "@/components/ui/select";
import { INITIAL_ACTION_STATE } from "@/lib/forms";

type TaskTemplateGenerateFormProps = {
  projects: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  templateId: string;
};

export function TaskTemplateGenerateForm({
  projects,
  templateId
}: TaskTemplateGenerateFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    createTaskFromTemplateAction,
    INITIAL_ACTION_STATE
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="templateId" value={templateId} />
      <div className="space-y-2">
        <label
          htmlFor={`template-project-${templateId}`}
          className="text-sm font-medium text-ink"
        >
          Generate into project
        </label>
        <Select id={`template-project-${templateId}`} name="projectId" defaultValue="">
          <option value="">Choose project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.code} · {project.name}
            </option>
          ))}
        </Select>
      </div>
      <ActionFeedback state={state} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton
          label="Generate task"
          pendingLabel="Generating..."
          fullWidth={false}
        />
        {state.status === "success" && state.entityId ? (
          <Link
            href={`/tasks/${state.entityId}` as Route}
            className="text-sm font-semibold text-accent hover:text-ink"
          >
            Open task
          </Link>
        ) : null}
      </div>
    </form>
  );
}

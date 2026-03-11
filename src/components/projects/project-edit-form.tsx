"use client";

import { type Project, type ProjectStatus } from "@prisma/client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateProjectAction } from "@/app/actions/project-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { projectStatusOptions } from "@/lib/constants";
import { INITIAL_ACTION_STATE } from "@/lib/forms";

export function ProjectEditForm({ project }: { project: Project }) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    updateProjectAction,
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
          Project detail
        </p>
        <h2 className="text-2xl font-semibold text-ink">Update project</h2>
      </div>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="projectId" value={project.id} />
        <div className="space-y-2">
          <label htmlFor="edit-project-name" className="text-sm font-medium text-ink">
            Project name
          </label>
          <Input
            id="edit-project-name"
            name="name"
            defaultValue={project.name}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="edit-project-code"
              className="text-sm font-medium text-ink"
            >
              Code
            </label>
            <Input
              id="edit-project-code"
              name="code"
              defaultValue={project.code}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="edit-project-status"
              className="text-sm font-medium text-ink"
            >
              Status
            </label>
            <Select
              id="edit-project-status"
              name="status"
              defaultValue={project.status satisfies ProjectStatus}
            >
              {projectStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="edit-project-description"
            className="text-sm font-medium text-ink"
          >
            Brief
          </label>
          <Textarea
            id="edit-project-description"
            name="description"
            defaultValue={project.description}
          />
        </div>
        <ActionFeedback state={state} />
        <SubmitButton label="Save changes" pendingLabel="Saving..." />
      </form>
    </Panel>
  );
}

"use client";

import { type ProjectStatus } from "@prisma/client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createProjectAction } from "@/app/actions/project-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { projectStatusOptions } from "@/lib/constants";
import { INITIAL_ACTION_STATE } from "@/lib/forms";

export function ProjectCreateForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(
    createProjectAction,
    INITIAL_ACTION_STATE
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [persistedMessage, setPersistedMessage] = useState<string | null>(null);
  const feedbackStorageKey = "ops-tracker:project-create-feedback";

  useEffect(() => {
    const storedMessage = window.sessionStorage.getItem(feedbackStorageKey);

    if (storedMessage) {
      setPersistedMessage(storedMessage);
      window.sessionStorage.removeItem(feedbackStorageKey);
    }
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      const nextMessage = state.message ?? "Project created.";
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
          New project
        </p>
        <h2 className="text-2xl font-semibold text-ink">Create a live track</h2>
        <p className="text-sm leading-6 text-ink/70">
          Set up a project with a stable code, short brief, and current delivery
          state.
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
          <label htmlFor="project-name" className="text-sm font-medium text-ink">
            Project name
          </label>
          <Input id="project-name" name="name" placeholder="Warehouse rollout" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="project-code" className="text-sm font-medium text-ink">
              Code
            </label>
            <Input id="project-code" name="code" placeholder="OPS-24" />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="project-status"
              className="text-sm font-medium text-ink"
            >
              Status
            </label>
            <Select
              id="project-status"
              name="status"
              defaultValue={"ACTIVE" satisfies ProjectStatus}
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
            htmlFor="project-description"
            className="text-sm font-medium text-ink"
          >
            Brief
          </label>
          <Textarea
            id="project-description"
            name="description"
            placeholder="What is the team delivering, and what must stay visible this week?"
          />
        </div>
        <ActionFeedback state={feedbackState} />
        <SubmitButton label="Create project" pendingLabel="Creating..." />
      </form>
    </Panel>
  );
}

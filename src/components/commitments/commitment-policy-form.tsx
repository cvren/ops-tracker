"use client";

import {
  type CommitmentPolicyKind,
  type CommitmentScopeType,
  type CommitmentSeverity
} from "@prisma/client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createCommitmentPolicyAction,
  updateCommitmentPolicyAction
} from "@/app/actions/commitment-policy-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import {
  commitmentPolicyKindOptions,
  commitmentScopeTypeOptions,
  commitmentSeverityOptions
} from "@/lib/constants";
import { INITIAL_ACTION_STATE } from "@/lib/forms";

type CommitmentPolicyFormProps = {
  mode: "create" | "update";
  policy?: {
    id: string;
    name: string;
    scopeType: CommitmentScopeType;
    scopeId: string;
    kind: CommitmentPolicyKind;
    thresholdMinutes: number | null;
    thresholdHours: number | null;
    severity: CommitmentSeverity;
    isActive: boolean;
  };
  projects: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  templates: Array<{
    id: string;
    name: string;
    title: string;
  }>;
};

export function CommitmentPolicyForm({
  mode,
  policy,
  projects,
  templates
}: CommitmentPolicyFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    mode === "create"
      ? createCommitmentPolicyAction
      : updateCommitmentPolicyAction,
    INITIAL_ACTION_STATE
  );
  const [scopeType, setScopeType] = useState<CommitmentScopeType>(
    policy?.scopeType ?? "WORKSPACE"
  );
  const [thresholdUnit, setThresholdUnit] = useState<"minutes" | "hours">(
    policy?.thresholdMinutes !== null ? "minutes" : "hours"
  );
  const [kind, setKind] = useState<CommitmentPolicyKind>(
    policy?.kind ?? "OVERDUE"
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  useEffect(() => {
    setScopeType(policy?.scopeType ?? "WORKSPACE");
    setThresholdUnit(policy?.thresholdMinutes !== null ? "minutes" : "hours");
    setKind(policy?.kind ?? "OVERDUE");
  }, [policy]);

  const selectedKind = useMemo(
    () =>
      commitmentPolicyKindOptions.find((option) => option.value === kind) ??
      commitmentPolicyKindOptions[0],
    [kind]
  );

  return (
    <Panel className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          {mode === "create" ? "New policy" : "Edit policy"}
        </p>
        <h2 className="text-2xl font-semibold text-ink">
          {mode === "create" ? "Define a commitment boundary" : policy?.name}
        </h2>
        <p className="text-sm leading-6 text-ink/70">
          Keep the model bounded: choose one fixed kind, one scope, one
          threshold, one severity.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {policy ? <input type="hidden" name="policyId" value={policy.id} /> : null}

        <div className="space-y-2">
          <label
            htmlFor={`${mode}-${policy?.id ?? "new"}-policy-name`}
            className="text-sm font-medium text-ink"
          >
            Policy name
          </label>
          <Input
            id={`${mode}-${policy?.id ?? "new"}-policy-name`}
            name="name"
            defaultValue={policy?.name ?? ""}
            placeholder="Workspace overdue watch"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor={`${mode}-${policy?.id ?? "new"}-policy-kind`}
              className="text-sm font-medium text-ink"
            >
              Commitment kind
            </label>
            <Select
              id={`${mode}-${policy?.id ?? "new"}-policy-kind`}
              name="kind"
              defaultValue={policy?.kind ?? "OVERDUE"}
              onChange={(event) =>
                setKind(event.currentTarget.value as CommitmentPolicyKind)
              }
            >
              {commitmentPolicyKindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <p className="text-xs leading-5 text-ink/60">
              {selectedKind.description}
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`${mode}-${policy?.id ?? "new"}-policy-severity`}
              className="text-sm font-medium text-ink"
            >
              Severity
            </label>
            <Select
              id={`${mode}-${policy?.id ?? "new"}-policy-severity`}
              name="severity"
              defaultValue={policy?.severity ?? "MEDIUM"}
            >
              {commitmentSeverityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.55fr_1.45fr]">
          <div className="space-y-2">
            <label
              htmlFor={`${mode}-${policy?.id ?? "new"}-policy-scope-type`}
              className="text-sm font-medium text-ink"
            >
              Scope type
            </label>
            <Select
              id={`${mode}-${policy?.id ?? "new"}-policy-scope-type`}
              name="scopeType"
              defaultValue={policy?.scopeType ?? "WORKSPACE"}
              onChange={(event) =>
                setScopeType(event.currentTarget.value as CommitmentScopeType)
              }
            >
              {commitmentScopeTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {scopeType === "WORKSPACE" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">Scope binding</label>
              <div className="min-h-11 rounded-3xl border border-black/10 bg-canvas/70 px-4 py-3 text-sm text-ink/70">
                Applies across the current workspace.
              </div>
            </div>
          ) : null}

          {scopeType === "PROJECT" ? (
            <div className="space-y-2">
              <label
                htmlFor={`${mode}-${policy?.id ?? "new"}-policy-project-scope`}
                className="text-sm font-medium text-ink"
              >
                Project scope
              </label>
              <Select
                id={`${mode}-${policy?.id ?? "new"}-policy-project-scope`}
                name="projectScopeId"
                defaultValue={
                  policy?.scopeType === "PROJECT" ? policy.scopeId : ""
                }
              >
                <option value="">Choose project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} · {project.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {scopeType === "TEMPLATE" ? (
            <div className="space-y-2">
              <label
                htmlFor={`${mode}-${policy?.id ?? "new"}-policy-template-scope`}
                className="text-sm font-medium text-ink"
              >
                Template scope
              </label>
              <Select
                id={`${mode}-${policy?.id ?? "new"}-policy-template-scope`}
                name="templateScopeId"
                defaultValue={
                  policy?.scopeType === "TEMPLATE" ? policy.scopeId : ""
                }
              >
                <option value="">Choose template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.title}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.7fr_0.5fr_0.8fr]">
          <div className="space-y-2">
            <label
              htmlFor={`${mode}-${policy?.id ?? "new"}-policy-threshold-value`}
              className="text-sm font-medium text-ink"
            >
              Threshold value
            </label>
            <Input
              id={`${mode}-${policy?.id ?? "new"}-policy-threshold-value`}
              name="thresholdValue"
              type="number"
              min={1}
              max={10080}
              defaultValue={
                policy?.thresholdMinutes ?? policy?.thresholdHours ?? ""
              }
              placeholder="4"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`${mode}-${policy?.id ?? "new"}-policy-threshold-unit`}
              className="text-sm font-medium text-ink"
            >
              Threshold unit
            </label>
            <Select
              id={`${mode}-${policy?.id ?? "new"}-policy-threshold-unit`}
              name="thresholdUnit"
              defaultValue={policy?.thresholdMinutes !== null ? "minutes" : "hours"}
              onChange={(event) =>
                setThresholdUnit(event.currentTarget.value as "minutes" | "hours")
              }
            >
              <option value="hours">Hours</option>
              <option value="minutes">Minutes</option>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink">Status</label>
            <label className="flex min-h-11 items-center gap-3 rounded-[1.25rem] border border-black/10 bg-canvas/70 px-4 py-3 text-sm text-ink">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={policy?.isActive ?? true}
                className="size-4 rounded border-black/20"
              />
              {thresholdUnit === "minutes"
                ? "Active minute-based threshold"
                : "Active hour-based threshold"}
            </label>
          </div>
        </div>

        <ActionFeedback state={state} />
        <SubmitButton
          label={mode === "create" ? "Create policy" : "Save policy"}
          pendingLabel={mode === "create" ? "Creating..." : "Saving..."}
          fullWidth={false}
        />
      </form>
    </Panel>
  );
}

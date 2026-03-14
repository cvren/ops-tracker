import Link from "next/link";
import type { Route } from "next";

import { CommitmentPolicyForm } from "@/components/commitments/commitment-policy-form";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  CommitmentSeverityBadge,
  WorkspaceRoleBadge
} from "@/components/status-badges";
import { Panel } from "@/components/ui/panel";
import {
  commitmentPolicyKindLabels,
  commitmentScopeTypeLabels
} from "@/lib/constants";
import { getCommitmentPolicyConsoleData } from "@/lib/manager-data";
import { canManageManagerConsole } from "@/lib/permissions";
import { getCurrentWorkspaceContext } from "@/lib/workspace";

export default async function CommitmentsPage() {
  const context = await getCurrentWorkspaceContext();
  const canAccessManagerConsole = canManageManagerConsole(
    context.membership.role
  );

  if (!canAccessManagerConsole) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Commitments"
          title="Commitment policies are manager-console only."
          description="Members and viewers can still see task risk metadata, but creating and editing commitment boundaries is limited to workspace admins and managers."
        />
        <Panel className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Manager console only
          </p>
          <h2 className="text-2xl font-semibold text-ink">
            Ask an admin or manager to change what counts as a risk.
          </h2>
          <p className="text-sm text-ink/70">
            The exception ledger and response controls are now live. This page
            still stays bounded to fixed policy management.
          </p>
        </Panel>
      </div>
    );
  }

  const data = await getCommitmentPolicyConsoleData();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Commitments"
        title="Decide what counts as a violation before it becomes work."
        description="The commitment boundary stays fixed: one kind, one scope, one threshold, one severity. The exception ledger is now live, but this page still avoids a generic rule builder."
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white/80 px-5 py-2 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:bg-white"
            >
              Back to dashboard
            </Link>
            <Link
              href={"/exceptions" as Route}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-canvas transition hover:-translate-y-0.5"
            >
              Open exceptions
            </Link>
            <Link
              href="/templates"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2 text-sm font-semibold text-canvas transition hover:-translate-y-0.5"
            >
              Open recurring view
            </Link>
          </div>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <CommitmentPolicyForm
          mode="create"
          projects={data.projects}
          templates={data.templates}
        />
        <Panel className="space-y-4 bg-canvas/75">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Phase boundary
            </p>
            <h2 className="text-2xl font-semibold text-ink">
              Policies are fixed. The ledger is now opening cases from them.
            </h2>
          </div>
          <p className="text-sm leading-6 text-ink/70">
            `CommitmentPolicy` now decides what becomes overdue, stale, blocked,
            unassigned, or recurring-failed risk across workspace, project, and
            template scope.
          </p>
          <p className="text-sm leading-6 text-ink/70">
            `ExceptionCase` now acts as the source-of-truth exception ledger with
            deduped open-case creation, auto-resolve, response actions, and one
            derived email channel. This page still avoids becoming a generic
            rule builder.
          </p>
          <div className="rounded-[1.5rem] border border-black/10 bg-white/70 px-4 py-4 text-sm text-ink/70">
            <p className="font-semibold text-ink">
              Current operator role on this page
            </p>
            <div className="mt-3">
              <WorkspaceRoleBadge role={context.membership.role} />
            </div>
          </div>
        </Panel>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Active policy ledger
          </p>
          <h2 className="text-2xl font-semibold text-ink">
            Fixed kinds only, with current breach counts
          </h2>
        </div>
        {data.policies.length === 0 ? (
          <EmptyState
            title="No commitment policies yet"
            description="Create the first policy above to decide what counts as a violation or risk in this workspace."
          />
        ) : (
          <div className="space-y-4">
            {data.policies.map((policy) => (
              <Panel key={policy.id} className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CommitmentSeverityBadge severity={policy.severity} />
                      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/70 ring-1 ring-black/10">
                        {policy.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                        {commitmentScopeTypeLabels[policy.scopeType]}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold text-ink">
                        {policy.name}
                      </h3>
                    </div>
                    <p className="text-sm text-ink/70">
                      {policy.scopeLabel} · {commitmentPolicyKindLabels[policy.kind]} ·{" "}
                      {policy.thresholdLabel}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-canvas/70 px-4 py-3 text-sm text-ink/70">
                    <p>Current breaches: {policy.breachCount}</p>
                    <p>Severity: {policy.severityLabel}</p>
                    <p>Scope: {policy.scopeLabel}</p>
                  </div>
                </div>

                <details className="rounded-[1.5rem] border border-black/10 bg-canvas/70 px-4 py-4">
                  <summary className="cursor-pointer text-sm font-semibold text-accent">
                    Edit policy
                  </summary>
                  <div className="mt-4">
                    <CommitmentPolicyForm
                      mode="update"
                      policy={policy}
                      projects={data.projects}
                      templates={data.templates}
                    />
                  </div>
                </details>
              </Panel>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

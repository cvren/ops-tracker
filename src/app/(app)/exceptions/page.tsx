import Link from "next/link";
import type { Route } from "next";

import { ExceptionCaseActions } from "@/components/exceptions/exception-case-actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  CommitmentSeverityBadge,
  ExceptionStatusBadge
} from "@/components/status-badges";
import { Panel } from "@/components/ui/panel";
import { commitmentPolicyKindLabels } from "@/lib/constants";
import { getExceptionQueueData } from "@/lib/manager-data";
import { canManageManagerConsole } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { getCurrentWorkspaceContext } from "@/lib/workspace";

export default async function ExceptionsPage() {
  const context = await getCurrentWorkspaceContext();
  const canAccessManagerConsole = canManageManagerConsole(
    context.membership.role
  );

  if (!canAccessManagerConsole) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Exceptions"
          title="The exception ledger is manager-console only."
          description="Members and viewers can still work tasks, but the queue of open exception work objects is limited to workspace admins and managers."
        />
        <Panel className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Manager console only
          </p>
          <h2 className="text-2xl font-semibold text-ink">
            Ask an admin or manager to triage the open exception ledger.
          </h2>
          <p className="text-sm text-ink/70">
            Response and escalation controls now live inside the manager queue.
          </p>
        </Panel>
      </div>
    );
  }

  const data = await getExceptionQueueData();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Exceptions"
        title="Receive the open exception ledger and move it instead of memorizing it."
        description="Phase 3 adds the minimal response loop: acknowledge, snooze, assign, resolve, and track the derived email trail without turning the ledger into a multi-channel notification matrix."
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white/80 px-5 py-2 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:bg-white"
            >
              Back to dashboard
            </Link>
            <Link
              href="/tasks?view=high-risk"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2 text-sm font-semibold text-canvas transition hover:-translate-y-0.5"
            >
              Open high-risk queue
            </Link>
            <Link
              href="/commitments"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white/80 px-5 py-2 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:bg-white"
            >
              Open commitments
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Panel className="space-y-2 bg-canvas/80">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Actionable now
          </p>
          <p className="text-3xl font-semibold text-ink">
            {data.syncSummary.actionableCount}
          </p>
          <p className="text-sm text-ink/65">
            Open or acknowledged exceptions waiting on a next manager action.
          </p>
        </Panel>
        <Panel className="space-y-2 bg-canvas/80">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Snoozed
          </p>
          <p className="text-3xl font-semibold text-ink">
            {data.syncSummary.snoozedCount}
          </p>
          <p className="text-sm text-ink/65">
            Cases intentionally parked until a later follow-up window.
          </p>
        </Panel>
        <Panel className="space-y-2 bg-canvas/80">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Derived emails
          </p>
          <p className="text-3xl font-semibold text-ink">
            {data.syncSummary.deliveredEmailCount}
          </p>
          <p className="text-sm text-ink/65">
            Email deliveries projected from the ledger, not treated as the source of truth.
          </p>
        </Panel>
      </section>

      {data.cases.length === 0 && data.snoozedCases.length === 0 ? (
        <EmptyState
          title="No open exceptions right now"
          description="The ledger is clear for this workspace. When a commitment breach opens again, it will appear here as an owned work object instead of a raw alert."
          ctaHref="/commitments"
          ctaLabel="Review commitment policies"
        />
      ) : null}

      {data.cases.length > 0 ? (
        <section className="space-y-4">
          {data.cases.map((exceptionCase) => (
            <Panel key={exceptionCase.id} className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CommitmentSeverityBadge severity={exceptionCase.severity} />
                    <ExceptionStatusBadge status={exceptionCase.status} />
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/70 ring-1 ring-black/10">
                      {commitmentPolicyKindLabels[exceptionCase.kind]}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                      Source policy · {exceptionCase.policyName}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-ink">
                      {exceptionCase.title}
                    </h2>
                  </div>
                  <p className="max-w-3xl text-sm leading-6 text-ink/70">
                    {exceptionCase.sourceSummary}
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-canvas/70 px-4 py-3 text-sm text-ink/70">
                  <p>Owner: {exceptionCase.ownerName}</p>
                  <p>Opened: {formatDateTime(exceptionCase.openedAt)}</p>
                  <p>Status: {exceptionCase.status}</p>
                  {exceptionCase.acknowledgedAt ? (
                    <p>Acknowledged: {formatDateTime(exceptionCase.acknowledgedAt)}</p>
                  ) : null}
                  {exceptionCase.sourceContextLabel ? (
                    <p>{exceptionCase.sourceContextLabel}</p>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.9fr)]">
                <div className="space-y-4">
                  {exceptionCase.sourceHref && exceptionCase.sourceLabel ? (
                    <Link
                      href={exceptionCase.sourceHref as Route}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-white/80 px-5 py-2 text-sm font-semibold text-accent ring-1 ring-black/10 transition hover:bg-white hover:text-ink"
                    >
                      {exceptionCase.sourceLabel}
                    </Link>
                  ) : null}
                  {exceptionCase.recentEmailDeliveries.length > 0 ? (
                    <div className="space-y-3 rounded-[1.5rem] bg-white/80 p-4 ring-1 ring-black/10">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                        Derived email delivery
                      </p>
                      {exceptionCase.recentEmailDeliveries.map((delivery) => (
                        <div key={delivery.id} className="space-y-1 text-sm text-ink/70">
                          <p className="font-semibold text-ink">{delivery.subject}</p>
                          <p>
                            {delivery.recipientLabel} · {formatDateTime(delivery.deliveredAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] bg-white/70 p-4 text-sm text-ink/60 ring-1 ring-black/10">
                      No outbound email has been derived for this case yet.
                    </div>
                  )}
                </div>
                <ExceptionCaseActions
                  caseId={exceptionCase.id}
                  ownerId={exceptionCase.ownerId}
                  ownerOptions={data.ownerOptions}
                  status={exceptionCase.status}
                />
              </div>
            </Panel>
          ))}
        </section>
      ) : null}

      {data.snoozedCases.length > 0 ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Snoozed cases
            </p>
            <h2 className="text-2xl font-semibold text-ink">
              Parked until the next follow-up window.
            </h2>
          </div>
          {data.snoozedCases.map((exceptionCase) => (
            <Panel key={exceptionCase.id} className="space-y-4 bg-canvas/80">
              <div className="flex flex-wrap items-center gap-2">
                <CommitmentSeverityBadge severity={exceptionCase.severity} />
                <ExceptionStatusBadge status={exceptionCase.status} />
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/70 ring-1 ring-black/10">
                  {commitmentPolicyKindLabels[exceptionCase.kind]}
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-ink">{exceptionCase.title}</h3>
                <p className="text-sm text-ink/70">{exceptionCase.sourceSummary}</p>
                <p className="text-sm text-ink/60">
                  Owner: {exceptionCase.ownerName}
                  {exceptionCase.snoozedUntil
                    ? ` · Snoozed until ${formatDateTime(exceptionCase.snoozedUntil)}`
                    : ""}
                </p>
              </div>
            </Panel>
          ))}
        </section>
      ) : null}
    </div>
  );
}

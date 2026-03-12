import Link from "next/link";
import type { Route } from "next";
import type {
  RecurringExecutionStatus,
  RecurringTriggerSource
} from "@prisma/client";

import { RerunRecurringExecutionButton } from "@/components/templates/rerun-recurring-execution-button";
import { RecurringExecutionStatusBadge } from "@/components/status-badges";
import { recurringTriggerSourceLabels } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

type RecurringExecutionHistoryProps = {
  executions: Array<{
    id: string;
    status: RecurringExecutionStatus;
    scheduledFor: Date;
    startedAt: Date;
    finishedAt: Date | null;
    errorMessage: string | null;
    generatedTaskCount: number;
    triggeredBy: RecurringTriggerSource;
    rerunOfExecutionId: string | null;
    triggeredByUser: {
      id: string;
      name: string;
    } | null;
    generatedTasks: Array<{
      id: string;
      title: string;
    }>;
  }>;
};

function getRowClasses(status: RecurringExecutionStatus) {
  switch (status) {
    case "FAILED":
      return "border-rose-200 bg-rose-50/70";
    case "RUNNING":
      return "border-sky-200 bg-sky-50/70";
    case "SKIPPED":
      return "border-amber-200 bg-amber-50/70";
    default:
      return "border-black/10 bg-canvas/70";
  }
}

export function RecurringExecutionHistory({
  executions
}: RecurringExecutionHistoryProps) {
  if (executions.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/15 bg-white/55 px-4 py-4">
        <p className="text-sm font-semibold text-ink">No execution history yet.</p>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          The next manual run or due scheduled tick can create the first
          recurring execution ledger entry for this schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {executions.map((execution) => (
        <div
          key={execution.id}
          id={`execution-${execution.id}`}
          className={`space-y-4 rounded-[1.5rem] border px-4 py-4 ${getRowClasses(
            execution.status
          )}`}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <RecurringExecutionStatusBadge status={execution.status} />
                {execution.rerunOfExecutionId ? (
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-ink/75 ring-1 ring-black/10">
                    Rerun
                  </span>
                ) : null}
              </div>
              <p className="text-sm font-semibold text-ink">
                Slot: {formatDateTime(execution.scheduledFor)}
              </p>
              <p className="text-sm text-ink/70">
                Triggered by{" "}
                {execution.triggeredByUser?.name ??
                  recurringTriggerSourceLabels[execution.triggeredBy]}
              </p>
            </div>
            <div className="text-sm text-ink/65">
              <p>Started: {formatDateTime(execution.startedAt)}</p>
              <p>Finished: {formatDateTime(execution.finishedAt)}</p>
              <p>
                Generated tasks: {execution.generatedTaskCount}
              </p>
            </div>
          </div>

          {execution.generatedTasks.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Generated tasks
              </p>
              <div className="flex flex-wrap gap-2">
                {execution.generatedTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}` as Route}
                    className="rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-accent ring-1 ring-black/10 transition hover:text-ink"
                  >
                    {task.title}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {execution.errorMessage ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-signal">
                Failure reason
              </p>
              <p className="text-sm leading-6 text-ink/75">
                {execution.errorMessage}
              </p>
            </div>
          ) : null}

          {execution.status === "FAILED" ? (
            <RerunRecurringExecutionButton executionId={execution.id} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

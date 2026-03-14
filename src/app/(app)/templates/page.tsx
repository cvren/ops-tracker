import Link from "next/link";
import type { Route } from "next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { CommitmentRiskSummary } from "@/components/commitments/commitment-risk-summary";
import { RecurringExecutionHistory } from "@/components/templates/recurring-execution-history";
import { ExecuteRecurringButton } from "@/components/templates/execute-recurring-button";
import { RecurringScheduleForm } from "@/components/templates/recurring-schedule-form";
import { TaskTemplateForm } from "@/components/templates/task-template-form";
import { TaskTemplateGenerateForm } from "@/components/templates/task-template-generate-form";
import { Panel } from "@/components/ui/panel";
import {
  recurringCadenceLabels,
  taskPriorityLabels,
  taskStatusLabels
} from "@/lib/constants";
import { getTemplateConsoleData } from "@/lib/manager-data";
import { canManageManagerConsole } from "@/lib/permissions";
import { formatRecurringInterval } from "@/lib/recurring";
import { formatDateTime } from "@/lib/utils";
import { getCurrentWorkspaceContext } from "@/lib/workspace";

function formatDueOffset(days: number | null) {
  if (days === null) {
    return "No due date";
  }

  if (days === 0) {
    return "Due today";
  }

  return `Due +${days} day${days === 1 ? "" : "s"}`;
}

function getGenerateBlockedReason(input: {
  isActive: boolean;
  latestCurrentSlotExecution:
    | {
        status: "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";
      }
    | undefined;
}) {
  if (!input.isActive || !input.latestCurrentSlotExecution) {
    return null;
  }

  switch (input.latestCurrentSlotExecution.status) {
    case "RUNNING":
      return "A running execution already owns this schedule slot.";
    case "FAILED":
      return "Use the failed execution below to rerun this slot.";
    case "SUCCESS":
    case "SKIPPED":
      return "This schedule already answered its current slot.";
    default:
      return null;
  }
}

export default async function TemplatesPage() {
  const context = await getCurrentWorkspaceContext();
  const canAccessManagerConsole = canManageManagerConsole(
    context.membership.role
  );

  if (!canAccessManagerConsole) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Templates"
          title="Template and recurring controls are manager-console only."
          description="Members and viewers keep using task queues and task detail. Repeat-work setup is delegated to admins and managers in v0.4.0 Phase 1."
        />
        <Panel className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Manager console only
          </p>
          <h2 className="text-2xl font-semibold text-ink">
            Repeat-work setup is restricted to workspace admins and managers.
          </h2>
          <p className="text-sm text-ink/70">
            Ask an admin or manager to create or run recurring work. Generated
            tasks still appear in the shared task queues once they are created.
          </p>
        </Panel>
      </div>
    );
  }

  const data = await getTemplateConsoleData();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Templates"
        title="Turn repeat work into one-click generation."
        description="Capture recurring ops work once, then create it from a template or generate the next run on demand without rebuilding the task by hand."
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
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2 text-sm font-semibold text-canvas transition hover:-translate-y-0.5"
            >
              Open exceptions
            </Link>
            <Link
              href="/tasks?view=due-this-week"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-canvas transition hover:-translate-y-0.5"
            >
              Open due-this-week queue
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

      <section className="grid gap-6 xl:grid-cols-2">
        <TaskTemplateForm
          mode="create"
          users={data.users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email
          }))}
        />
        {data.templates.length === 0 ? (
          <EmptyState
            title="Create a template first"
            description="Recurring schedules depend on a reusable task template. Start by capturing one repeatable task shape."
          />
        ) : (
          <RecurringScheduleForm
            mode="create"
            projects={data.projects.map((project) => ({
              id: project.id,
              code: project.code,
              name: project.name
            }))}
            templates={data.templates.map((template) => ({
              id: template.id,
              name: template.name,
              title: template.title
            }))}
          />
        )}
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Task templates
          </p>
          <h2 className="text-2xl font-semibold text-ink">
            Reuse the same task shape without retyping it
          </h2>
        </div>
        {data.templates.length === 0 ? (
          <EmptyState
            title="No templates yet"
            description="Create the first repeat-work template above to start generating tasks and schedules."
          />
        ) : (
          <div className="space-y-4">
            {data.templates.map((template) => (
              <Panel key={template.id} className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                        {template.name}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold text-ink">
                        {template.title}
                      </h3>
                    </div>
                    <p className="max-w-3xl text-sm leading-6 text-ink/70">
                      {template.description}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-canvas/70 px-4 py-3 text-sm text-ink/70">
                    <p>Owner: {template.defaultAssignee?.name ?? "Unassigned"}</p>
                    <p>Reviewer: {template.defaultReviewer?.name ?? "None"}</p>
                    <p>{formatDueOffset(template.defaultDueOffsetDays)}</p>
                    <p>
                      Status: {taskStatusLabels[template.defaultStatus]} · Priority:{" "}
                      {taskPriorityLabels[template.defaultPriority]}
                    </p>
                    <p>
                      Schedules: {template._count.recurringSchedules}
                    </p>
                  </div>
                </div>
                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <Panel className="space-y-4 bg-canvas/75">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                        Generate from template
                      </p>
                      <h4 className="text-xl font-semibold text-ink">
                        Create one task right now
                      </h4>
                    </div>
                    <TaskTemplateGenerateForm
                      templateId={template.id}
                      projects={data.projects.map((project) => ({
                        id: project.id,
                        code: project.code,
                        name: project.name
                      }))}
                    />
                  </Panel>
                  <details className="rounded-[1.5rem] border border-black/10 bg-canvas/70 px-4 py-4">
                    <summary className="cursor-pointer text-sm font-semibold text-accent">
                      Edit template defaults
                    </summary>
                    <div className="mt-4">
                      <TaskTemplateForm
                        mode="update"
                        template={template}
                        users={data.users.map((user) => ({
                          id: user.id,
                          name: user.name,
                          email: user.email
                        }))}
                      />
                    </div>
                  </details>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Recurring schedules
          </p>
          <h2 className="text-2xl font-semibold text-ink">
            Issue the next run only when you decide it is time
          </h2>
        </div>
        {data.schedules.length === 0 ? (
          <EmptyState
            title="No recurring schedules yet"
            description="Create a template first, then attach a recurring schedule so the manager can generate the next run on demand."
          />
        ) : (
          <div className="space-y-4">
            {data.schedules.map((schedule) => {
              const latestCurrentSlotExecution = schedule.executions.find(
                (execution) =>
                  execution.scheduledFor.getTime() === schedule.nextRunAt.getTime()
              );
              const generateBlockedReason = getGenerateBlockedReason({
                isActive: schedule.isActive,
                latestCurrentSlotExecution
              });

              return (
                <Panel key={schedule.id} className="space-y-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                          {schedule.template.name}
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-ink">
                          {schedule.project.code} · {schedule.project.name}
                        </h3>
                      </div>
                      <p className="text-sm text-ink/70">
                        {formatRecurringInterval({
                          cadence: schedule.cadence,
                          interval: schedule.interval
                        })}{" "}
                        · {recurringCadenceLabels[schedule.cadence]}
                      </p>
                    </div>
                    <div className="rounded-[1.5rem] bg-canvas/70 px-4 py-3 text-sm text-ink/70">
                      <p>Next run: {formatDateTime(schedule.nextRunAt)}</p>
                      <p>Last run: {formatDateTime(schedule.lastRunAt)}</p>
                      <p>{schedule.isActive ? "Active" : "Inactive"}</p>
                    </div>
                  </div>
                  <CommitmentRiskSummary risk={schedule.risk} />
                  <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
                    <Panel className="space-y-4 bg-canvas/75">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                          Manual generation
                        </p>
                        <h4 className="text-xl font-semibold text-ink">
                          Run the next schedule slot now
                        </h4>
                      </div>
                      <ExecuteRecurringButton
                        scheduleId={schedule.id}
                        isActive={schedule.isActive}
                        blockedReason={generateBlockedReason}
                      />
                    </Panel>
                    <div className="space-y-4">
                      <Panel className="space-y-4 bg-canvas/75">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                            Execution history
                          </p>
                          <h4 className="text-xl font-semibold text-ink">
                            Inspect what ran, failed, or needs a rerun
                          </h4>
                        </div>
                        <RecurringExecutionHistory executions={schedule.executions} />
                      </Panel>
                      <details className="rounded-[1.5rem] border border-black/10 bg-canvas/70 px-4 py-4">
                        <summary className="cursor-pointer text-sm font-semibold text-accent">
                          Edit recurring settings
                        </summary>
                        <div className="mt-4">
                          <RecurringScheduleForm
                            mode="update"
                            schedule={schedule}
                            projects={data.projects.map((project) => ({
                              id: project.id,
                              code: project.code,
                              name: project.name
                            }))}
                            templates={data.templates.map((template) => ({
                              id: template.id,
                              name: template.name,
                              title: template.title
                            }))}
                          />
                        </div>
                      </details>
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Recent activity
          </p>
          <h2 className="text-2xl font-semibold text-ink">
            Trace template and recurring execution
          </h2>
        </div>
        {data.recentActivity.length === 0 ? (
          <EmptyState
            title="No template activity yet"
            description="Create a template or run a schedule to leave a repeat-work trace here."
          />
        ) : (
          <div className="space-y-3">
            {data.recentActivity.map((event) => (
              <Panel key={event.id} className="space-y-2 bg-canvas/75">
                <p className="text-sm font-semibold text-ink">
                  {event.summary ?? "Recorded repeat-work activity"}
                </p>
                <p className="text-sm text-ink/65">
                  {event.actor?.name ?? "System"} · {formatDateTime(event.createdAt)}
                </p>
                {event.task ? (
                  <Link
                    href={`/tasks/${event.task.id}` as Route}
                    className="text-sm font-semibold text-accent hover:text-ink"
                  >
                    Open task: {event.task.title}
                  </Link>
                ) : event.project ? (
                  <p className="text-sm text-ink/65">
                    {event.project.code} · {event.project.name}
                  </p>
                ) : null}
              </Panel>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

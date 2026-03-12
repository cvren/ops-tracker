import Link from "next/link";
import type { Route } from "next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  ProjectStatusBadge,
  TaskPriorityBadge,
  TaskStatusBadge
} from "@/components/status-badges";
import { Panel } from "@/components/ui/panel";
import {
  managerTaskViewOptions,
  taskViewOptions
} from "@/lib/constants";
import { getDashboardData } from "@/lib/data";
import { getManagerDashboardData } from "@/lib/manager-data";
import { canManageManagerConsole } from "@/lib/permissions";
import { getDueDateBoundary } from "@/lib/task-views";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getCurrentWorkspaceContext } from "@/lib/workspace";

const personalCards = [
  {
    key: "myTasksCount",
    label: "My Tasks",
    href: "/tasks?view=my-tasks",
    hint: "Assigned to you and still open."
  },
  {
    key: "needsReviewCount",
    label: "Needs Review",
    href: "/tasks?view=needs-review",
    hint: "Waiting on your review decision."
  },
  {
    key: "overdueCount",
    label: "Overdue",
    href: "/tasks?view=overdue",
    hint: "Past due and not done."
  },
  {
    key: "unassignedCount",
    label: "Unassigned",
    href: "/tasks?view=unassigned",
    hint: "Open work with no current owner."
  }
] as const;

const managerCards = [
  {
    key: "overdueCount",
    label: "Overdue",
    href: "/tasks?view=overdue",
    hint: "Past due and still open."
  },
  {
    key: "reviewQueueCount",
    label: "Review Queue",
    href: "/tasks?view=review-queue",
    hint: "Waiting on reviewer action."
  },
  {
    key: "unassignedCount",
    label: "Unassigned",
    href: "/tasks?view=unassigned",
    hint: "No owner on the task."
  },
  {
    key: "blockedCount",
    label: "Blocked",
    href: "/tasks?view=blocked-aging",
    hint: "Need unblock decisions."
  },
  {
    key: "dueTodayCount",
    label: "Due Today",
    href: "/tasks?view=due-this-week",
    hint: "Close these before the day rolls."
  },
  {
    key: "dueNextSevenDaysCount",
    label: "Due Next 7 Days",
    href: "/tasks?view=due-this-week",
    hint: "Upcoming commitments at risk."
  }
] as const;

const portfolioCards = [
  {
    key: "projectCount",
    label: "Projects",
    hint: "Visible in the workspace"
  },
  {
    key: "activeProjectCount",
    label: "Active projects",
    hint: "Currently moving"
  },
  {
    key: "blockedTaskCount",
    label: "Blocked tasks",
    hint: "Need unblock decisions"
  },
  {
    key: "dueSoonCount",
    label: "Due in 7 days",
    hint: "Upcoming commitments"
  }
] as const;

const bottleneckSections = [
  {
    key: "oldestOverdue" as const,
    label: "Oldest overdue",
    href: "/tasks?view=overdue"
  },
  {
    key: "staleReviewQueue" as const,
    label: "Stale review queue",
    href: "/tasks?view=review-queue"
  },
  {
    key: "oldestBlocked" as const,
    label: "Oldest blocked",
    href: "/tasks?view=blocked-aging"
  },
  {
    key: "oldestUnassigned" as const,
    label: "Oldest unassigned",
    href: "/tasks?view=unassigned"
  }
] as const;

export default async function DashboardPage() {
  const context = await getCurrentWorkspaceContext();
  const canAccessManagerConsole = canManageManagerConsole(
    context.membership.role
  );
  const [dashboardData, managerData] = await Promise.all([
    getDashboardData(),
    canAccessManagerConsole
      ? getManagerDashboardData()
      : Promise.resolve(null)
  ]);
  const overdueBoundary = getDueDateBoundary();

  if (canAccessManagerConsole && managerData) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Manager Console"
          title="Spot the risk, then clear it before the morning slips."
          description="Scan overdue, blocked, stale review, due-soon, and workload skew from one place. Every card drills into the next queue a manager should inspect."
          action={
            <div className="flex flex-wrap gap-3">
              <Link
                href="/tasks?view=high-risk"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2 text-sm font-semibold text-canvas transition hover:-translate-y-0.5"
              >
                Open high-risk queue
              </Link>
              <Link
                href="/templates"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-canvas transition hover:-translate-y-0.5"
              >
                Open templates
              </Link>
              <Link
                href="/tasks?view=workload"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-white/80 px-5 py-2 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:bg-white"
              >
                Open workload view
              </Link>
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {managerCards.map((card, index) => (
            <Link key={card.key} href={card.href as Route} className="block">
              <Panel
                className="animate-fade-up space-y-3 transition hover:-translate-y-0.5 hover:bg-white/85"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                  {card.label}
                </p>
                <p className="text-5xl font-semibold text-ink">
                  {managerData[card.key]}
                </p>
                <p className="text-sm leading-6 text-ink/65">{card.hint}</p>
              </Panel>
            </Link>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {managerData.agingBuckets.map((bucket) => (
            <Panel key={bucket.key} className="space-y-2 bg-canvas/80">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Aging bucket
              </p>
              <p className="text-3xl font-semibold text-ink">{bucket.count}</p>
              <p className="text-sm text-ink/65">{bucket.label}</p>
            </Panel>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          {bottleneckSections.map((section) => (
            <Panel key={section.key} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                    Bottleneck
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">
                    {section.label}
                  </h2>
                </div>
                <Link
                  href={section.href as Route}
                  className="text-sm font-semibold text-accent hover:text-ink"
                >
                  Drill down
                </Link>
              </div>
              {managerData[section.key].length === 0 ? (
                <p className="text-sm text-ink/65">No tasks in this queue.</p>
              ) : (
                <div className="space-y-3">
                  {managerData[section.key].map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}` as Route}
                      className="block rounded-[1.5rem] border border-black/10 bg-canvas/70 px-4 py-4 transition hover:bg-white"
                    >
                      <div className="flex flex-wrap gap-2">
                        <TaskStatusBadge status={task.status} />
                        <TaskPriorityBadge priority={task.priority} />
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-ink">
                        {task.title}
                      </h3>
                      <p className="mt-1 text-sm text-ink/65">
                        {task.project.code} · {task.project.name}
                      </p>
                      <p className="mt-3 text-sm text-ink/70">
                        Owner: {task.assignee?.name ?? "Unassigned"} · Reviewer:{" "}
                        {task.reviewer?.name ?? "None"} · Due:{" "}
                        {formatDate(task.dueDate)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                  Workload by member
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">
                  See where ownership is concentrating
                </h2>
              </div>
              <Link
                href="/tasks?view=workload"
                className="text-sm font-semibold text-accent hover:text-ink"
              >
                Full workload view
              </Link>
            </div>
            {managerData.workload.length === 0 ? (
              <p className="text-sm text-ink/65">
                No open ownership or review load right now.
              </p>
            ) : (
              <div className="space-y-3">
                {managerData.workload.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-[1.5rem] border border-black/10 bg-canvas/70 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-ink">
                          {member.name}
                        </p>
                        <p className="text-sm text-ink/65">
                          Open: {member.openCount} · Review queue:{" "}
                          {member.reviewQueueCount} · Overdue: {member.overdueCount}
                          {" · "}Blocked: {member.blockedCount}
                        </p>
                      </div>
                      <Link
                        href={`/tasks?assigneeId=${member.id}` as Route}
                        className="text-sm font-semibold text-accent hover:text-ink"
                      >
                        View tasks
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <div className="space-y-6">
            <Panel className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                    High-risk queue
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">
                    Triage the tasks most likely to slip
                  </h2>
                </div>
                <Link
                  href="/tasks?view=high-risk"
                  className="text-sm font-semibold text-accent hover:text-ink"
                >
                  Open queue
                </Link>
              </div>
              {managerData.highRiskQueue.length === 0 ? (
                <p className="text-sm text-ink/65">
                  No tasks are currently flagged as high risk.
                </p>
              ) : (
                <div className="space-y-3">
                  {managerData.highRiskQueue.map((task) => {
                    const isOverdue =
                      task.dueDate !== null &&
                      task.status !== "DONE" &&
                      task.dueDate < overdueBoundary;

                    return (
                      <Link
                        key={task.id}
                        href={`/tasks/${task.id}` as Route}
                        className="block rounded-[1.5rem] border border-black/10 bg-canvas/70 px-4 py-4 transition hover:bg-white"
                      >
                        <div className="flex flex-wrap gap-2">
                          <TaskStatusBadge status={task.status} />
                          <TaskPriorityBadge priority={task.priority} />
                          {isOverdue ? (
                            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-900">
                              Overdue
                            </span>
                          ) : null}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-ink">
                          {task.title}
                        </h3>
                        <p className="mt-1 text-sm text-ink/65">
                          {task.project.code} · {task.project.name}
                        </p>
                        <p className="mt-3 text-sm text-ink/70">
                          Owner: {task.assignee?.name ?? "Unassigned"} · Due:{" "}
                          {formatDate(task.dueDate)}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                  Manager views
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">
                  Morning patrol route
                </h2>
              </div>
              <div className="space-y-3">
                {managerTaskViewOptions.map((view) => (
                  <Link
                    key={view.value}
                    href={`/tasks?view=${view.value}` as Route}
                    className="block rounded-[1.5rem] border border-black/10 bg-canvas/70 px-4 py-4 transition hover:bg-white"
                  >
                    <p className="font-semibold text-ink">{view.label}</p>
                    <p className="mt-1 text-sm text-ink/65">{view.description}</p>
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {portfolioCards.map((card) => (
            <Panel key={card.key} className="space-y-2 bg-canvas/80">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                {card.label}
              </p>
              <p className="text-3xl font-semibold text-ink">
                {dashboardData[card.key]}
              </p>
              <p className="text-sm text-ink/65">{card.hint}</p>
            </Panel>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Panel className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Recent activity
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                Latest team trace
              </h2>
            </div>
            {dashboardData.recentActivity.length === 0 ? (
              <p className="text-sm text-ink/65">
                Activity appears here as tasks, reviews, comments, and members
                change.
              </p>
            ) : (
              <div className="space-y-3">
                {dashboardData.recentActivity.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-[1.5rem] border border-black/10 bg-canvas/70 px-4 py-4"
                  >
                    <p className="text-sm font-semibold text-ink">
                      {event.actor?.name ?? "System"}
                    </p>
                    <p className="mt-1 text-sm text-ink/70">
                      {event.summary ?? "Updated the workspace"}
                    </p>
                    <p className="mt-2 text-xs text-ink/55">
                      {formatDateTime(event.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Recent projects
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                Portfolio movement
              </h2>
            </div>
            {dashboardData.recentProjects.length === 0 ? (
              <p className="text-sm text-ink/65">
                Projects appear here as the workspace grows.
              </p>
            ) : (
              <div className="space-y-3">
                {dashboardData.recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}` as Route}
                    className="block rounded-[1.5rem] border border-black/10 bg-canvas/70 px-4 py-4 transition hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-ink">
                          {project.name}
                        </p>
                        <p className="text-sm text-ink/65">{project.code}</p>
                      </div>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                    <p className="mt-3 text-sm text-ink/70">
                      {project._count.tasks} linked task
                      {project._count.tasks === 1 ? "" : "s"}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title="See what needs attention before the handoff slips."
        description="Start with your saved views, then scan the latest activity so overdue, blocked, review-bound, and unassigned work does not drift into memory."
        action={
          <Link
            href="/inbox"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2 text-sm font-semibold text-canvas transition hover:-translate-y-0.5"
          >
            Open inbox
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {personalCards.map((card, index) => (
          <Link key={card.key} href={card.href as Route} className="block">
            <Panel
              className="animate-fade-up space-y-3 transition hover:-translate-y-0.5 hover:bg-white/85"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                {card.label}
              </p>
              <p className="text-5xl font-semibold text-ink">
                {dashboardData[card.key]}
              </p>
              <p className="text-sm leading-6 text-ink/65">{card.hint}</p>
            </Panel>
          </Link>
        ))}
      </section>

      <Panel className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Saved views
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            Jump into today&apos;s queues
          </h2>
        </div>
        <div className="space-y-3">
          {taskViewOptions.map((view) => (
            <Link
              key={view.value}
              href={`/tasks?view=${view.value}` as Route}
              className="block rounded-[1.5rem] border border-black/10 bg-canvas/70 px-4 py-4 transition hover:bg-white"
            >
              <p className="font-semibold text-ink">{view.label}</p>
              <p className="mt-1 text-sm text-ink/65">{view.description}</p>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Risk queue
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            Tasks that need intervention
          </h2>
        </div>
        {dashboardData.focusTasks.length === 0 ? (
          <EmptyState
            title="No urgent tasks"
            description="The workspace has no overdue, blocked, needs-review, or unassigned tasks right now."
          />
        ) : (
          <div className="space-y-3">
            {dashboardData.focusTasks.map((task) => {
              const isOverdue =
                task.dueDate !== null &&
                task.status !== "DONE" &&
                task.dueDate < overdueBoundary;

              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}` as Route}
                  className="block rounded-[1.75rem] border border-black/10 bg-canvas/65 p-4 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <TaskStatusBadge status={task.status} />
                        <TaskPriorityBadge priority={task.priority} />
                        {isOverdue ? (
                          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-900">
                            Overdue
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-ink">
                          {task.title}
                        </h3>
                        <p className="mt-1 text-sm text-ink/70">
                          {task.project.code} · {task.project.name}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-ink/65">
                      <p>Owner: {task.assignee?.name ?? "Unassigned"}</p>
                      <p>Reviewer: {task.reviewer?.name ?? "None"}</p>
                      <p>Due: {formatDate(task.dueDate)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

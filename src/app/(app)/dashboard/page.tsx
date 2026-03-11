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
import { taskViewOptions } from "@/lib/constants";
import { getDashboardData } from "@/lib/data";
import { getDueDateBoundary } from "@/lib/task-views";
import { formatDate, formatDateTime } from "@/lib/utils";

const riskCards = [
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

export default async function DashboardPage() {
  const data = await getDashboardData();
  const overdueBoundary = getDueDateBoundary();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title="See what needs attention before the handoff slips."
        description="Start with your saved views, then scan the risk queue and recent activity to catch overdue, blocked, review-bound, and comment-heavy work."
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
        {riskCards.map((card, index) => (
          <Link key={card.key} href={card.href as Route} className="block">
            <Panel
              className="animate-fade-up space-y-3 transition hover:-translate-y-0.5 hover:bg-white/85"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                {card.label}
              </p>
              <p className="text-5xl font-semibold text-ink">
                {data[card.key]}
              </p>
              <p className="text-sm leading-6 text-ink/65">{card.hint}</p>
            </Panel>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {portfolioCards.map((card) => (
          <Panel key={card.key} className="space-y-2 bg-canvas/80">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              {card.label}
            </p>
            <p className="text-3xl font-semibold text-ink">{data[card.key]}</p>
            <p className="text-sm text-ink/65">{card.hint}</p>
          </Panel>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Risk queue
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                Tasks that need intervention
              </h2>
            </div>
            <Link
              href="/tasks"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:bg-white"
            >
              Open task list
            </Link>
          </div>
          {data.focusTasks.length === 0 ? (
            <EmptyState
              title="No urgent tasks"
              description="The workspace has no overdue, blocked, needs-review, or unassigned tasks right now."
            />
          ) : (
            <div className="space-y-3">
              {data.focusTasks.map((task) => {
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
                          {!task.assigneeId && task.status !== "DONE" ? (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                              Unassigned
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

        <div className="space-y-6">
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
                Recent activity
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                Latest team trace
              </h2>
            </div>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-ink/65">
                Activity appears here as tasks, reviews, comments, and members
                change.
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentActivity.map((event) => (
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

        </div>
      </section>

      <Panel className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Recent projects
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              Delivery tracks in motion
            </h2>
          </div>
          <Link
            href="/projects"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:bg-white"
          >
            Manage projects
          </Link>
        </div>
        {data.recentProjects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create a project to start tracking task handoff and review."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}` as Route}
                className="block"
              >
                <Panel className="space-y-4 transition hover:-translate-y-0.5 hover:bg-white/85">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <ProjectStatusBadge status={project.status} />
                      <h3 className="text-xl font-semibold text-ink">
                        {project.name}
                      </h3>
                      <p className="text-sm text-ink/65">{project.code}</p>
                    </div>
                    <div className="text-right text-sm text-ink/65">
                      <p>{project._count.tasks} tasks</p>
                      <p>Updated {formatDateTime(project.updatedAt)}</p>
                    </div>
                  </div>
                </Panel>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

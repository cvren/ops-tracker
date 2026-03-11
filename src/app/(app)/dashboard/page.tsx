import Link from "next/link";
import type { Route } from "next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProjectStatusBadge, TaskPriorityBadge, TaskStatusBadge } from "@/components/status-badges";
import { Panel } from "@/components/ui/panel";
import { getDashboardData } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/utils";

const metrics = [
  {
    key: "projectCount",
    label: "Projects in view",
    hint: "Total projects in the workspace"
  },
  {
    key: "activeProjectCount",
    label: "Active projects",
    hint: "Projects currently in motion"
  },
  {
    key: "blockedTaskCount",
    label: "Blocked tasks",
    hint: "Work items stalled right now"
  },
  {
    key: "dueSoonCount",
    label: "Due in 7 days",
    hint: "Upcoming deliverables"
  }
] as const;

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Stay on top of active work."
        description="Monitor project load, spot blocked tasks, and jump into the most recently changed records."
        action={
          <Link
            href="/projects"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2 text-sm font-semibold text-canvas transition hover:-translate-y-0.5"
          >
            Open projects
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <Panel
            key={metric.key}
            className="animate-fade-up space-y-3"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              {metric.label}
            </p>
            <p className="text-5xl font-semibold text-ink">
              {data[metric.key]}
            </p>
            <p className="text-sm leading-6 text-ink/65">{metric.hint}</p>
          </Panel>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Recent tasks
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                Latest work items
              </h2>
            </div>
            <Link
              href="/tasks"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:bg-white"
            >
              View all tasks
            </Link>
          </div>
          {data.recentTasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              description="Seed data or create the first task from a project detail page."
              ctaHref="/projects"
              ctaLabel="Go to projects"
            />
          ) : (
            <div className="space-y-3">
              {data.recentTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}` as Route}
                  className="block rounded-[1.75rem] border border-black/10 bg-canvas/65 p-4 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <TaskStatusBadge status={task.status} />
                        <TaskPriorityBadge priority={task.priority} />
                      </div>
                      <h3 className="text-lg font-semibold text-ink">
                        {task.title}
                      </h3>
                      <p className="text-sm text-ink/70">
                        {task.project.code} · {task.project.name}
                      </p>
                    </div>
                    <div className="text-sm text-ink/65">
                      <p>{task.assignee?.name ?? "Unassigned"}</p>
                      <p>Updated {formatDateTime(task.updatedAt)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Recent projects
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                Delivery tracks
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
              description="Create the first project to start tracking delivery work."
            />
          ) : (
            <div className="space-y-3">
              {data.recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}` as Route}
                  className="block rounded-[1.75rem] border border-black/10 bg-canvas/65 p-4 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <ProjectStatusBadge status={project.status} />
                      <h3 className="text-lg font-semibold text-ink">
                        {project.name}
                      </h3>
                      <p className="text-sm text-ink/70">{project.code}</p>
                    </div>
                    <div className="text-right text-sm text-ink/65">
                      <p>{project._count.tasks} tasks</p>
                      <p>Updated {formatDate(project.updatedAt)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}

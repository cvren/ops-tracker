import Link from "next/link";
import type { Route } from "next";
import { TaskPriority, TaskStatus } from "@prisma/client";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  TaskPriorityBadge,
  TaskStatusBadge
} from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import {
  taskPriorityOptions,
  taskStatusOptions
} from "@/lib/constants";
import { listProjects, listTasks } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/utils";

type TasksPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = (await searchParams) ?? {};
  const query = typeof params.q === "string" ? params.q : "";
  const rawStatus = typeof params.status === "string" ? params.status : "";
  const rawPriority =
    typeof params.priority === "string" ? params.priority : "";
  const rawProjectId =
    typeof params.projectId === "string" ? params.projectId : "";

  const status = Object.values(TaskStatus).includes(rawStatus as TaskStatus)
    ? (rawStatus as TaskStatus)
    : undefined;
  const priority = Object.values(TaskPriority).includes(
    rawPriority as TaskPriority
  )
    ? (rawPriority as TaskPriority)
    : undefined;

  const [tasks, projects] = await Promise.all([
    listTasks({
      query,
      status,
      priority,
      projectId: rawProjectId || undefined
    }),
    listProjects()
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tasks"
        title="Search and move work without losing context."
        description="Use the global task list to confirm assignments, due dates, and delivery status across every active project."
      />

      <Panel className="space-y-4">
        <form className="grid gap-4 xl:grid-cols-[1.2fr_190px_190px_240px_auto]">
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search task title, description, or project"
          />
          <Select name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {taskStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select name="priority" defaultValue={priority ?? ""}>
            <option value="">All priorities</option>
            {taskPriorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select name="projectId" defaultValue={rawProjectId}>
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} · {project.name}
              </option>
            ))}
          </Select>
          <Button type="submit" fullWidth={false}>
            Apply filters
          </Button>
        </form>
      </Panel>

      {tasks.length === 0 ? (
        <EmptyState
          title="No matching tasks"
          description="Try a broader search or create a new task from a project detail page."
          ctaHref="/projects"
          ctaLabel="Go to projects"
        />
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}` as Route}
              className="block"
            >
              <Panel className="animate-fade-up transition hover:-translate-y-0.5 hover:bg-white/85">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <TaskStatusBadge status={task.status} />
                      <TaskPriorityBadge priority={task.priority} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-ink">
                        {task.title}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-ink/60">
                        {task.project.code} · {task.project.name}
                      </p>
                    </div>
                    <p className="max-w-3xl text-sm leading-6 text-ink/70">
                      {task.description}
                    </p>
                  </div>
                  <div className="space-y-2 rounded-[1.5rem] bg-canvas/70 px-4 py-3 text-sm text-ink/70">
                    <p>Assignee: {task.assignee?.name ?? "Unassigned"}</p>
                    <p>Due: {formatDate(task.dueDate)}</p>
                    <p>Updated: {formatDateTime(task.updatedAt)}</p>
                  </div>
                </div>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

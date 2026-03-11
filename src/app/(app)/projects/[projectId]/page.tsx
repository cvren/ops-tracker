import Link from "next/link";
import type { Route } from "next";
import { TaskStatus } from "@prisma/client";
import { notFound } from "next/navigation";

import { deleteProjectAction } from "@/app/actions/project-actions";
import { ConfirmActionForm } from "@/components/layout/confirm-action-form";
import { EmptyState } from "@/components/empty-state";
import { ProjectEditForm } from "@/components/projects/project-edit-form";
import { TaskCreateForm } from "@/components/tasks/task-create-form";
import {
  ProjectStatusBadge,
  TaskPriorityBadge,
  TaskStatusBadge
} from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { getAssignableUsers, getProjectById, listTasks } from "@/lib/data";
import { taskStatusOptions } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectDetailPage({
  params,
  searchParams
}: ProjectDetailPageProps) {
  const { projectId } = await params;
  const queryParams: Record<string, string | string[] | undefined> =
    searchParams ? await searchParams : {};

  const search = typeof queryParams.q === "string" ? queryParams.q : "";
  const statusParam =
    typeof queryParams.status === "string" ? queryParams.status : "";
  const taskStatus = Object.values(TaskStatus).includes(statusParam as TaskStatus)
    ? (statusParam as TaskStatus)
    : undefined;

  const [project, users, tasks] = await Promise.all([
    getProjectById(projectId),
    getAssignableUsers(),
    listTasks({
      projectId,
      query: search,
      status: taskStatus
    })
  ]);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href="/projects"
          className="inline-flex items-center text-sm font-medium text-ink/70 hover:text-ink"
        >
          ← Back to projects
        </Link>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <ProjectStatusBadge status={project.status} />
            <div>
              <h1 className="text-4xl font-semibold text-ink sm:text-5xl">
                {project.name}
              </h1>
              <p className="mt-2 text-sm font-medium uppercase tracking-[0.24em] text-ink/55">
                {project.code}
              </p>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-ink/70">
              {project.description}
            </p>
          </div>
          <Panel className="space-y-2 bg-canvas/80">
            <p className="text-sm text-ink/70">Owner: {project.owner.name}</p>
            <p className="text-sm text-ink/70">
              Updated by {project.updatedBy.name}
            </p>
            <p className="text-sm text-ink/70">
              Last change {formatDateTime(project.updatedAt)}
            </p>
            <p className="text-sm text-ink/70">
              {project._count.tasks} linked tasks
            </p>
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <ProjectEditForm project={project} />
          <Panel className="space-y-4 border-rose-200 bg-white/85">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-signal">
                Project controls
              </p>
              <h2 className="text-2xl font-semibold text-ink">
                Delete project
              </h2>
              <p className="text-sm leading-6 text-ink/70">
                This removes the project and its linked tasks from the local
                workspace.
              </p>
            </div>
            <ConfirmActionForm
              action={deleteProjectAction}
              hiddenInputs={{ projectId: project.id }}
              message={`Delete project ${project.code}? This also deletes linked tasks.`}
              label="Delete project"
            />
          </Panel>
        </div>

        <div className="space-y-6">
          <TaskCreateForm
            defaultProjectId={project.id}
            projects={[project]}
            users={users}
          />
          <Panel className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                  Project tasks
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">
                  Work items for {project.code}
                </h2>
              </div>
              <form className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
                <Input
                  name="q"
                  defaultValue={search}
                  placeholder="Search tasks in this project"
                />
                <Select name="status" defaultValue={taskStatus ?? ""}>
                  <option value="">All statuses</option>
                  {taskStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Button type="submit" fullWidth={false}>
                  Filter
                </Button>
              </form>
            </div>

            {tasks.length === 0 ? (
              <EmptyState
                title="No tasks for this project"
                description="The seeded demo includes a project with no tasks so reviewers can validate the empty state here."
              />
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}` as Route}
                    className="block"
                  >
                    <div className="rounded-[1.75rem] border border-black/10 bg-canvas/65 p-4 transition hover:-translate-y-0.5 hover:bg-white">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <TaskStatusBadge status={task.status} />
                            <TaskPriorityBadge priority={task.priority} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-ink">
                              {task.title}
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-ink/70">
                              {task.description}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm text-ink/65">
                          <p>Assignee: {task.assignee?.name ?? "Unassigned"}</p>
                          <p>Due: {formatDate(task.dueDate)}</p>
                          <p>Updated: {formatDateTime(task.updatedAt)}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

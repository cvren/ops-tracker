import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { deleteTaskAction } from "@/app/actions/task-actions";
import { ConfirmActionForm } from "@/components/layout/confirm-action-form";
import { TaskEditForm } from "@/components/tasks/task-edit-form";
import { TaskStatusButtons } from "@/components/tasks/task-status-buttons";
import {
  TaskPriorityBadge,
  TaskStatusBadge
} from "@/components/status-badges";
import { Panel } from "@/components/ui/panel";
import { getAssignableUsers, getTaskById, listProjects } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/utils";

type TaskDetailPageProps = {
  params: Promise<{ taskId: string }>;
};

export default async function TaskDetailPage({
  params
}: TaskDetailPageProps) {
  const { taskId } = await params;
  const [task, users, projects] = await Promise.all([
    getTaskById(taskId),
    getAssignableUsers(),
    listProjects()
  ]);

  if (!task) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href={`/projects/${task.project.id}` as Route}
          className="inline-flex items-center text-sm font-medium text-ink/70 hover:text-ink"
        >
          ← Back to {task.project.code}
        </Link>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <TaskStatusBadge status={task.status} />
              <TaskPriorityBadge priority={task.priority} />
            </div>
            <div>
              <h1 className="text-4xl font-semibold text-ink sm:text-5xl">
                {task.title}
              </h1>
              <p className="mt-2 text-sm text-ink/65">
                {task.project.code} · {task.project.name}
              </p>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-ink/70">
              {task.description}
            </p>
          </div>
          <Panel className="space-y-2 bg-canvas/80">
            <p className="text-sm text-ink/70">
              Assignee: {task.assignee?.name ?? "Unassigned"}
            </p>
            <p className="text-sm text-ink/70">Due: {formatDate(task.dueDate)}</p>
            <p className="text-sm text-ink/70">
              Created: {formatDateTime(task.createdAt)}
            </p>
            <p className="text-sm text-ink/70">
              Updated: {formatDateTime(task.updatedAt)}
            </p>
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <TaskEditForm
          task={task}
          users={users}
          projects={projects.map((project) => ({
            id: project.id,
            code: project.code,
            name: project.name
          }))}
        />
        <div className="space-y-6">
          <Panel className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                Status transition
              </p>
              <h2 className="text-2xl font-semibold text-ink">
                Move the task through the workflow
              </h2>
              <p className="text-sm leading-6 text-ink/70">
                This control uses a protected route handler and updates the
                database directly before refreshing the UI.
              </p>
            </div>
            <TaskStatusButtons taskId={task.id} currentStatus={task.status} />
          </Panel>
          <Panel className="space-y-4 border-rose-200 bg-white/85">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-signal">
                Task controls
              </p>
              <h2 className="text-2xl font-semibold text-ink">Delete task</h2>
              <p className="text-sm leading-6 text-ink/70">
                Remove this task if it was created in error or is no longer
                needed.
              </p>
            </div>
            <ConfirmActionForm
              action={deleteTaskAction}
              hiddenInputs={{
                taskId: task.id,
                projectId: task.project.id
              }}
              message={`Delete task "${task.title}"?`}
              label="Delete task"
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

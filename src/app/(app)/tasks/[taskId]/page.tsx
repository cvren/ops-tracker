import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { deleteTaskAction } from "@/app/actions/task-actions";
import { ConfirmActionForm } from "@/components/layout/confirm-action-form";
import { TaskCommentForm } from "@/components/tasks/task-comment-form";
import { TaskEditForm } from "@/components/tasks/task-edit-form";
import { TaskStatusButtons } from "@/components/tasks/task-status-buttons";
import {
  TaskPriorityBadge,
  TaskStatusBadge
} from "@/components/status-badges";
import { Panel } from "@/components/ui/panel";
import {
  activityEventLabels,
  blockedCategoryLabels,
  taskStatusLabels
} from "@/lib/constants";
import { getAssignableUsers, getTaskById, listProjects } from "@/lib/data";
import { getAvailableTaskTransitions } from "@/lib/task-workflow";
import { getDueDateBoundary } from "@/lib/task-views";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getCurrentWorkspaceContext } from "@/lib/workspace";

type TaskDetailPageProps = {
  params: Promise<{ taskId: string }>;
};

export default async function TaskDetailPage({
  params
}: TaskDetailPageProps) {
  const { taskId } = await params;
  const [{ membership, user }, task, users, projects] = await Promise.all([
    getCurrentWorkspaceContext(),
    getTaskById(taskId),
    getAssignableUsers(),
    listProjects()
  ]);

  if (!task) {
    notFound();
  }

  const transitions = getAvailableTaskTransitions({
    membership: {
      role: membership.role,
      userId: user.id
    },
    task
  });

  const overdueBoundary = getDueDateBoundary();
  const isOverdue =
    task.dueDate !== null &&
    task.status !== "DONE" &&
    task.dueDate < overdueBoundary;

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
          <Panel className="space-y-3 bg-canvas/80">
            <p className="text-sm text-ink/70">
              Current owner: {task.assignee?.name ?? "Unassigned"}
            </p>
            <p className="text-sm text-ink/70">
              Reviewer: {task.reviewer?.name ?? "None"}
            </p>
            <p className="text-sm text-ink/70">Due: {formatDate(task.dueDate)}</p>
            <p className="text-sm text-ink/70">
              Created by {task.createdBy.name}
            </p>
            <p className="text-sm text-ink/70">
              Last changed by {task.updatedBy.name}
            </p>
          </Panel>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Status
          </p>
          <p className="text-2xl font-semibold text-ink">
            {taskStatusLabels[task.status]}
          </p>
          <p className="text-sm text-ink/65">
            Started {formatDateTime(task.startedAt)}
          </p>
        </Panel>
        <Panel className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Review request
          </p>
          <p className="text-sm text-ink/70">
            Requested by {task.reviewRequestedBy?.name ?? "No request yet"}
          </p>
          <p className="text-sm text-ink/65">
            {formatDateTime(task.reviewRequestedAt)}
          </p>
        </Panel>
        <Panel className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Review outcome
          </p>
          <p className="text-sm text-ink/70">
            Reviewed by {task.reviewedBy?.name ?? "Not reviewed"}
          </p>
          <p className="text-sm text-ink/65">{formatDateTime(task.reviewedAt)}</p>
        </Panel>
        <Panel className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Blocked context
          </p>
          <p className="text-sm text-ink/70">
            {task.blockedCategory
              ? blockedCategoryLabels[task.blockedCategory]
              : "No blocked category"}
          </p>
          <p className="text-sm text-ink/65">
            {task.blockedReason ?? "No blocked reason recorded."}
          </p>
        </Panel>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          {membership.role === "VIEWER" ? (
            <Panel className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                Read-only access
              </p>
              <h2 className="text-2xl font-semibold text-ink">
                Task edits are disabled
              </h2>
              <p className="text-sm leading-6 text-ink/70">
                Viewers can inspect ownership, due risk, comments, and activity,
                but only members and admins can change task data.
              </p>
            </Panel>
          ) : (
            <>
              <TaskEditForm
                task={task}
                users={users}
                projects={projects.map((project) => ({
                  id: project.id,
                  code: project.code,
                  name: project.name
                }))}
              />
              <TaskCommentForm
                taskId={task.id}
                users={users.map((member) => ({
                  id: member.id,
                  name: member.name,
                  email: member.email
                }))}
              />
            </>
          )}
          <Panel className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                Comments
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                Context that stays on the task
              </h2>
            </div>
            {task.comments.length === 0 ? (
              <p className="text-sm text-ink/65">
                No comments yet. Leave a note before the next handoff.
              </p>
            ) : (
              <div className="space-y-3">
                {task.comments.map((comment) => (
                  <div
                    key={comment.id}
                    id={`comment-${comment.id}`}
                    className="rounded-[1.5rem] border border-black/10 bg-canvas/70 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-ink">
                        {comment.author.name}
                      </p>
                      <p className="text-xs text-ink/55">
                        {formatDateTime(comment.createdAt)}
                      </p>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/75">
                      {comment.body}
                    </p>
                    {comment.mentions.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {comment.mentions.map((mention) => (
                          <span
                            key={mention.id}
                            className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900"
                          >
                            Mentioned {mention.user.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                Workflow actions
              </p>
              <h2 className="text-2xl font-semibold text-ink">
                Move the handoff forward
              </h2>
              <p className="text-sm leading-6 text-ink/70">
                Review requests, approvals, changes requested, blocked state,
                and direct completion all run through the same guarded workflow.
              </p>
            </div>
            {membership.role === "VIEWER" ? (
              <p className="text-sm text-ink/70">
                Workflow actions are disabled for viewer access.
              </p>
            ) : (
              <TaskStatusButtons taskId={task.id} transitions={transitions} />
            )}
          </Panel>
          <Panel className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                Activity timeline
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                Who changed what, and when
              </h2>
            </div>
            {task.activityEvents.length === 0 ? (
              <p className="text-sm text-ink/65">
                Activity will appear here as the task moves.
              </p>
            ) : (
              <div className="space-y-3">
                {task.activityEvents.map((event) => (
                  <div
                    key={event.id}
                    id={`activity-${event.id}`}
                    className="rounded-[1.5rem] border border-black/10 bg-canvas/70 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-ink">
                          {event.actor?.name ?? "System"}
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                          {activityEventLabels[event.type]}
                        </p>
                      </div>
                      <p className="text-xs text-ink/55">
                        {formatDateTime(event.createdAt)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink/75">
                      {event.summary ?? "Updated the task"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          {membership.role === "VIEWER" ? null : (
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
          )}
        </div>
      </div>
    </div>
  );
}

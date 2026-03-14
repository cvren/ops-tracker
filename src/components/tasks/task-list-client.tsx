"use client";

import Link from "next/link";
import type { Route } from "next";
import { type TaskPriority, type TaskStatus } from "@prisma/client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { bulkUpdateTasksAction } from "@/app/actions/manager-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  TaskPriorityBadge,
  TaskStatusBadge
} from "@/components/status-badges";
import { CommitmentRiskSummary } from "@/components/commitments/commitment-risk-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  blockedCategoryOptions,
  taskPriorityOptions
} from "@/lib/constants";
import type { CommitmentRiskMetadata } from "@/lib/commitment-policies";
import { INITIAL_ACTION_STATE } from "@/lib/forms";
import { getDueDateBoundary } from "@/lib/task-views";
import { formatDate, formatDateTime } from "@/lib/utils";

type TaskListClientProps = {
  bulkEnabled: boolean;
  bulkViewLabel?: string | null;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | null;
    updatedAt: Date;
    assigneeId: string | null;
    reviewerId: string | null;
    project: {
      id: string;
      code: string;
      name: string;
    };
    assignee: {
      id: string;
      name: string;
    } | null;
    reviewer: {
      id: string;
      name: string;
    } | null;
    risk: CommitmentRiskMetadata;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
  }>;
};

export function TaskListClient({
  bulkEnabled,
  bulkViewLabel,
  tasks,
  users
}: TaskListClientProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    bulkUpdateTasksAction,
    INITIAL_ACTION_STATE
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [persistedMessage, setPersistedMessage] = useState<string | null>(null);
  const overdueBoundary = useMemo(() => getDueDateBoundary(), []);
  const allSelected = selectedIds.length > 0 && selectedIds.length === tasks.length;
  const feedbackStorageKey = "ops-tracker:bulk-feedback";

  useEffect(() => {
    const storedMessage = window.sessionStorage.getItem(feedbackStorageKey);

    if (storedMessage) {
      setPersistedMessage(storedMessage);
      window.sessionStorage.removeItem(feedbackStorageKey);
    }
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      const nextMessage = state.message ?? "Bulk changes applied.";
      setPersistedMessage(nextMessage);
      window.sessionStorage.setItem(feedbackStorageKey, nextMessage);
      setSelectedIds([]);
      router.refresh();
    }
  }, [feedbackStorageKey, router, state.message, state.status]);

  const feedbackState =
    state.status === "idle" && persistedMessage
      ? {
          status: "success" as const,
          message: persistedMessage
        }
      : state;

  function toggleSelected(taskId: string) {
    setSelectedIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId]
    );
  }

  function toggleSelectAll() {
    setSelectedIds((current) =>
      current.length === tasks.length ? [] : tasks.map((task) => task.id)
    );
  }

  return (
    <div className="space-y-4">
      {bulkEnabled ? (
        <Panel className="space-y-4 border-amber-200 bg-amber-50/80">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Bulk actions
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                Clear the {bulkViewLabel ?? "current"} queue without opening each
                task
              </h2>
              <p className="mt-1 text-sm text-ink/70">
                Select tasks on this page, then assign owners, reviewers, due
                dates, or blocked state in one pass.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={toggleSelectAll}>
                {allSelected ? "Clear page selection" : "Select page"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSelectedIds([])}
                disabled={selectedIds.length === 0}
              >
                Clear selection
              </Button>
              <span className="inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-black/10">
                {selectedIds.length} selected
              </span>
            </div>
          </div>
          {selectedIds.length === 0 ? (
            <div className="rounded-[1.5rem] bg-white/70 px-4 py-4 text-sm text-ink/70 ring-1 ring-black/8">
              Pick one or more tasks from the list below to open the bulk action
              bar for {bulkViewLabel ?? "this queue"}.
            </div>
          ) : (
            <form
              action={formAction}
              className="space-y-4"
              onSubmit={() => {
                setPersistedMessage(null);
                window.sessionStorage.removeItem(feedbackStorageKey);
              }}
            >
              {selectedIds.map((taskId) => (
                <input key={taskId} type="hidden" name="taskIds" value={taskId} />
              ))}
              <div className="rounded-[1.5rem] bg-white/70 px-4 py-4 text-sm text-ink/70 ring-1 ring-black/8">
                Applying changes to <span className="font-semibold text-ink">{selectedIds.length}</span>{" "}
                task{selectedIds.length === 1 ? "" : "s"} in{" "}
                <span className="font-semibold text-ink">
                  {bulkViewLabel ?? "this queue"}
                </span>
                .
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="bulk-assignee" className="text-sm font-medium text-ink">
                    Set owner
                  </label>
                  <Select id="bulk-assignee" name="assigneeId" defaultValue="">
                    <option value="">No change</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} · {user.email}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="bulk-reviewer" className="text-sm font-medium text-ink">
                    Set reviewer
                  </label>
                  <Select id="bulk-reviewer" name="reviewerId" defaultValue="">
                    <option value="">No change</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} · {user.email}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="bulk-due-date" className="text-sm font-medium text-ink">
                    Set due date
                  </label>
                  <Input id="bulk-due-date" name="dueDate" type="date" />
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-4">
                <div className="space-y-2">
                  <label htmlFor="bulk-status" className="text-sm font-medium text-ink">
                    Set status
                  </label>
                  <Select id="bulk-status" name="status" defaultValue="">
                    <option value="">No change</option>
                    <option value="BACKLOG">Backlog</option>
                    <option value="IN_PROGRESS">In progress</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="bulk-priority" className="text-sm font-medium text-ink">
                    Set priority
                  </label>
                  <Select id="bulk-priority" name="priority" defaultValue="">
                    <option value="">No change</option>
                    {taskPriorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="bulk-blocked-state"
                    className="text-sm font-medium text-ink"
                  >
                    Blocked state
                  </label>
                  <Select
                    id="bulk-blocked-state"
                    name="blockedState"
                    defaultValue="keep"
                  >
                    <option value="keep">No change</option>
                    <option value="block">Mark blocked</option>
                    <option value="unblock">Mark unblocked</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="bulk-blocked-category"
                    className="text-sm font-medium text-ink"
                  >
                    Blocked category
                  </label>
                  <Select
                    id="bulk-blocked-category"
                    name="blockedCategory"
                    defaultValue=""
                  >
                    <option value="">No change</option>
                    {blockedCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="bulk-blocked-reason"
                  className="text-sm font-medium text-ink"
                >
                  Blocked reason
                </label>
                <Textarea
                  id="bulk-blocked-reason"
                  name="blockedReason"
                  className="min-h-24"
                  placeholder="Required only when marking blocked."
                />
              </div>
              <SubmitButton
                label="Apply bulk changes"
                pendingLabel="Applying..."
                fullWidth={false}
              />
            </form>
          )}
          <ActionFeedback state={feedbackState} />
        </Panel>
      ) : null}

      <div className="grid gap-4">
        {tasks.map((task) => {
          const isOverdue =
            task.dueDate !== null &&
            task.status !== "DONE" &&
            task.dueDate < overdueBoundary;

          return (
            <Panel key={task.id} className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {bulkEnabled ? (
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(task.id)}
                          onChange={() => toggleSelected(task.id)}
                          aria-label={`Select ${task.title}`}
                          className="size-4 rounded border-black/20"
                        />
                        Select
                      </label>
                    ) : null}
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
                  <CommitmentRiskSummary risk={task.risk} />
                  <div>
                    <Link
                      href={`/tasks/${task.id}` as Route}
                      className="text-2xl font-semibold text-ink hover:text-accent"
                    >
                      {task.title}
                    </Link>
                    <p className="mt-1 text-sm font-medium text-ink/60">
                      {task.project.code} · {task.project.name}
                    </p>
                  </div>
                  <p className="max-w-3xl text-sm leading-6 text-ink/70">
                    {task.description}
                  </p>
                </div>
                <div className="space-y-2 rounded-[1.5rem] bg-canvas/70 px-4 py-3 text-sm text-ink/70">
                  <p>Owner: {task.assignee?.name ?? "Unassigned"}</p>
                  <p>Reviewer: {task.reviewer?.name ?? "None"}</p>
                  <p>Due: {formatDate(task.dueDate)}</p>
                  <p>Updated: {formatDateTime(task.updatedAt)}</p>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

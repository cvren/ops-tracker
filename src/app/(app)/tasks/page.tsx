import Link from "next/link";
import type { Route } from "next";
import { TaskPriority, TaskStatus } from "@prisma/client";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TaskListClient } from "@/components/tasks/task-list-client";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  managerTaskViewOptions,
  taskPriorityOptions,
  taskStatusOptions,
  taskViewLabels,
  taskViewOptions
} from "@/lib/constants";
import { getAssignableUsers, listProjects, listTasks } from "@/lib/data";
import { getManagerWorkloadData } from "@/lib/manager-data";
import { canManageManagerConsole } from "@/lib/permissions";
import { isManagerTaskView, parseTaskView } from "@/lib/task-views";
import { getCurrentWorkspaceContext } from "@/lib/workspace";

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
  const rawAssigneeId =
    typeof params.assigneeId === "string" ? params.assigneeId : "";
  const rawReviewerId =
    typeof params.reviewerId === "string" ? params.reviewerId : "";
  const view = parseTaskView(
    typeof params.view === "string" ? params.view : undefined
  );

  const status = Object.values(TaskStatus).includes(rawStatus as TaskStatus)
    ? (rawStatus as TaskStatus)
    : undefined;
  const priority = Object.values(TaskPriority).includes(
    rawPriority as TaskPriority
  )
    ? (rawPriority as TaskPriority)
    : undefined;

  const context = await getCurrentWorkspaceContext();
  const canAccessManagerConsole = canManageManagerConsole(
    context.membership.role
  );
  const bulkEnabledViews = new Set([
    "unassigned",
    "overdue",
    "review-queue",
    "blocked-aging",
    "due-this-week",
    "high-risk"
  ]);
  const bulkEnabled = Boolean(
    canAccessManagerConsole && view && bulkEnabledViews.has(view)
  );
  const bulkViewLabel = bulkEnabled && view ? taskViewLabels[view] : null;

  if (!canAccessManagerConsole && isManagerTaskView(view)) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Tasks"
          title="Work the queue with ownership and review context."
          description="Manager views are available to workspace admins and managers. Personal queues and task detail remain available for members and viewers."
        />
        <Panel className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Manager view locked
          </p>
          <h2 className="text-2xl font-semibold text-ink">
            This queue is available to workspace admins and managers.
          </h2>
          <p className="text-sm text-ink/70">
            Use your personal saved views, or ask an admin or delegated manager
            to clear the queue from the manager console.
          </p>
        </Panel>
      </div>
    );
  }

  const [projects, users, workload, tasks] = await Promise.all([
    listProjects(),
    getAssignableUsers(),
    canAccessManagerConsole && view === "workload"
      ? getManagerWorkloadData()
      : Promise.resolve([]),
    view === "workload"
      ? Promise.resolve([])
      : listTasks({
          query,
          status,
          priority,
          projectId: rawProjectId || undefined,
          assigneeId: rawAssigneeId || undefined,
          reviewerId: rawReviewerId || undefined,
          view
        })
  ]);

  const headerTitle =
    view && view in taskViewLabels
      ? taskViewLabels[view]
      : "Work the queue with ownership and review context.";
  const headerDescription = bulkEnabled
    ? "Select the risky tasks on this queue and clear them in one pass without opening each detail page."
    : canAccessManagerConsole
      ? "Filter the shared task list by queue, owner, reviewer, due date, and project so the next risky pocket of work is obvious."
      : "Filter the shared task list by saved view, reviewer, owner, deadline, and project so handoffs do not drift into Slack or memory.";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tasks"
        title={headerTitle}
        description={headerDescription}
        action={undefined}
      />

      <Panel className="space-y-4">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/tasks"
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                !view ? "bg-ink text-canvas" : "bg-white/70 text-ink hover:bg-white"
              }`}
            >
              All Tasks
            </Link>
            {taskViewOptions.map((option) => (
              <Link
                key={option.value}
                href={`/tasks?view=${option.value}` as Route}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  view === option.value
                    ? "bg-ink text-canvas"
                    : "bg-white/70 text-ink hover:bg-white"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
          {canAccessManagerConsole ? (
            <div className="flex flex-wrap gap-2">
              {managerTaskViewOptions.map((option) => (
                <Link
                  key={option.value}
                  href={`/tasks?view=${option.value}` as Route}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    view === option.value
                      ? "bg-accent text-canvas"
                      : "bg-white/70 text-ink hover:bg-white"
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <form className="grid gap-4 xl:grid-cols-[1.2fr_180px_180px_220px_220px_220px_auto]">
          {view ? <input type="hidden" name="view" value={view} /> : null}
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
          <Select name="assigneeId" defaultValue={rawAssigneeId}>
            <option value="">All owners</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
          <Select name="reviewerId" defaultValue={rawReviewerId}>
            <option value="">All reviewers</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
          <Button type="submit" fullWidth={false}>
            Apply filters
          </Button>
        </form>
      </Panel>

      {view === "workload" ? (
        <Panel className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Workload by member
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                See who is carrying open work and review load
              </h2>
            </div>
            <Link
              href="/tasks?view=high-risk"
              className="text-sm font-semibold text-accent hover:text-ink"
            >
              Open high-risk queue
            </Link>
          </div>
          {workload.length === 0 ? (
            <EmptyState
              title="No open workload"
              description="The workspace has no active ownership or review load right now."
            />
          ) : (
            <div className="space-y-3">
              {workload.map((member) => (
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
                        Open tasks: {member.openCount} · Review queue:{" "}
                        {member.reviewQueueCount} · Overdue: {member.overdueCount}
                        {" · "}Blocked: {member.blockedCount}
                      </p>
                    </div>
                    <Link
                      href={`/tasks?assigneeId=${member.id}` as Route}
                      className="text-sm font-semibold text-accent hover:text-ink"
                    >
                      View assigned tasks
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No matching tasks"
          description="Try a broader filter or create a new task from a project detail page."
          ctaHref="/projects"
          ctaLabel="Go to projects"
        />
      ) : (
        <TaskListClient
          bulkEnabled={bulkEnabled}
          bulkViewLabel={bulkViewLabel}
          tasks={tasks}
          users={users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email
          }))}
        />
      )}
    </div>
  );
}

import {
  ActivityEventType,
  TaskStatus,
  type Membership,
  type Task
} from "@prisma/client";

import {
  canManageTaskLifecycle,
  canRequestTaskReview,
  canReviewTask
} from "@/lib/permissions";

export type TaskTransitionIntent =
  | "move-to-backlog"
  | "start-work"
  | "mark-blocked"
  | "resume-work"
  | "request-review"
  | "approve-review"
  | "request-changes"
  | "mark-done";

type WorkflowTask = Pick<
  Task,
  | "status"
  | "reviewerId"
  | "assigneeId"
  | "createdById"
  | "blockedReason"
  | "startedAt"
>;

function hasStatus(status: TaskStatus, allowed: TaskStatus[]) {
  return allowed.includes(status);
}

export type TaskTransitionResult =
  | {
      ok: true;
      eventType: ActivityEventType;
      nextStatus: TaskStatus;
      data: Partial<Task>;
    }
  | {
      ok: false;
      error: string;
    };

export function getAvailableTaskTransitions(input: {
  membership: Pick<Membership, "role" | "userId">;
  task: WorkflowTask;
}) {
  const intents: Array<{
    intent: TaskTransitionIntent;
    label: string;
    variant: "primary" | "secondary" | "danger";
  }> = [];

  const lifecyclePermission = canManageTaskLifecycle({
    membership: input.membership,
    task: input.task
  });

  const requestReviewPermission = canRequestTaskReview({
    membership: input.membership,
    task: input.task
  });

  const reviewPermission = canReviewTask({
    membership: input.membership,
    task: input.task
  });

  if (
    lifecyclePermission &&
    hasStatus(input.task.status, [
      TaskStatus.IN_PROGRESS,
      TaskStatus.CHANGES_REQUESTED,
      TaskStatus.BLOCKED
    ])
  ) {
    intents.push({
      intent: "move-to-backlog",
      label: "Move to backlog",
      variant: "secondary"
    });
  }

  if (
    lifecyclePermission &&
    hasStatus(input.task.status, [
      TaskStatus.BACKLOG,
      TaskStatus.CHANGES_REQUESTED,
      TaskStatus.BLOCKED
    ])
  ) {
    intents.push({
      intent:
        input.task.status === TaskStatus.BLOCKED ? "resume-work" : "start-work",
      label:
        input.task.status === TaskStatus.BLOCKED ? "Resume work" : "Start work",
      variant: "primary"
    });
  }

  if (
    lifecyclePermission &&
    hasStatus(input.task.status, [
      TaskStatus.BACKLOG,
      TaskStatus.IN_PROGRESS,
      TaskStatus.CHANGES_REQUESTED
    ])
  ) {
    intents.push({
      intent: "mark-blocked",
      label: "Mark blocked",
      variant: "danger"
    });
  }

  if (
    requestReviewPermission &&
    hasStatus(input.task.status, [
      TaskStatus.IN_PROGRESS,
      TaskStatus.CHANGES_REQUESTED
    ]) &&
    input.task.reviewerId
  ) {
    intents.push({
      intent: "request-review",
      label: "Request review",
      variant: "primary"
    });
  }

  if (
    lifecyclePermission &&
    !input.task.reviewerId &&
    hasStatus(input.task.status, [
      TaskStatus.BACKLOG,
      TaskStatus.IN_PROGRESS,
      TaskStatus.CHANGES_REQUESTED
    ])
  ) {
    intents.push({
      intent: "mark-done",
      label: "Mark done",
      variant: "primary"
    });
  }

  if (reviewPermission && input.task.status === TaskStatus.NEEDS_REVIEW) {
    intents.push({
      intent: "request-changes",
      label: "Request changes",
      variant: "secondary"
    });
    intents.push({
      intent: "approve-review",
      label: "Approve and finish",
      variant: "primary"
    });
  }

  return intents;
}

export function getTaskTransitionResult(input: {
  intent: TaskTransitionIntent;
  actorId: string;
  membership: Pick<Membership, "role" | "userId">;
  task: WorkflowTask;
  now?: Date;
}): TaskTransitionResult {
  const now = input.now ?? new Date();
  const lifecyclePermission = canManageTaskLifecycle({
    membership: input.membership,
    task: input.task
  });

  const requestReviewPermission = canRequestTaskReview({
    membership: input.membership,
    task: input.task
  });

  const reviewPermission = canReviewTask({
    membership: input.membership,
    task: input.task
  });

  switch (input.intent) {
    case "move-to-backlog":
      if (!lifecyclePermission) {
        return { ok: false, error: "You cannot move this task." };
      }

      if (
        !hasStatus(input.task.status, [
          TaskStatus.IN_PROGRESS,
          TaskStatus.CHANGES_REQUESTED,
          TaskStatus.BLOCKED
        ])
      ) {
        return {
          ok: false,
          error: "Only active or blocked tasks can move back to backlog."
        };
      }

      return {
        ok: true,
        eventType: ActivityEventType.TASK_STATUS_CHANGED,
        nextStatus: TaskStatus.BACKLOG,
        data: {
          status: TaskStatus.BACKLOG,
          completedAt: null
        }
      };

    case "start-work":
    case "resume-work":
      if (!lifecyclePermission) {
        return { ok: false, error: "You cannot start work on this task." };
      }

      if (
        !hasStatus(input.task.status, [
          TaskStatus.BACKLOG,
          TaskStatus.CHANGES_REQUESTED,
          TaskStatus.BLOCKED
        ])
      ) {
        return {
          ok: false,
          error: "Only backlog, blocked, or changes-requested tasks can move into progress."
        };
      }

      return {
        ok: true,
        eventType:
          input.intent === "resume-work"
            ? ActivityEventType.TASK_UNBLOCKED
            : ActivityEventType.TASK_STATUS_CHANGED,
        nextStatus: TaskStatus.IN_PROGRESS,
        data: {
          status: TaskStatus.IN_PROGRESS,
          startedAt: input.task.startedAt ?? now,
          completedAt: null
        }
      };

    case "mark-blocked":
      if (!lifecyclePermission) {
        return { ok: false, error: "You cannot block this task." };
      }

      if (
        !hasStatus(input.task.status, [
          TaskStatus.BACKLOG,
          TaskStatus.IN_PROGRESS,
          TaskStatus.CHANGES_REQUESTED
        ])
      ) {
        return {
          ok: false,
          error: "Only active tasks can be marked blocked."
        };
      }

      if (!input.task.blockedReason?.trim()) {
        return {
          ok: false,
          error: "Add a blocked reason before moving this task to blocked."
        };
      }

      return {
        ok: true,
        eventType: ActivityEventType.TASK_BLOCKED,
        nextStatus: TaskStatus.BLOCKED,
        data: {
          status: TaskStatus.BLOCKED,
          completedAt: null
        }
      };

    case "request-review":
      if (!requestReviewPermission) {
        return {
          ok: false,
          error: "Only the assignee or an admin can request review."
        };
      }

      if (!input.task.reviewerId) {
        return {
          ok: false,
          error: "Set a reviewer before requesting review."
        };
      }

      if (
        !hasStatus(input.task.status, [
          TaskStatus.IN_PROGRESS,
          TaskStatus.CHANGES_REQUESTED
        ])
      ) {
        return {
          ok: false,
          error: "Only in-progress or changes-requested tasks can be sent for review."
        };
      }

      return {
        ok: true,
        eventType: ActivityEventType.TASK_REVIEW_REQUESTED,
        nextStatus: TaskStatus.NEEDS_REVIEW,
        data: {
          status: TaskStatus.NEEDS_REVIEW,
          reviewRequestedAt: now,
          reviewRequestedById: input.actorId,
          reviewedAt: null,
          reviewedById: null,
          completedAt: null
        }
      };

    case "approve-review":
      if (!reviewPermission) {
        return {
          ok: false,
          error: "Only the reviewer or an admin can approve this task."
        };
      }

      if (input.task.status !== TaskStatus.NEEDS_REVIEW) {
        return {
          ok: false,
          error: "Only tasks waiting for review can be approved."
        };
      }

      return {
        ok: true,
        eventType: ActivityEventType.TASK_REVIEW_APPROVED,
        nextStatus: TaskStatus.DONE,
        data: {
          status: TaskStatus.DONE,
          reviewedAt: now,
          reviewedById: input.actorId,
          completedAt: now
        }
      };

    case "request-changes":
      if (!reviewPermission) {
        return {
          ok: false,
          error: "Only the reviewer or an admin can request changes."
        };
      }

      if (input.task.status !== TaskStatus.NEEDS_REVIEW) {
        return {
          ok: false,
          error: "Only tasks waiting for review can be sent back."
        };
      }

      return {
        ok: true,
        eventType: ActivityEventType.TASK_CHANGES_REQUESTED,
        nextStatus: TaskStatus.CHANGES_REQUESTED,
        data: {
          status: TaskStatus.CHANGES_REQUESTED,
          reviewedAt: now,
          reviewedById: input.actorId,
          completedAt: null
        }
      };

    case "mark-done":
      if (!lifecyclePermission) {
        return { ok: false, error: "You cannot complete this task." };
      }

      if (input.task.reviewerId) {
        return {
          ok: false,
          error: "Tasks with a reviewer must go through review before completion."
        };
      }

      if (
        !hasStatus(input.task.status, [
          TaskStatus.BACKLOG,
          TaskStatus.IN_PROGRESS,
          TaskStatus.CHANGES_REQUESTED
        ])
      ) {
        return {
          ok: false,
          error: "Only active tasks can be marked done directly."
        };
      }

      return {
        ok: true,
        eventType: ActivityEventType.TASK_STATUS_CHANGED,
        nextStatus: TaskStatus.DONE,
        data: {
          status: TaskStatus.DONE,
          completedAt: now
        }
      };
  }
}

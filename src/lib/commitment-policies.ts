import {
  CommitmentPolicyKind,
  CommitmentScopeType,
  RecurringExecutionStatus,
  TaskStatus,
  type CommitmentPolicy
} from "@prisma/client";
import type { CommitmentSeverity } from "@prisma/client";

export type CommitmentPolicyRecord = Pick<
  CommitmentPolicy,
  | "id"
  | "workspaceId"
  | "name"
  | "scopeType"
  | "scopeId"
  | "kind"
  | "thresholdMinutes"
  | "thresholdHours"
  | "severity"
  | "isActive"
  | "createdAt"
  | "updatedAt"
>;

export type CommitmentRiskHit = {
  policyId: string;
  policyName: string;
  kind: CommitmentPolicyKind;
  severity: CommitmentSeverity;
  scopeType: CommitmentScopeType;
  scopeId: string;
  thresholdLabel: string;
  observedForLabel: string;
  summary: string;
};

export type CommitmentRiskMetadata = {
  hits: CommitmentRiskHit[];
  highestSeverity: CommitmentSeverity | null;
  summary: string | null;
};

export type CommitmentRiskTask = {
  id: string;
  projectId: string;
  status: TaskStatus;
  dueDate: Date | null;
  reviewRequestedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  assigneeId: string | null;
  recurringExecution:
    | {
        recurringSchedule: {
          templateId: string;
        };
      }
    | null;
};

export type CommitmentRiskSchedule = {
  id: string;
  projectId: string;
  templateId: string;
  latestExecution:
    | {
        id: string;
        status: RecurringExecutionStatus;
        startedAt: Date;
        finishedAt: Date | null;
        errorMessage: string | null;
      }
    | null;
};

const severityRank: Record<CommitmentSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

export function getCommitmentPolicyThresholdMs(policy: {
  thresholdMinutes: number | null;
  thresholdHours: number | null;
}) {
  if (policy.thresholdMinutes !== null) {
    return policy.thresholdMinutes * 60 * 1000;
  }

  return (policy.thresholdHours ?? 0) * 60 * 60 * 1000;
}

export function formatCommitmentPolicyThreshold(policy: {
  thresholdMinutes: number | null;
  thresholdHours: number | null;
}) {
  if (policy.thresholdMinutes !== null) {
    return `${policy.thresholdMinutes}m`;
  }

  return `${policy.thresholdHours ?? 0}h`;
}

export function getCommitmentPolicyScopeLabel(input: {
  policy: Pick<CommitmentPolicyRecord, "scopeId" | "scopeType">;
  workspaceName: string;
  projectsById?: Map<string, { code: string; name: string }>;
  templatesById?: Map<string, { name: string; title: string }>;
}) {
  switch (input.policy.scopeType) {
    case CommitmentScopeType.WORKSPACE:
      return input.workspaceName;
    case CommitmentScopeType.PROJECT: {
      const project = input.projectsById?.get(input.policy.scopeId);
      return project
        ? `${project.code} · ${project.name}`
        : "Unknown project scope";
    }
    case CommitmentScopeType.TEMPLATE: {
      const template = input.templatesById?.get(input.policy.scopeId);
      return template
        ? `${template.name} · ${template.title}`
        : "Unknown template scope";
    }
  }
}

export function formatCommitmentObservedFor(durationMs: number) {
  const totalMinutes = Math.max(0, Math.floor(durationMs / (60 * 1000)));

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const totalHours = Math.floor(totalMinutes / 60);

  if (totalHours < 48) {
    return `${totalHours}h`;
  }

  const totalDays = Math.floor(totalHours / 24);
  return `${totalDays}d`;
}

function getCommitmentSummaryPrefix(kind: CommitmentPolicyKind) {
  switch (kind) {
    case CommitmentPolicyKind.OVERDUE:
      return "Past due for";
    case CommitmentPolicyKind.REVIEW_STALE:
      return "Waiting on review for";
    case CommitmentPolicyKind.BLOCKED_STALE:
      return "Blocked for";
    case CommitmentPolicyKind.UNASSIGNED_STALE:
      return "Unassigned for";
    case CommitmentPolicyKind.RECURRING_FAILED:
      return "Failed for";
  }
}

function buildCommitmentRiskHit(input: {
  durationMs: number;
  policy: CommitmentPolicyRecord;
}) {
  const thresholdLabel = formatCommitmentPolicyThreshold(input.policy);
  const observedForLabel = formatCommitmentObservedFor(input.durationMs);

  return {
    policyId: input.policy.id,
    policyName: input.policy.name,
    kind: input.policy.kind,
    severity: input.policy.severity,
    scopeType: input.policy.scopeType,
    scopeId: input.policy.scopeId,
    thresholdLabel,
    observedForLabel,
    summary: `${getCommitmentSummaryPrefix(input.policy.kind)} ${observedForLabel} against ${thresholdLabel}.`
  } satisfies CommitmentRiskHit;
}

function getTaskTemplateId(task: CommitmentRiskTask) {
  return task.recurringExecution?.recurringSchedule.templateId ?? null;
}

function taskPolicyApplies(
  policy: CommitmentPolicyRecord,
  task: CommitmentRiskTask
) {
  if (policy.kind === CommitmentPolicyKind.RECURRING_FAILED) {
    return false;
  }

  switch (policy.scopeType) {
    case CommitmentScopeType.WORKSPACE:
      return true;
    case CommitmentScopeType.PROJECT:
      return task.projectId === policy.scopeId;
    case CommitmentScopeType.TEMPLATE:
      return getTaskTemplateId(task) === policy.scopeId;
  }
}

function schedulePolicyApplies(
  policy: CommitmentPolicyRecord,
  schedule: CommitmentRiskSchedule
) {
  if (policy.kind !== CommitmentPolicyKind.RECURRING_FAILED) {
    return false;
  }

  switch (policy.scopeType) {
    case CommitmentScopeType.WORKSPACE:
      return true;
    case CommitmentScopeType.PROJECT:
      return schedule.projectId === policy.scopeId;
    case CommitmentScopeType.TEMPLATE:
      return schedule.templateId === policy.scopeId;
  }
}

function sortCommitmentRiskHits(hits: CommitmentRiskHit[]) {
  return [...hits].sort((left, right) => {
    const severityDelta =
      severityRank[right.severity] - severityRank[left.severity];

    if (severityDelta !== 0) {
      return severityDelta;
    }

    return left.policyName.localeCompare(right.policyName);
  });
}

export function buildCommitmentRiskMetadata(hits: CommitmentRiskHit[]) {
  const sortedHits = sortCommitmentRiskHits(hits);

  return {
    hits: sortedHits,
    highestSeverity: sortedHits[0]?.severity ?? null,
    summary: sortedHits[0]?.summary ?? null
  } satisfies CommitmentRiskMetadata;
}

export function evaluateTaskCommitmentRisk(input: {
  now?: Date;
  policies: CommitmentPolicyRecord[];
  task: CommitmentRiskTask;
}) {
  const now = input.now ?? new Date();
  const hits: CommitmentRiskHit[] = [];

  for (const policy of input.policies) {
    if (!policy.isActive || !taskPolicyApplies(policy, input.task)) {
      continue;
    }

    const thresholdMs = getCommitmentPolicyThresholdMs(policy);

    switch (policy.kind) {
      case CommitmentPolicyKind.OVERDUE: {
        if (
          input.task.status === TaskStatus.DONE ||
          input.task.dueDate === null
        ) {
          break;
        }

        const durationMs = now.getTime() - input.task.dueDate.getTime();

        if (durationMs >= thresholdMs) {
          hits.push(buildCommitmentRiskHit({ durationMs, policy }));
        }
        break;
      }
      case CommitmentPolicyKind.REVIEW_STALE: {
        if (input.task.status !== TaskStatus.NEEDS_REVIEW) {
          break;
        }

        const anchor = input.task.reviewRequestedAt ?? input.task.updatedAt;
        const durationMs = now.getTime() - anchor.getTime();

        if (durationMs >= thresholdMs) {
          hits.push(buildCommitmentRiskHit({ durationMs, policy }));
        }
        break;
      }
      case CommitmentPolicyKind.BLOCKED_STALE: {
        if (input.task.status !== TaskStatus.BLOCKED) {
          break;
        }

        const durationMs = now.getTime() - input.task.updatedAt.getTime();

        if (durationMs >= thresholdMs) {
          hits.push(buildCommitmentRiskHit({ durationMs, policy }));
        }
        break;
      }
      case CommitmentPolicyKind.UNASSIGNED_STALE: {
        if (
          input.task.status === TaskStatus.DONE ||
          input.task.assigneeId !== null
        ) {
          break;
        }

        // The runtime still does not track a dedicated unassigned-since
        // timestamp, so task creation time remains the bounded baseline until a
        // later phase adds a more precise ownership-age field.
        const durationMs = now.getTime() - input.task.createdAt.getTime();

        if (durationMs >= thresholdMs) {
          hits.push(buildCommitmentRiskHit({ durationMs, policy }));
        }
        break;
      }
      case CommitmentPolicyKind.RECURRING_FAILED:
        break;
    }
  }

  return buildCommitmentRiskMetadata(hits);
}

export function evaluateRecurringScheduleCommitmentRisk(input: {
  now?: Date;
  policies: CommitmentPolicyRecord[];
  schedule: CommitmentRiskSchedule;
}) {
  const now = input.now ?? new Date();
  const hits: CommitmentRiskHit[] = [];

  for (const policy of input.policies) {
    if (!policy.isActive || !schedulePolicyApplies(policy, input.schedule)) {
      continue;
    }

    const latestExecution = input.schedule.latestExecution;

    if (
      latestExecution === null ||
      latestExecution.status !== RecurringExecutionStatus.FAILED
    ) {
      continue;
    }

    const thresholdMs = getCommitmentPolicyThresholdMs(policy);
    const anchor = latestExecution.finishedAt ?? latestExecution.startedAt;
    const durationMs = now.getTime() - anchor.getTime();

    if (durationMs >= thresholdMs) {
      hits.push(buildCommitmentRiskHit({ durationMs, policy }));
    }
  }

  return buildCommitmentRiskMetadata(hits);
}

import { CommitmentPolicyKind } from "@prisma/client";

import {
  type CommitmentPolicyRecord,
  type CommitmentRiskMetadata,
  type CommitmentRiskSchedule,
  type CommitmentRiskTask,
  evaluateRecurringScheduleCommitmentRisk,
  evaluateTaskCommitmentRisk
} from "@/lib/commitment-policies";

export function attachTaskRiskMetadata<T extends CommitmentRiskTask>(input: {
  now?: Date;
  policies: CommitmentPolicyRecord[];
  tasks: T[];
}) {
  const now = input.now ?? new Date();

  return input.tasks.map((task) => ({
    ...task,
    risk: evaluateTaskCommitmentRisk({
      now,
      policies: input.policies,
      task
    })
  }));
}

export function attachRecurringScheduleRiskMetadata<
  T extends CommitmentRiskSchedule
>(input: {
  now?: Date;
  policies: CommitmentPolicyRecord[];
  schedules: T[];
}) {
  const now = input.now ?? new Date();

  return input.schedules.map((schedule) => ({
    ...schedule,
    risk: evaluateRecurringScheduleCommitmentRisk({
      now,
      policies: input.policies,
      schedule
    })
  }));
}

export function countEntitiesAtRisk<T extends { risk: CommitmentRiskMetadata }>(
  items: T[]
) {
  return items.filter((item) => item.risk.hits.length > 0).length;
}

export function summarizeRiskKindsByEntity<
  T extends {
    id: string;
    risk: CommitmentRiskMetadata;
  }
>(items: T[]) {
  const countsByKind = new Map<CommitmentPolicyKind, Set<string>>(
    Object.values(CommitmentPolicyKind).map((kind) => [kind, new Set<string>()])
  );

  for (const item of items) {
    const seenKinds = new Set(
      item.risk.hits.map((hit) => hit.kind)
    );

    for (const kind of seenKinds) {
      countsByKind.get(kind)?.add(item.id);
    }
  }

  return Object.values(CommitmentPolicyKind).map((kind) => ({
    kind,
    count: countsByKind.get(kind)?.size ?? 0
  }));
}

export function countPolicyBreachesById<
  T extends {
    risk: CommitmentRiskMetadata;
  }
>(items: T[]) {
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const hit of item.risk.hits) {
      counts.set(hit.policyId, (counts.get(hit.policyId) ?? 0) + 1);
    }
  }

  return counts;
}

import { CommitmentPolicyKind } from "@prisma/client";

import {
  buildCommitmentRiskMetadataFromExceptionCases,
  type ExceptionCaseRiskRecord
} from "@/lib/exception-cases";

export function attachTaskRiskMetadataFromExceptionCases<T extends { id: string }>(
  input: {
    cases: ExceptionCaseRiskRecord[];
    tasks: T[];
  }
) {
  const casesByTaskId = new Map<string, ExceptionCaseRiskRecord[]>();

  for (const exceptionCase of input.cases) {
    if (!exceptionCase.taskId) {
      continue;
    }

    const bucket = casesByTaskId.get(exceptionCase.taskId) ?? [];
    bucket.push(exceptionCase);
    casesByTaskId.set(exceptionCase.taskId, bucket);
  }

  return input.tasks.map((task) => ({
    ...task,
    risk: buildCommitmentRiskMetadataFromExceptionCases(
      casesByTaskId.get(task.id) ?? []
    )
  }));
}

export function attachRecurringScheduleRiskMetadataFromExceptionCases<
  T extends {
    latestExecution: {
      id: string;
    } | null;
  }
>(input: {
  cases: ExceptionCaseRiskRecord[];
  schedules: T[];
}) {
  const casesByExecutionId = new Map<string, ExceptionCaseRiskRecord[]>();

  for (const exceptionCase of input.cases) {
    if (!exceptionCase.recurringExecutionId) {
      continue;
    }

    const bucket = casesByExecutionId.get(exceptionCase.recurringExecutionId) ?? [];
    bucket.push(exceptionCase);
    casesByExecutionId.set(exceptionCase.recurringExecutionId, bucket);
  }

  return input.schedules.map((schedule) => ({
    ...schedule,
    risk: schedule.latestExecution
      ? buildCommitmentRiskMetadataFromExceptionCases(
          casesByExecutionId.get(schedule.latestExecution.id) ?? []
        )
      : buildCommitmentRiskMetadataFromExceptionCases([])
  }));
}

export function countOpenExceptionSources(input: {
  cases: ExceptionCaseRiskRecord[];
  source: "RECURRING_EXECUTION" | "TASK";
}) {
  const sourceIds = new Set<string>();

  for (const exceptionCase of input.cases) {
    if (input.source === "TASK" && exceptionCase.taskId) {
      sourceIds.add(exceptionCase.taskId);
    }

    if (
      input.source === "RECURRING_EXECUTION" &&
      exceptionCase.recurringExecutionId
    ) {
      sourceIds.add(exceptionCase.recurringExecutionId);
    }
  }

  return sourceIds.size;
}

export function summarizeOpenExceptionKinds(cases: ExceptionCaseRiskRecord[]) {
  const countsByKind = new Map<CommitmentPolicyKind, Set<string>>(
    Object.values(CommitmentPolicyKind).map((kind) => [kind, new Set<string>()])
  );

  for (const exceptionCase of cases) {
    const sourceKey = exceptionCase.taskId
      ? `task:${exceptionCase.taskId}`
      : `execution:${exceptionCase.recurringExecutionId ?? "missing"}`;

    countsByKind.get(exceptionCase.kind)?.add(sourceKey);
  }

  return Object.values(CommitmentPolicyKind).map((kind) => ({
    kind,
    count: countsByKind.get(kind)?.size ?? 0
  }));
}

export function countOpenExceptionsByPolicyId(cases: ExceptionCaseRiskRecord[]) {
  const counts = new Map<string, number>();

  for (const exceptionCase of cases) {
    counts.set(
      exceptionCase.sourcePolicyId,
      (counts.get(exceptionCase.sourcePolicyId) ?? 0) + 1
    );
  }

  return counts;
}

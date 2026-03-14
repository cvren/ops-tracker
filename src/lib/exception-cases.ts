import {
  ActivityEventType,
  ExceptionEmailDeliveryEvent,
  ExceptionResolutionKind,
  ExceptionStatus,
  TaskStatus,
  type CommitmentPolicyKind,
  type CommitmentScopeType,
  CommitmentSeverity,
  type Prisma
} from "@prisma/client";

import { createActivityEvent } from "@/lib/activity";
import { commitmentPolicyKindLabels } from "@/lib/constants";
import {
  buildCommitmentRiskMetadata,
  evaluateRecurringScheduleCommitmentRisk,
  evaluateTaskCommitmentRisk,
  type CommitmentPolicyRecord,
  type CommitmentRiskSchedule,
  type CommitmentRiskTask
} from "@/lib/commitment-policies";
import { prisma } from "@/lib/prisma";
import {
  buildExceptionEmailMessage,
  createExceptionEmailDeliveries,
  getExceptionManagerRecipients,
  getStatusAfterSnoozeExpires
} from "@/lib/exception-response";

export const activeExceptionStatuses = [
  ExceptionStatus.OPEN,
  ExceptionStatus.ACKNOWLEDGED,
  ExceptionStatus.SNOOZED
] as const;

export type ExceptionCaseDetails = {
  errorMessage?: string | null;
  observedForLabel: string;
  policyName: string;
  projectCode: string;
  projectId: string;
  projectName: string;
  scheduleId?: string;
  scopeId: string;
  scopeType: CommitmentScopeType;
  sourceId: string;
  sourceLabel: string;
  sourceType: "RECURRING_EXECUTION" | "TASK";
  summary: string;
  taskStatus?: TaskStatus;
  templateId?: string;
  templateName?: string;
  templateTitle?: string;
  thresholdLabel: string;
};

export type ExceptionCandidate = {
  details: Prisma.InputJsonValue;
  fingerprint: string;
  kind: CommitmentPolicyKind;
  recurringExecutionId: string | null;
  severity: CommitmentSeverity;
  sourcePolicyId: string;
  taskId: string | null;
  title: string;
  workspaceId: string;
};

type ExistingActiveExceptionCase = {
  createdAt: Date;
  details: Prisma.JsonValue;
  fingerprint: string;
  id: string;
  kind: CommitmentPolicyKind;
  openedAt: Date;
  recurringExecutionId: string | null;
  severity: CommitmentSeverity;
  sourcePolicyId: string;
  status: ExceptionStatus;
  taskId: string | null;
  title: string;
};

type SyncTaskSource = CommitmentRiskTask & {
  project: {
    code: string;
    id: string;
    name: string;
  };
  recurringExecution:
    | {
        id: string;
        recurringSchedule: {
          templateId: string;
        };
      }
    | null;
  title: string;
};

type SyncScheduleSource = CommitmentRiskSchedule & {
  project: {
    code: string;
    id: string;
    name: string;
  };
  template: {
    id: string;
    name: string;
    title: string;
  };
};

export type ExceptionCaseRiskRecord = {
  details: Prisma.JsonValue;
  id: string;
  kind: CommitmentPolicyKind;
  recurringExecutionId: string | null;
  severity: CommitmentSeverity;
  sourcePolicy: {
    id: string;
    name: string;
    scopeId: string;
    scopeType: CommitmentScopeType;
  };
  sourcePolicyId: string;
  taskId: string | null;
};

type LedgerReconciliationPlan = {
  casesToCreate: ExceptionCandidate[];
  casesToRefresh: Array<{
    candidate: ExceptionCandidate;
    caseId: string;
  }>;
  caseIdsToResolve: string[];
  createdCount: number;
  openCount: number;
  resolvedCount: number;
  updatedCount: number;
};

export function getExceptionCaseDetails(
  details: Prisma.JsonValue | null | undefined
): ExceptionCaseDetails | null {
  if (!details || Array.isArray(details) || typeof details !== "object") {
    return null;
  }

  return details as unknown as ExceptionCaseDetails;
}

export function buildExceptionFingerprint(input: {
  kind: CommitmentPolicyKind;
  recurringExecutionId?: string | null;
  sourcePolicyId: string;
  taskId?: string | null;
}) {
  const sourceKey = input.taskId
    ? `task:${input.taskId}`
    : `recurring-execution:${input.recurringExecutionId ?? "missing"}`;

  return `${input.sourcePolicyId}:${input.kind}:${sourceKey}`;
}

function getExceptionTitle(input: {
  kind: CommitmentPolicyKind;
  sourceLabel: string;
}) {
  return `${commitmentPolicyKindLabels[input.kind]}: ${input.sourceLabel}`;
}

function buildTaskExceptionCandidates(input: {
  now: Date;
  policies: CommitmentPolicyRecord[];
  tasks: SyncTaskSource[];
}) {
  const candidates: ExceptionCandidate[] = [];

  for (const task of input.tasks) {
    const risk = evaluateTaskCommitmentRisk({
      now: input.now,
      policies: input.policies,
      task
    });

    for (const hit of risk.hits) {
      candidates.push({
        workspaceId: input.policies[0]?.workspaceId ?? "",
        fingerprint: buildExceptionFingerprint({
          kind: hit.kind,
          sourcePolicyId: hit.policyId,
          taskId: task.id
        }),
        kind: hit.kind,
        severity: hit.severity,
        sourcePolicyId: hit.policyId,
        taskId: task.id,
        recurringExecutionId: null,
        title: getExceptionTitle({
          kind: hit.kind,
          sourceLabel: task.title
        }),
        details: {
          observedForLabel: hit.observedForLabel,
          policyName: hit.policyName,
          projectCode: task.project.code,
          projectId: task.project.id,
          projectName: task.project.name,
          scopeId: hit.scopeId,
          scopeType: hit.scopeType,
          sourceId: task.id,
          sourceLabel: task.title,
          sourceType: "TASK",
          summary: hit.summary,
          taskStatus: task.status,
          thresholdLabel: hit.thresholdLabel
        } satisfies ExceptionCaseDetails
      });
    }
  }

  return candidates;
}

function buildRecurringExceptionCandidates(input: {
  now: Date;
  policies: CommitmentPolicyRecord[];
  schedules: SyncScheduleSource[];
}) {
  const candidates: ExceptionCandidate[] = [];

  for (const schedule of input.schedules) {
    const risk = evaluateRecurringScheduleCommitmentRisk({
      now: input.now,
      policies: input.policies,
      schedule
    });

    for (const hit of risk.hits) {
      if (!schedule.latestExecution) {
        continue;
      }

      candidates.push({
        workspaceId: input.policies[0]?.workspaceId ?? "",
        fingerprint: buildExceptionFingerprint({
          kind: hit.kind,
          recurringExecutionId: schedule.latestExecution.id,
          sourcePolicyId: hit.policyId
        }),
        kind: hit.kind,
        severity: hit.severity,
        sourcePolicyId: hit.policyId,
        taskId: null,
        recurringExecutionId: schedule.latestExecution.id,
        title: getExceptionTitle({
          kind: hit.kind,
          sourceLabel: schedule.template.name
        }),
        details: {
          errorMessage: schedule.latestExecution.errorMessage,
          observedForLabel: hit.observedForLabel,
          policyName: hit.policyName,
          projectCode: schedule.project.code,
          projectId: schedule.project.id,
          projectName: schedule.project.name,
          scheduleId: schedule.id,
          scopeId: hit.scopeId,
          scopeType: hit.scopeType,
          sourceId: schedule.latestExecution.id,
          sourceLabel: schedule.template.name,
          sourceType: "RECURRING_EXECUTION",
          summary: hit.summary,
          templateId: schedule.template.id,
          templateName: schedule.template.name,
          templateTitle: schedule.template.title,
          thresholdLabel: hit.thresholdLabel
        } satisfies ExceptionCaseDetails
      });
    }
  }

  return candidates;
}

export function buildExceptionCandidates(input: {
  now: Date;
  policies: CommitmentPolicyRecord[];
  schedules: SyncScheduleSource[];
  tasks: SyncTaskSource[];
  workspaceId: string;
}) {
  const taskCandidates = buildTaskExceptionCandidates({
    now: input.now,
    policies: input.policies,
    tasks: input.tasks
  }).map((candidate) => ({
    ...candidate,
    workspaceId: input.workspaceId
  }));
  const recurringCandidates = buildRecurringExceptionCandidates({
    now: input.now,
    policies: input.policies,
    schedules: input.schedules
  }).map((candidate) => ({
    ...candidate,
    workspaceId: input.workspaceId
  }));

  return [...taskCandidates, ...recurringCandidates];
}

function shouldRefreshActiveCase(input: {
  candidate: ExceptionCandidate;
  existingCase: ExistingActiveExceptionCase;
}) {
  return (
    input.candidate.kind !== input.existingCase.kind ||
    input.candidate.severity !== input.existingCase.severity ||
    input.candidate.sourcePolicyId !== input.existingCase.sourcePolicyId ||
    input.candidate.taskId !== input.existingCase.taskId ||
    input.candidate.recurringExecutionId !== input.existingCase.recurringExecutionId ||
    input.candidate.title !== input.existingCase.title ||
    JSON.stringify(input.candidate.details) !==
      JSON.stringify(input.existingCase.details)
  );
}

export function planExceptionLedgerReconciliation(input: {
  candidates: ExceptionCandidate[];
  existingCases: ExistingActiveExceptionCase[];
}) {
  const existingByFingerprint = new Map<string, ExistingActiveExceptionCase[]>();

  for (const existingCase of input.existingCases) {
    const bucket = existingByFingerprint.get(existingCase.fingerprint) ?? [];
    bucket.push(existingCase);
    existingByFingerprint.set(existingCase.fingerprint, bucket);
  }

  const caseIdsToResolve = new Set<string>();
  const dedupedExistingByFingerprint = new Map<string, ExistingActiveExceptionCase>();

  for (const [fingerprint, cases] of existingByFingerprint.entries()) {
    const [caseToKeep, ...duplicates] = [...cases].sort((left, right) => {
      const openedAtDelta = left.openedAt.getTime() - right.openedAt.getTime();

      if (openedAtDelta !== 0) {
        return openedAtDelta;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    });

    dedupedExistingByFingerprint.set(fingerprint, caseToKeep);

    for (const duplicate of duplicates) {
      caseIdsToResolve.add(duplicate.id);
    }
  }

  const casesToCreate: ExceptionCandidate[] = [];
  const casesToRefresh: Array<{
    candidate: ExceptionCandidate;
    caseId: string;
  }> = [];
  const matchedFingerprints = new Set<string>();

  for (const candidate of input.candidates) {
    const existingCase = dedupedExistingByFingerprint.get(candidate.fingerprint);

    if (!existingCase) {
      casesToCreate.push(candidate);
      continue;
    }

    matchedFingerprints.add(candidate.fingerprint);

    if (
      shouldRefreshActiveCase({
        candidate,
        existingCase
      })
    ) {
      casesToRefresh.push({
        candidate,
        caseId: existingCase.id
      });
    }
  }

  for (const [fingerprint, existingCase] of dedupedExistingByFingerprint.entries()) {
    if (!matchedFingerprints.has(fingerprint)) {
      caseIdsToResolve.add(existingCase.id);
    }
  }

  return {
    casesToCreate,
    casesToRefresh,
    caseIdsToResolve: [...caseIdsToResolve],
    createdCount: casesToCreate.length,
    openCount: input.candidates.length,
    resolvedCount: caseIdsToResolve.size,
    updatedCount: casesToRefresh.length
  } satisfies LedgerReconciliationPlan;
}

export function buildCommitmentRiskMetadataFromExceptionCases(
  cases: ExceptionCaseRiskRecord[]
) {
  return buildCommitmentRiskMetadata(
    cases.flatMap((exceptionCase) => {
      const details = getExceptionCaseDetails(exceptionCase.details);

      if (!details) {
        return [];
      }

      return [
        {
          policyId: exceptionCase.sourcePolicyId,
          policyName: exceptionCase.sourcePolicy.name,
          kind: exceptionCase.kind,
          severity: exceptionCase.severity,
          scopeType: exceptionCase.sourcePolicy.scopeType,
          scopeId: exceptionCase.sourcePolicy.scopeId,
          thresholdLabel: details.thresholdLabel,
          observedForLabel: details.observedForLabel,
          summary: details.summary
        }
      ];
    })
  );
}

export async function syncExceptionLedgerForWorkspace(input: {
  now?: Date;
  workspaceId: string;
}) {
  const now = input.now ?? new Date();
  const expiredSnoozedCases = await prisma.exceptionCase.findMany({
    where: {
      workspaceId: input.workspaceId,
      status: ExceptionStatus.SNOOZED,
      snoozedUntil: {
        lte: now
      }
    },
    select: {
      id: true,
      acknowledgedAt: true
    }
  });

  if (expiredSnoozedCases.length > 0) {
    await prisma.$transaction(
      expiredSnoozedCases.map((exceptionCase) =>
        prisma.exceptionCase.update({
          where: {
            id: exceptionCase.id
          },
          data: {
            status: getStatusAfterSnoozeExpires({
              acknowledgedAt: exceptionCase.acknowledgedAt
            }),
            snoozedUntil: null
          }
        })
      )
    );
  }

  const [policies, tasks, schedules, existingCases] = await Promise.all([
    prisma.commitmentPolicy.findMany({
      where: {
        workspaceId: input.workspaceId,
        isActive: true
      },
      orderBy: [{ severity: "desc" }, { name: "asc" }]
    }),
    prisma.task.findMany({
      where: {
        project: {
          workspaceId: input.workspaceId
        },
        status: {
          not: TaskStatus.DONE
        }
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        status: true,
        dueDate: true,
        reviewRequestedAt: true,
        updatedAt: true,
        createdAt: true,
        assigneeId: true,
        project: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        recurringExecution: {
          select: {
            id: true,
            recurringSchedule: {
              select: {
                templateId: true
              }
            }
          }
        }
      }
    }),
    prisma.recurringSchedule.findMany({
      where: {
        workspaceId: input.workspaceId
      },
      select: {
        id: true,
        projectId: true,
        templateId: true,
        project: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        template: {
          select: {
            id: true,
            name: true,
            title: true
          }
        },
        executions: {
          orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: {
            id: true,
            status: true,
            startedAt: true,
            finishedAt: true,
            errorMessage: true
          }
        }
      }
    }),
    prisma.exceptionCase.findMany({
      where: {
        workspaceId: input.workspaceId,
        status: {
          in: [...activeExceptionStatuses]
        }
      },
      select: {
        id: true,
        fingerprint: true,
        kind: true,
        severity: true,
        sourcePolicyId: true,
        taskId: true,
        recurringExecutionId: true,
        title: true,
        details: true,
        status: true,
        openedAt: true,
        createdAt: true
      }
    })
  ]);

  const candidates = buildExceptionCandidates({
    now,
    policies,
    schedules: schedules.map((schedule) => ({
      id: schedule.id,
      latestExecution: schedule.executions[0] ?? null,
      project: schedule.project,
      projectId: schedule.projectId,
      template: schedule.template,
      templateId: schedule.templateId
    })),
    tasks,
    workspaceId: input.workspaceId
  });

  const plan = planExceptionLedgerReconciliation({
    candidates,
    existingCases
  });

  if (
    plan.casesToCreate.length === 0 &&
    plan.casesToRefresh.length === 0 &&
    plan.caseIdsToResolve.length === 0
  ) {
    return plan;
  }

  await prisma.$transaction(async (tx) => {
    const existingCasesById = new Map(
      existingCases.map((existingCase) => [existingCase.id, existingCase])
    );
    const managerRecipients =
      plan.casesToCreate.some(
        (candidate) => candidate.severity === CommitmentSeverity.CRITICAL
      )
        ? await getExceptionManagerRecipients(tx, input.workspaceId)
        : [];

    if (plan.caseIdsToResolve.length > 0) {
      await tx.exceptionCase.updateMany({
        where: {
          id: {
            in: plan.caseIdsToResolve
          }
        },
        data: {
          status: ExceptionStatus.RESOLVED,
          snoozedUntil: null,
          resolvedAt: now,
          resolutionKind: ExceptionResolutionKind.AUTO
        }
      });

      for (const caseId of plan.caseIdsToResolve) {
        const existingCase = existingCasesById.get(caseId);
        const details = getExceptionCaseDetails(existingCase?.details);

        await createActivityEvent(tx, {
          workspaceId: input.workspaceId,
          projectId: details?.projectId ?? null,
          taskId: existingCase?.taskId ?? null,
          actorId: null,
          type: ActivityEventType.EXCEPTION_CASE_RESOLVED,
          payload: {
            exceptionCaseId: caseId,
            resolutionKind: ExceptionResolutionKind.AUTO,
            summary:
              existingCase?.title
                ? `auto-resolved exception ${existingCase.title} during ledger reconciliation`
                : "auto-resolved an exception during ledger reconciliation"
          }
        });
      }
    }

    for (const entry of plan.casesToRefresh) {
      await tx.exceptionCase.update({
        where: {
          id: entry.caseId
        },
        data: {
          kind: entry.candidate.kind,
          severity: entry.candidate.severity,
          sourcePolicyId: entry.candidate.sourcePolicyId,
          taskId: entry.candidate.taskId,
          recurringExecutionId: entry.candidate.recurringExecutionId,
          title: entry.candidate.title,
          details: entry.candidate.details
        }
      });
    }

    for (const candidate of plan.casesToCreate) {
      const createdCase = await tx.exceptionCase.create({
        data: {
          workspaceId: candidate.workspaceId,
          kind: candidate.kind,
          status: ExceptionStatus.OPEN,
          severity: candidate.severity,
          sourcePolicyId: candidate.sourcePolicyId,
          taskId: candidate.taskId,
          recurringExecutionId: candidate.recurringExecutionId,
          ownerId: null,
          openedAt: now,
          acknowledgedAt: null,
          snoozedUntil: null,
          resolvedAt: null,
          resolutionKind: null,
          fingerprint: candidate.fingerprint,
          title: candidate.title,
          details: candidate.details
        }
      });

      const details = getExceptionCaseDetails(createdCase.details);

      await createActivityEvent(tx, {
        workspaceId: candidate.workspaceId,
        projectId: details?.projectId ?? null,
        taskId: createdCase.taskId,
        actorId: null,
        type: ActivityEventType.EXCEPTION_CASE_OPENED,
        payload: {
          exceptionCaseId: createdCase.id,
          summary: `opened exception ${createdCase.title}`
        },
        notificationUserIds:
          createdCase.severity === CommitmentSeverity.CRITICAL
            ? managerRecipients.map((recipient) => recipient.id)
            : []
      });

      if (
        createdCase.severity === CommitmentSeverity.CRITICAL &&
        managerRecipients.length > 0
      ) {
        const message = buildExceptionEmailMessage({
          event: ExceptionEmailDeliveryEvent.OPENED,
          kind: createdCase.kind,
          policyName: details?.policyName ?? commitmentPolicyKindLabels[createdCase.kind],
          projectCode: details?.projectCode ?? "OPS",
          severity: createdCase.severity,
          sourceSummary: details?.summary ?? createdCase.title,
          title: createdCase.title
        });

        await createExceptionEmailDeliveries(tx, {
          workspaceId: candidate.workspaceId,
          exceptionCaseId: createdCase.id,
          event: ExceptionEmailDeliveryEvent.OPENED,
          recipients: managerRecipients.map((recipient) => ({
            recipientUserId: recipient.id,
            recipientEmail: recipient.email
          })),
          subject: message.subject,
          body: message.body
        });
      }
    }
  });

  return plan;
}

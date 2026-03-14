import {
  CommitmentScopeType,
  CommitmentPolicyKind,
  CommitmentSeverity,
  ExceptionStatus,
  RecurringExecutionStatus,
  TaskStatus
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildCommitmentRiskMetadataFromExceptionCases,
  buildExceptionCandidates,
  buildExceptionFingerprint,
  planExceptionLedgerReconciliation,
  type ExceptionCandidate,
  type ExceptionCaseRiskRecord
} from "@/lib/exception-cases";

const baseTimestamp = new Date("2026-03-10T00:00:00.000Z");

function createPolicy(input: {
  id: string;
  kind: CommitmentPolicyKind;
  name: string;
  scopeId: string;
  scopeType: CommitmentScopeType;
  severity: CommitmentSeverity;
  thresholdHours?: number | null;
  thresholdMinutes?: number | null;
}) {
  return {
    id: input.id,
    workspaceId: "workspace-1",
    name: input.name,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    kind: input.kind,
    thresholdMinutes: input.thresholdMinutes ?? null,
    thresholdHours: input.thresholdHours ?? null,
    severity: input.severity,
    isActive: true,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp
  } as const;
}

function createCandidate(overrides: Partial<ExceptionCandidate> = {}): ExceptionCandidate {
  return {
    workspaceId: "workspace-1",
    fingerprint: "policy-1:OVERDUE:task:task-1",
    kind: CommitmentPolicyKind.OVERDUE,
    severity: CommitmentSeverity.HIGH,
    sourcePolicyId: "policy-1",
    taskId: "task-1",
    recurringExecutionId: null,
    title: "Overdue: Close scanner parity gap for west dock",
    details: {
      observedForLabel: "3h",
      policyName: "Workspace overdue watch",
      projectCode: "OPS-ALPHA",
      projectId: "project-alpha",
      projectName: "Harbor inventory rollout",
      scopeId: "workspace-1",
      scopeType: CommitmentScopeType.WORKSPACE,
      sourceId: "task-1",
      sourceLabel: "Close scanner parity gap for west dock",
      sourceType: "TASK",
      summary: "Past due for 3h against 1h.",
      taskStatus: TaskStatus.IN_PROGRESS,
      thresholdLabel: "1h"
    },
    ...overrides
  };
}

describe("exception ledger candidate building", () => {
  it("creates candidates for the fixed five Phase 2 exception kinds", () => {
    const now = new Date("2026-03-11T08:00:00.000Z");
    const policies = [
      createPolicy({
        id: "policy-overdue",
        kind: CommitmentPolicyKind.OVERDUE,
        name: "Workspace overdue watch",
        scopeType: CommitmentScopeType.WORKSPACE,
        scopeId: "workspace-1",
        thresholdHours: 1,
        severity: CommitmentSeverity.HIGH
      }),
      createPolicy({
        id: "policy-review",
        kind: CommitmentPolicyKind.REVIEW_STALE,
        name: "Retail review stale watch",
        scopeType: CommitmentScopeType.PROJECT,
        scopeId: "project-beta",
        thresholdHours: 24,
        severity: CommitmentSeverity.HIGH
      }),
      createPolicy({
        id: "policy-blocked",
        kind: CommitmentPolicyKind.BLOCKED_STALE,
        name: "Retail blocked stall watch",
        scopeType: CommitmentScopeType.PROJECT,
        scopeId: "project-beta",
        thresholdHours: 4,
        severity: CommitmentSeverity.CRITICAL
      }),
      createPolicy({
        id: "policy-unassigned",
        kind: CommitmentPolicyKind.UNASSIGNED_STALE,
        name: "Workspace unassigned ownership watch",
        scopeType: CommitmentScopeType.WORKSPACE,
        scopeId: "workspace-1",
        thresholdHours: 12,
        severity: CommitmentSeverity.MEDIUM
      }),
      createPolicy({
        id: "policy-recurring",
        kind: CommitmentPolicyKind.RECURRING_FAILED,
        name: "Recovery retry recurring failure watch",
        scopeType: CommitmentScopeType.TEMPLATE,
        scopeId: "template-recovery",
        thresholdHours: 1,
        severity: CommitmentSeverity.CRITICAL
      })
    ];

    const candidates = buildExceptionCandidates({
      now,
      workspaceId: "workspace-1",
      tasks: [
        {
          id: "task-overdue",
          title: "Close scanner parity gap for west dock",
          projectId: "project-alpha",
          status: TaskStatus.IN_PROGRESS,
          dueDate: new Date("2026-03-11T03:00:00.000Z"),
          reviewRequestedAt: null,
          updatedAt: new Date("2026-03-11T04:00:00.000Z"),
          createdAt: new Date("2026-03-10T04:00:00.000Z"),
          assigneeId: "user-1",
          project: {
            id: "project-alpha",
            code: "OPS-ALPHA",
            name: "Harbor inventory rollout"
          },
          recurringExecution: null
        },
        {
          id: "task-review",
          title: "Review partner escalation rollback brief",
          projectId: "project-beta",
          status: TaskStatus.NEEDS_REVIEW,
          dueDate: null,
          reviewRequestedAt: new Date("2026-03-08T08:00:00.000Z"),
          updatedAt: new Date("2026-03-08T08:00:00.000Z"),
          createdAt: new Date("2026-03-07T08:00:00.000Z"),
          assigneeId: "user-1",
          project: {
            id: "project-beta",
            code: "OPS-BETA",
            name: "Retail launch recovery"
          },
          recurringExecution: null
        },
        {
          id: "task-blocked",
          title: "Resolve carrier API dependency",
          projectId: "project-beta",
          status: TaskStatus.BLOCKED,
          dueDate: null,
          reviewRequestedAt: null,
          updatedAt: new Date("2026-03-10T00:00:00.000Z"),
          createdAt: new Date("2026-03-09T00:00:00.000Z"),
          assigneeId: "user-1",
          project: {
            id: "project-beta",
            code: "OPS-BETA",
            name: "Retail launch recovery"
          },
          recurringExecution: null
        },
        {
          id: "task-unassigned",
          title: "Backfill owner for store escalation sheet",
          projectId: "project-beta",
          status: TaskStatus.BACKLOG,
          dueDate: null,
          reviewRequestedAt: null,
          updatedAt: new Date("2026-03-11T02:00:00.000Z"),
          createdAt: new Date("2026-03-10T12:00:00.000Z"),
          assigneeId: null,
          project: {
            id: "project-beta",
            code: "OPS-BETA",
            name: "Retail launch recovery"
          },
          recurringExecution: null
        }
      ],
      schedules: [
        {
          id: "schedule-1",
          projectId: "project-beta",
          templateId: "template-recovery",
          project: {
            id: "project-beta",
            code: "OPS-BETA",
            name: "Retail launch recovery"
          },
          template: {
            id: "template-recovery",
            name: "Recovery retry drill",
            title: "Reissue launch recovery retry packet"
          },
          latestExecution: {
            id: "execution-1",
            status: RecurringExecutionStatus.FAILED,
            startedAt: new Date("2026-03-11T05:00:00.000Z"),
            finishedAt: new Date("2026-03-11T05:00:00.000Z"),
            errorMessage: "Retry packet failed."
          }
        }
      ],
      policies
    });

    expect(candidates).toHaveLength(5);
    expect(candidates.map((candidate) => candidate.kind)).toEqual(
      expect.arrayContaining([
        CommitmentPolicyKind.OVERDUE,
        CommitmentPolicyKind.REVIEW_STALE,
        CommitmentPolicyKind.BLOCKED_STALE,
        CommitmentPolicyKind.UNASSIGNED_STALE,
        CommitmentPolicyKind.RECURRING_FAILED
      ])
    );
    expect(
      candidates.find((candidate) => candidate.kind === CommitmentPolicyKind.OVERDUE)
    ).toMatchObject({
      taskId: "task-overdue",
      fingerprint: buildExceptionFingerprint({
        kind: CommitmentPolicyKind.OVERDUE,
        sourcePolicyId: "policy-overdue",
        taskId: "task-overdue"
      })
    });
  });
});

describe("exception ledger reconciliation", () => {
  it("dedupes duplicate active cases for the same fingerprint", () => {
    const candidate = createCandidate();
    const plan = planExceptionLedgerReconciliation({
      candidates: [candidate],
      existingCases: [
        {
          id: "case-older",
          fingerprint: candidate.fingerprint,
          kind: candidate.kind,
          severity: candidate.severity,
          sourcePolicyId: candidate.sourcePolicyId,
          taskId: candidate.taskId,
          recurringExecutionId: candidate.recurringExecutionId,
          title: candidate.title,
          details: candidate.details as Prisma.JsonValue,
          status: ExceptionStatus.OPEN,
          openedAt: new Date("2026-03-11T02:00:00.000Z"),
          createdAt: new Date("2026-03-11T02:00:00.000Z")
        },
        {
          id: "case-newer",
          fingerprint: candidate.fingerprint,
          kind: candidate.kind,
          severity: candidate.severity,
          sourcePolicyId: candidate.sourcePolicyId,
          taskId: candidate.taskId,
          recurringExecutionId: candidate.recurringExecutionId,
          title: candidate.title,
          details: candidate.details as Prisma.JsonValue,
          status: ExceptionStatus.ACKNOWLEDGED,
          openedAt: new Date("2026-03-11T04:00:00.000Z"),
          createdAt: new Date("2026-03-11T04:00:00.000Z")
        }
      ]
    });

    expect(plan.casesToCreate).toHaveLength(0);
    expect(plan.casesToRefresh).toHaveLength(0);
    expect(plan.caseIdsToResolve).toEqual(["case-newer"]);
    expect(plan.openCount).toBe(1);
  });

  it("creates a new case when no active fingerprint exists", () => {
    const candidate = createCandidate();
    const plan = planExceptionLedgerReconciliation({
      candidates: [candidate],
      existingCases: []
    });

    expect(plan.casesToCreate).toEqual([candidate]);
    expect(plan.caseIdsToResolve).toHaveLength(0);
    expect(plan.createdCount).toBe(1);
  });

  it("auto-resolves active cases when the source condition clears", () => {
    const clearedCase = createCandidate({
      fingerprint: "policy-2:BLOCKED_STALE:task:task-2",
      sourcePolicyId: "policy-2",
      kind: CommitmentPolicyKind.BLOCKED_STALE,
      taskId: "task-2",
      title: "Blocked stale: Resolve carrier API dependency"
    });
    const plan = planExceptionLedgerReconciliation({
      candidates: [],
      existingCases: [
        {
          id: "case-cleared",
          fingerprint: clearedCase.fingerprint,
          kind: clearedCase.kind,
          severity: clearedCase.severity,
          sourcePolicyId: clearedCase.sourcePolicyId,
          taskId: clearedCase.taskId,
          recurringExecutionId: clearedCase.recurringExecutionId,
          title: clearedCase.title,
          details: clearedCase.details as Prisma.JsonValue,
          status: ExceptionStatus.OPEN,
          openedAt: new Date("2026-03-11T01:00:00.000Z"),
          createdAt: new Date("2026-03-11T01:00:00.000Z")
        }
      ]
    });

    expect(plan.casesToCreate).toHaveLength(0);
    expect(plan.caseIdsToResolve).toEqual(["case-cleared"]);
    expect(plan.resolvedCount).toBe(1);
  });

  it("rebuilds UI risk metadata from active exception cases", () => {
    const risk = buildCommitmentRiskMetadataFromExceptionCases([
      {
        id: "case-1",
        kind: CommitmentPolicyKind.OVERDUE,
        severity: CommitmentSeverity.HIGH,
        sourcePolicyId: "policy-overdue",
        taskId: "task-1",
        recurringExecutionId: null,
        details: {
      observedForLabel: "3h",
      policyName: "Workspace overdue watch",
          projectCode: "OPS-ALPHA",
          projectId: "project-alpha",
          projectName: "Harbor inventory rollout",
          scopeId: "workspace-1",
          scopeType: CommitmentScopeType.WORKSPACE,
          sourceId: "task-1",
          sourceLabel: "Close scanner parity gap for west dock",
          sourceType: "TASK",
          summary: "Past due for 3h against 1h.",
          thresholdLabel: "1h"
        },
        sourcePolicy: {
          id: "policy-overdue",
          name: "Workspace overdue watch",
          scopeId: "workspace-1",
          scopeType: CommitmentScopeType.WORKSPACE
        }
      } satisfies ExceptionCaseRiskRecord
    ]);

    expect(risk.highestSeverity).toBe("HIGH");
    expect(risk.summary).toBe("Past due for 3h against 1h.");
    expect(risk.hits[0]).toMatchObject({
      policyName: "Workspace overdue watch",
      kind: CommitmentPolicyKind.OVERDUE
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  buildCommitmentRiskMetadata,
  evaluateRecurringScheduleCommitmentRisk,
  evaluateTaskCommitmentRisk,
  formatCommitmentPolicyThreshold
} from "@/lib/commitment-policies";
import { parseCommitmentPolicyFormData } from "@/lib/validation";

function createFormData(values: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("commitment policy validation", () => {
  it("accepts a valid project-scoped commitment policy", () => {
    const parsed = parseCommitmentPolicyFormData(
      createFormData({
        name: "Retail review stale watch",
        scopeType: "PROJECT",
        projectScopeId: "cm8opsdemo0000000000000101",
        templateScopeId: "",
        kind: "REVIEW_STALE",
        thresholdUnit: "hours",
        thresholdValue: "24",
        severity: "HIGH",
        isActive: "on"
      })
    );

    expect(parsed.success).toBe(true);
  });

  it("rejects a template-scoped policy without a template binding", () => {
    const parsed = parseCommitmentPolicyFormData(
      createFormData({
        name: "Template failure watch",
        scopeType: "TEMPLATE",
        projectScopeId: "",
        templateScopeId: "",
        kind: "RECURRING_FAILED",
        thresholdUnit: "hours",
        thresholdValue: "1",
        severity: "CRITICAL",
        isActive: "on"
      })
    );

    expect(parsed.success).toBe(false);
  });
});

describe("commitment risk evaluation", () => {
  const workspaceOverduePolicy = {
    id: "policy-overdue",
    workspaceId: "workspace-1",
    name: "Workspace overdue watch",
    scopeType: "WORKSPACE" as const,
    scopeId: "workspace-1",
    kind: "OVERDUE" as const,
    thresholdMinutes: null,
    thresholdHours: 1,
    severity: "HIGH" as const,
    isActive: true,
    createdAt: new Date("2026-03-10T00:00:00.000Z"),
    updatedAt: new Date("2026-03-10T00:00:00.000Z")
  };

  it("flags overdue work only after the policy threshold passes", () => {
    const risk = evaluateTaskCommitmentRisk({
      now: new Date("2026-03-11T08:00:00.000Z"),
      policies: [workspaceOverduePolicy],
      task: {
        id: "task-1",
        projectId: "project-1",
        status: "IN_PROGRESS",
        dueDate: new Date("2026-03-11T06:00:00.000Z"),
        reviewRequestedAt: null,
        updatedAt: new Date("2026-03-11T06:30:00.000Z"),
        createdAt: new Date("2026-03-10T06:00:00.000Z"),
        assigneeId: "user-1",
        recurringExecution: null
      }
    });

    expect(risk.highestSeverity).toBe("HIGH");
    expect(risk.hits[0]).toMatchObject({
      kind: "OVERDUE",
      thresholdLabel: "1h"
    });
  });

  it("binds project-scoped review policies only to matching project work", () => {
    const projectPolicy = {
      ...workspaceOverduePolicy,
      id: "policy-review",
      name: "Alpha review stale watch",
      scopeType: "PROJECT" as const,
      scopeId: "project-alpha",
      kind: "REVIEW_STALE" as const,
      thresholdMinutes: 30,
      thresholdHours: null,
      severity: "MEDIUM" as const
    };

    const matchingRisk = evaluateTaskCommitmentRisk({
      now: new Date("2026-03-11T08:00:00.000Z"),
      policies: [projectPolicy],
      task: {
        id: "task-alpha",
        projectId: "project-alpha",
        status: "NEEDS_REVIEW",
        dueDate: null,
        reviewRequestedAt: new Date("2026-03-11T06:30:00.000Z"),
        updatedAt: new Date("2026-03-11T06:30:00.000Z"),
        createdAt: new Date("2026-03-11T05:00:00.000Z"),
        assigneeId: "user-1",
        recurringExecution: null
      }
    });

    const nonMatchingRisk = evaluateTaskCommitmentRisk({
      now: new Date("2026-03-11T08:00:00.000Z"),
      policies: [projectPolicy],
      task: {
        id: "task-beta",
        projectId: "project-beta",
        status: "NEEDS_REVIEW",
        dueDate: null,
        reviewRequestedAt: new Date("2026-03-11T06:30:00.000Z"),
        updatedAt: new Date("2026-03-11T06:30:00.000Z"),
        createdAt: new Date("2026-03-11T05:00:00.000Z"),
        assigneeId: "user-1",
        recurringExecution: null
      }
    });

    expect(matchingRisk.hits).toHaveLength(1);
    expect(nonMatchingRisk.hits).toHaveLength(0);
  });

  it("binds recurring failure risk to the matching template scope", () => {
    const recurringFailurePolicy = {
      ...workspaceOverduePolicy,
      id: "policy-recurring",
      name: "Recovery retry recurring failure watch",
      scopeType: "TEMPLATE" as const,
      scopeId: "template-recovery",
      kind: "RECURRING_FAILED" as const,
      thresholdMinutes: null,
      thresholdHours: 1,
      severity: "CRITICAL" as const
    };

    const risk = evaluateRecurringScheduleCommitmentRisk({
      now: new Date("2026-03-11T08:00:00.000Z"),
      policies: [recurringFailurePolicy],
      schedule: {
        id: "schedule-1",
        projectId: "project-beta",
        templateId: "template-recovery",
        latestExecution: {
          id: "execution-1",
          status: "FAILED",
          startedAt: new Date("2026-03-11T04:00:00.000Z"),
          finishedAt: new Date("2026-03-11T04:00:00.000Z"),
          errorMessage: "Retry packet failed."
        }
      }
    });

    expect(risk.highestSeverity).toBe("CRITICAL");
    expect(risk.hits[0].policyName).toBe(
      "Recovery retry recurring failure watch"
    );
  });

  it("formats thresholds and summaries for UI metadata", () => {
    expect(formatCommitmentPolicyThreshold(workspaceOverduePolicy)).toBe("1h");
    expect(
      buildCommitmentRiskMetadata([
        {
          policyId: "policy-overdue",
          policyName: "Workspace overdue watch",
          kind: "OVERDUE",
          severity: "HIGH",
          scopeType: "WORKSPACE",
          scopeId: "workspace-1",
          thresholdLabel: "1h",
          observedForLabel: "2h",
          summary: "Past due for 2h against 1h."
        }
      ]).summary
    ).toBe("Past due for 2h against 1h.");
  });
});

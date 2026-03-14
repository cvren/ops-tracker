import {
  ExceptionEmailDeliveryEvent,
  ExceptionResolutionKind,
  ExceptionStatus,
  WorkspaceRole,
  type CommitmentPolicyKind,
  type CommitmentSeverity,
  type Prisma
} from "@prisma/client";

import {
  commitmentPolicyKindLabels,
  commitmentSeverityLabels
} from "@/lib/constants";

type Tx = Prisma.TransactionClient;

export const exceptionSnoozePresetOptions = [
  { value: "1", label: "1 hour" },
  { value: "4", label: "4 hours" },
  { value: "24", label: "24 hours" },
  { value: "72", label: "72 hours" }
] as const;

export type ExceptionResponseIntent =
  | "acknowledge"
  | "assign-owner"
  | "resolve"
  | "snooze";

export function buildSnoozedUntil(input: {
  now: Date;
  snoozeHours: number;
}) {
  return new Date(input.now.getTime() + input.snoozeHours * 60 * 60 * 1000);
}

export function buildExceptionCaseTransition(input: {
  currentAcknowledgedAt: Date | null;
  intent: ExceptionResponseIntent;
  now: Date;
  ownerId?: string | null;
  snoozeHours?: number;
}) {
  switch (input.intent) {
    case "acknowledge":
      return {
        status: ExceptionStatus.ACKNOWLEDGED,
        acknowledgedAt: input.currentAcknowledgedAt ?? input.now,
        snoozedUntil: null,
        resolvedAt: null,
        resolutionKind: null
      };
    case "assign-owner":
      return {
        ownerId: input.ownerId ?? null
      };
    case "resolve":
      return {
        status: ExceptionStatus.RESOLVED,
        snoozedUntil: null,
        resolvedAt: input.now,
        resolutionKind: ExceptionResolutionKind.MANUAL
      };
    case "snooze":
      return {
        status: ExceptionStatus.SNOOZED,
        acknowledgedAt: input.currentAcknowledgedAt ?? input.now,
        snoozedUntil: buildSnoozedUntil({
          now: input.now,
          snoozeHours: input.snoozeHours ?? 0
        }),
        resolvedAt: null,
        resolutionKind: null
      };
  }
}

export function getStatusAfterSnoozeExpires(input: {
  acknowledgedAt: Date | null;
}) {
  return input.acknowledgedAt
    ? ExceptionStatus.ACKNOWLEDGED
    : ExceptionStatus.OPEN;
}

export function buildExceptionResponseSummary(input: {
  intent: ExceptionResponseIntent;
  ownerName?: string | null;
  snoozeHours?: number;
  title: string;
}) {
  switch (input.intent) {
    case "acknowledge":
      return `acknowledged exception ${input.title}`;
    case "assign-owner":
      return `assigned exception ${input.title} to ${input.ownerName ?? "the selected owner"}`;
    case "resolve":
      return `resolved exception ${input.title} manually`;
    case "snooze":
      return `snoozed exception ${input.title} for ${input.snoozeHours ?? 0}h`;
  }
}

export function buildExceptionEmailMessage(input: {
  event: ExceptionEmailDeliveryEvent;
  kind: CommitmentPolicyKind;
  policyName: string;
  projectCode: string;
  severity: CommitmentSeverity;
  sourceSummary: string;
  title: string;
}) {
  const prefix =
    input.event === ExceptionEmailDeliveryEvent.OPENED
      ? `[Ops Tracker] ${commitmentSeverityLabels[input.severity]} exception opened`
      : "[Ops Tracker] Exception assigned";
  const subject = `${prefix} · ${input.projectCode}`;
  const intro =
    input.event === ExceptionEmailDeliveryEvent.OPENED
      ? "A new critical exception was opened from the commitment ledger."
      : "An open exception was assigned for follow-up.";

  return {
    subject,
    body: [
      intro,
      "",
      `Title: ${input.title}`,
      `Kind: ${commitmentPolicyKindLabels[input.kind]}`,
      `Severity: ${commitmentSeverityLabels[input.severity]}`,
      `Policy: ${input.policyName}`,
      `Project: ${input.projectCode}`,
      "",
      input.sourceSummary
    ].join("\n")
  };
}

export async function createExceptionEmailDeliveries(
  tx: Tx,
  input: {
    body: string;
    event: ExceptionEmailDeliveryEvent;
    exceptionCaseId: string;
    recipients: Array<{
      recipientEmail: string;
      recipientUserId?: string | null;
    }>;
    subject: string;
    workspaceId: string;
  }
) {
  if (input.recipients.length === 0) {
    return 0;
  }

  await tx.exceptionEmailDelivery.createMany({
    data: input.recipients.map((recipient) => ({
      workspaceId: input.workspaceId,
      exceptionCaseId: input.exceptionCaseId,
      event: input.event,
      recipientUserId: recipient.recipientUserId ?? null,
      recipientEmail: recipient.recipientEmail,
      subject: input.subject,
      body: input.body
    }))
  });

  return input.recipients.length;
}

export async function getExceptionManagerRecipients(
  tx: Tx,
  workspaceId: string
) {
  const memberships = await tx.membership.findMany({
    where: {
      workspaceId,
      role: {
        in: [WorkspaceRole.ADMIN, WorkspaceRole.MANAGER]
      }
    },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    select: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  return memberships.map((membership) => membership.user);
}

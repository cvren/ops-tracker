import {
  CommitmentPolicyKind,
  CommitmentSeverity,
  ExceptionResolutionKind,
  ExceptionStatus,
  ExceptionEmailDeliveryEvent
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildExceptionCaseTransition,
  buildExceptionEmailMessage,
  getStatusAfterSnoozeExpires
} from "@/lib/exception-response";

describe("exception response transitions", () => {
  it("moves an open case into acknowledged state", () => {
    const now = new Date("2026-03-14T09:00:00.000Z");
    const transition = buildExceptionCaseTransition({
      currentAcknowledgedAt: null,
      intent: "acknowledge",
      now
    });

    expect(transition).toMatchObject({
      status: ExceptionStatus.ACKNOWLEDGED,
      acknowledgedAt: now,
      snoozedUntil: null,
      resolvedAt: null,
      resolutionKind: null
    });
  });

  it("snoozes with a durable until timestamp and reopens into acknowledged", () => {
    const now = new Date("2026-03-14T09:00:00.000Z");
    const acknowledgedAt = new Date("2026-03-14T08:30:00.000Z");
    const transition = buildExceptionCaseTransition({
      currentAcknowledgedAt: acknowledgedAt,
      intent: "snooze",
      now,
      snoozeHours: 24
    });

    expect(transition.status).toBe(ExceptionStatus.SNOOZED);
    expect(transition.snoozedUntil?.toISOString()).toBe(
      "2026-03-15T09:00:00.000Z"
    );
    expect(
      getStatusAfterSnoozeExpires({
        acknowledgedAt
      })
    ).toBe(ExceptionStatus.ACKNOWLEDGED);
  });

  it("marks manual resolve with a manual resolution kind", () => {
    const now = new Date("2026-03-14T09:00:00.000Z");
    const transition = buildExceptionCaseTransition({
      currentAcknowledgedAt: new Date("2026-03-14T08:00:00.000Z"),
      intent: "resolve",
      now
    });

    expect(transition).toMatchObject({
      status: ExceptionStatus.RESOLVED,
      resolvedAt: now,
      resolutionKind: ExceptionResolutionKind.MANUAL,
      snoozedUntil: null
    });
  });
});

describe("exception email delivery messages", () => {
  it("builds the bounded email subject and body for opened critical cases", () => {
    const message = buildExceptionEmailMessage({
      event: ExceptionEmailDeliveryEvent.OPENED,
      kind: CommitmentPolicyKind.BLOCKED_STALE,
      policyName: "Retail blocked stall watch",
      projectCode: "OPS-BETA",
      severity: CommitmentSeverity.CRITICAL,
      sourceSummary: "Blocked for 11h against the 4h commitment.",
      title: "Blocked stale: Resolve carrier API dependency"
    });

    expect(message.subject).toBe(
      "[Ops Tracker] Critical exception opened · OPS-BETA"
    );
    expect(message.body).toContain("Retail blocked stall watch");
    expect(message.body).toContain("Blocked for 11h against the 4h commitment.");
  });
});

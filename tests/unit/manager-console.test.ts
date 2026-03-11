import { describe, expect, it } from "vitest";

import {
  buildAgingBuckets,
  buildWorkloadByMember,
  getDueNextSevenDaysCount,
  getDueTodayCount,
  getBulkUpdateSummary,
  isStaleReviewTask
} from "@/lib/manager-console";

describe("manager console helpers", () => {
  it("groups open work into aging buckets", () => {
    const buckets = buildAgingBuckets(
      [
        { status: "IN_PROGRESS", updatedAt: new Date("2026-03-10T00:00:00.000Z") },
        { status: "BLOCKED", updatedAt: new Date("2026-03-06T00:00:00.000Z") },
        { status: "NEEDS_REVIEW", updatedAt: new Date("2026-02-28T00:00:00.000Z") },
        { status: "DONE", updatedAt: new Date("2026-02-20T00:00:00.000Z") }
      ],
      new Date("2026-03-11T00:00:00.000Z")
    );

    expect(buckets).toEqual([
      expect.objectContaining({ key: "fresh", count: 1 }),
      expect.objectContaining({ key: "watch", count: 1 }),
      expect.objectContaining({ key: "stale", count: 1 })
    ]);
  });

  it("summarizes workload skew by member", () => {
    const workload = buildWorkloadByMember(
      [
        { id: "admin-1", name: "Aiko", role: "ADMIN" },
        { id: "member-1", name: "Ken", role: "MEMBER" },
        { id: "reviewer-1", name: "Mika", role: "MEMBER" }
      ],
      [
        {
          assigneeId: "member-1",
          reviewerId: "reviewer-1",
          dueDate: new Date("2026-03-10T12:00:00.000Z"),
          status: "IN_PROGRESS"
        },
        {
          assigneeId: "member-1",
          reviewerId: "reviewer-1",
          dueDate: new Date("2026-03-15T12:00:00.000Z"),
          status: "BLOCKED"
        },
        {
          assigneeId: "admin-1",
          reviewerId: "reviewer-1",
          dueDate: new Date("2026-03-17T12:00:00.000Z"),
          status: "IN_PROGRESS"
        },
        {
          assigneeId: "member-1",
          reviewerId: "reviewer-1",
          dueDate: new Date("2026-03-18T12:00:00.000Z"),
          status: "NEEDS_REVIEW"
        }
      ],
      new Date("2026-03-11T00:00:00.000Z")
    );

    expect(workload[0]).toMatchObject({
      id: "member-1",
      openCount: 3,
      overdueCount: 1,
      blockedCount: 1
    });
    expect(workload[1]).toMatchObject({
      id: "reviewer-1",
      reviewQueueCount: 1
    });
  });

  it("counts due today and due in the next seven days separately", () => {
    const tasks = [
      {
        dueDate: new Date("2026-03-11T12:00:00.000Z"),
        status: "IN_PROGRESS"
      },
      {
        dueDate: new Date("2026-03-12T12:00:00.000Z"),
        status: "IN_PROGRESS"
      },
      {
        dueDate: new Date("2026-03-18T11:59:59.000Z"),
        status: "NEEDS_REVIEW"
      },
      {
        dueDate: new Date("2026-03-19T12:00:00.000Z"),
        status: "IN_PROGRESS"
      },
      {
        dueDate: new Date("2026-03-11T12:00:00.000Z"),
        status: "DONE"
      }
    ] as const;

    const now = new Date("2026-03-11T08:00:00.000Z");

    expect(getDueTodayCount(tasks, now)).toBe(1);
    expect(getDueNextSevenDaysCount(tasks, now)).toBe(2);
  });

  it("flags stale review work after the review window passes", () => {
    expect(
      isStaleReviewTask(
        {
          status: "NEEDS_REVIEW",
          reviewRequestedAt: new Date("2026-03-08T00:00:00.000Z"),
          updatedAt: new Date("2026-03-10T00:00:00.000Z")
        },
        new Date("2026-03-11T08:00:00.000Z")
      )
    ).toBe(true);

    expect(
      isStaleReviewTask(
        {
          status: "NEEDS_REVIEW",
          reviewRequestedAt: new Date("2026-03-10T12:00:00.000Z"),
          updatedAt: new Date("2026-03-10T12:00:00.000Z")
        },
        new Date("2026-03-11T08:00:00.000Z")
      )
    ).toBe(false);
  });

  it("builds a readable bulk update summary", () => {
    expect(getBulkUpdateSummary(["owner"])).toBe("bulk updated owner");
    expect(getBulkUpdateSummary(["owner", "reviewer"])).toBe(
      "bulk updated owner and reviewer"
    );
  });
});

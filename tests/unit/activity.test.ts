import { describe, expect, it, vi } from "vitest";

import {
  createActivityEvent,
  getActivitySummary,
  getTaskTransitionActivityDescriptor,
  resolveTaskCommentNotificationRecipients,
  summarizeChangedFields,
  uniqueUserIds
} from "@/lib/activity";

describe("activity helpers", () => {
  it("deduplicates recipients and excludes the actor", () => {
    expect(
      uniqueUserIds(["user-1", "user-2", "user-2", null], "user-1")
    ).toEqual(["user-2"]);
  });

  it("splits comment recipients from mention recipients", () => {
    expect(
      resolveTaskCommentNotificationRecipients({
        task: {
          assigneeId: "assignee-1",
          reviewerId: "reviewer-1",
          createdById: "creator-1"
        },
        mentionedUserIds: ["reviewer-1", "manager-1", "manager-1"],
        authorId: "creator-1"
      })
    ).toEqual({
      commentUserIds: ["assignee-1"],
      mentionUserIds: ["reviewer-1", "manager-1"]
    });
  });

  it("describes review and blocked transitions with notification targets", () => {
    expect(
      getTaskTransitionActivityDescriptor({
        eventType: "TASK_REVIEW_REQUESTED",
        task: {
          assigneeId: "assignee-1",
          reviewerId: "reviewer-1",
          createdById: "creator-1",
          blockedReason: null,
          reviewer: { name: "Mika Reviewer" }
        },
        currentStatus: "In progress",
        nextStatus: "Needs review"
      })
    ).toEqual({
      summary: "requested review from Mika Reviewer",
      notificationUserIds: ["reviewer-1"]
    });

    expect(
      getTaskTransitionActivityDescriptor({
        eventType: "TASK_BLOCKED",
        task: {
          assigneeId: "assignee-1",
          reviewerId: "reviewer-1",
          createdById: "creator-1",
          blockedReason: "Waiting on dependency",
          reviewer: { name: "Mika Reviewer" }
        },
        currentStatus: "In progress",
        nextStatus: "Blocked"
      })
    ).toEqual({
      summary: "blocked the task: Waiting on dependency",
      notificationUserIds: ["reviewer-1", "creator-1"]
    });
  });

  it("creates activity events and deduplicated notifications", async () => {
    const event = { id: "event-1" };
    const tx = {
      activityEvent: {
        create: vi.fn().mockResolvedValue(event)
      },
      notification: {
        createMany: vi.fn().mockResolvedValue({ count: 2 })
      }
    } as const;

    const result = await createActivityEvent(tx as never, {
      workspaceId: "workspace-1",
      projectId: "project-1",
      taskId: "task-1",
      actorId: "actor-1",
      type: "COMMENT_CREATED",
      payload: {
        summary: "commented on the task"
      },
      notificationUserIds: ["actor-1", "user-2", "user-2", "user-3"]
    });

    expect(result).toBe(event);
    expect(tx.activityEvent.create).toHaveBeenCalledOnce();
    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "user-2", activityEventId: "event-1" },
        { userId: "user-3", activityEventId: "event-1" }
      ],
      skipDuplicates: true
    });
  });

  it("summarizes field changes and extracts payload summaries", () => {
    expect(summarizeChangedFields(["title"])).toBe("updated title");
    expect(summarizeChangedFields(["title", "priority"])).toBe(
      "updated title and priority"
    );
    expect(
      getActivitySummary({ summary: "mentioned Mika Reviewer in a comment" })
    ).toBe("mentioned Mika Reviewer in a comment");
  });
});

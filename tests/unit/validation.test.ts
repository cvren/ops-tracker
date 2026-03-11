import { describe, expect, it } from "vitest";

import {
  normalizeDueDate,
  parseBulkTaskUpdateFormData,
  parseCommentFormData,
  parseCreateTaskFromTemplateFormData,
  parseProjectFormData,
  parseRecurringScheduleFormData,
  parseTaskFormData,
  parseTaskTemplateFormData,
  taskStatusUpdateSchema
} from "@/lib/validation";

function createFormData(values: Record<string, string | string[]>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        formData.append(key, item);
      }
      continue;
    }

    formData.set(key, value);
  }

  return formData;
}

describe("project validation", () => {
  it("accepts a complete project payload", () => {
    const parsed = parseProjectFormData(
      createFormData({
        name: "Warehouse rollout",
        code: "OPS-42",
        description: "Coordinate the final warehouse rollout for the client.",
        status: "ACTIVE"
      })
    );

    expect(parsed.success).toBe(true);
  });

  it("rejects a weak project payload", () => {
    const parsed = parseProjectFormData(
      createFormData({
        name: "A",
        code: "bad code",
        description: "short",
        status: "ACTIVE"
      })
    );

    expect(parsed.success).toBe(false);
  });
});

describe("task validation", () => {
  it("accepts a complete task payload", () => {
    const parsed = parseTaskFormData(
      createFormData({
        projectId: "cm8opsdemo0000000000000000",
        title: "Confirm site handoff",
        description: "Confirm the handoff checklist is signed and shared.",
        status: "BACKLOG",
        priority: "MEDIUM",
        assigneeId: "cm8opsdemo0000000000000001",
        reviewerId: "cm8opsdemo0000000000000002",
        dueDate: "2026-03-12",
        blockedReason: "",
        blockedCategory: ""
      })
    );

    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid task payload", () => {
    const parsed = parseTaskFormData(
      createFormData({
        projectId: "bad-id",
        title: "No",
        description: "tiny",
        status: "BACKLOG",
        priority: "MEDIUM",
        assigneeId: "",
        reviewerId: "",
        dueDate: "2026-13-40",
        blockedReason: "",
        blockedCategory: ""
      })
    );

    expect(parsed.success).toBe(false);
  });

  it("rejects matching assignee and reviewer", () => {
    const parsed = parseTaskFormData(
      createFormData({
        projectId: "cm8opsdemo0000000000000000",
        title: "Confirm site handoff",
        description: "Confirm the handoff checklist is signed and shared.",
        status: "BACKLOG",
        priority: "MEDIUM",
        assigneeId: "cm8opsdemo0000000000000001",
        reviewerId: "cm8opsdemo0000000000000001",
        dueDate: "2026-03-12",
        blockedReason: "",
        blockedCategory: ""
      })
    );

    expect(parsed.success).toBe(false);
  });

  it("requires a reason for blocked tasks", () => {
    const parsed = parseTaskFormData(
      createFormData({
        projectId: "cm8opsdemo0000000000000000",
        title: "Confirm site handoff",
        description: "Confirm the handoff checklist is signed and shared.",
        status: "BLOCKED",
        priority: "MEDIUM",
        assigneeId: "",
        reviewerId: "",
        dueDate: "",
        blockedReason: "",
        blockedCategory: "OTHER"
      })
    );

    expect(parsed.success).toBe(false);
  });
});

describe("comment validation", () => {
  it("accepts structured mentions", () => {
    const parsed = parseCommentFormData(
      createFormData({
        taskId: "cm8opsdemo0000000000000000",
        body: "Please review the latest handoff note.",
        mentionedUserIds: [
          "cm8opsdemo0000000000000001",
          "cm8opsdemo0000000000000002"
        ]
      })
    );

    expect(parsed.success).toBe(true);
  });
});

describe("bulk task validation", () => {
  it("dedupes repeated task ids in bulk form data", () => {
    const parsed = parseBulkTaskUpdateFormData(
      createFormData({
        taskIds: [
          "cm8opsdemo0000000000000101",
          "cm8opsdemo0000000000000102",
          "cm8opsdemo0000000000000101"
        ],
        assigneeId: "cm8opsdemo0000000000000001",
        reviewerId: "",
        dueDate: "",
        status: "",
        priority: "",
        blockedState: "keep",
        blockedReason: "",
        blockedCategory: ""
      })
    );

    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(parsed.data.taskIds).toEqual([
        "cm8opsdemo0000000000000101",
        "cm8opsdemo0000000000000102"
      ]);
    }
  });

  it("requires a blocked reason for bulk blocked updates", () => {
    const parsed = parseBulkTaskUpdateFormData(
      createFormData({
        taskIds: ["cm8opsdemo0000000000000101"],
        assigneeId: "",
        reviewerId: "",
        dueDate: "",
        status: "",
        priority: "",
        blockedState: "block",
        blockedReason: "",
        blockedCategory: "DEPENDENCY"
      })
    );

    expect(parsed.success).toBe(false);
  });
});

describe("task template validation", () => {
  it("accepts a valid template payload", () => {
    const parsed = parseTaskTemplateFormData(
      createFormData({
        name: "Weekly review sweep",
        title: "Run weekly review sweep",
        description: "Sweep the review queue and capture the next handoff risk.",
        defaultAssigneeId: "cm8opsdemo0000000000000001",
        defaultReviewerId: "cm8opsdemo0000000000000002",
        defaultDueOffsetDays: "2",
        defaultPriority: "HIGH",
        defaultStatus: "BACKLOG"
      })
    );

    expect(parsed.success).toBe(true);
  });

  it("rejects a template that collides owner and reviewer", () => {
    const parsed = parseTaskTemplateFormData(
      createFormData({
        name: "Weekly review sweep",
        title: "Run weekly review sweep",
        description: "Sweep the review queue and capture the next handoff risk.",
        defaultAssigneeId: "cm8opsdemo0000000000000001",
        defaultReviewerId: "cm8opsdemo0000000000000001",
        defaultDueOffsetDays: "2",
        defaultPriority: "HIGH",
        defaultStatus: "BACKLOG"
      })
    );

    expect(parsed.success).toBe(false);
  });
});

describe("template generation validation", () => {
  it("accepts a valid project and template pair", () => {
    const parsed = parseCreateTaskFromTemplateFormData(
      createFormData({
        templateId: "cm8opsdemo0000000000000101",
        projectId: "cm8opsdemo0000000000000102"
      })
    );

    expect(parsed.success).toBe(true);
  });
});

describe("recurring schedule validation", () => {
  it("accepts a valid recurring schedule payload", () => {
    const parsed = parseRecurringScheduleFormData(
      createFormData({
        templateId: "cm8opsdemo0000000000000101",
        projectId: "cm8opsdemo0000000000000102",
        cadence: "WEEKLY",
        interval: "2",
        nextRunAt: "2026-03-20",
        isActive: "on"
      })
    );

    expect(parsed.success).toBe(true);
  });

  it("rejects a recurring schedule with an invalid interval", () => {
    const parsed = parseRecurringScheduleFormData(
      createFormData({
        templateId: "cm8opsdemo0000000000000101",
        projectId: "cm8opsdemo0000000000000102",
        cadence: "WEEKLY",
        interval: "0",
        nextRunAt: "2026-03-20",
        isActive: "on"
      })
    );

    expect(parsed.success).toBe(false);
  });
});

describe("supporting validators", () => {
  it("normalizes an HTML date input into a midday UTC date", () => {
    expect(normalizeDueDate("2026-03-12")?.toISOString()).toBe(
      "2026-03-12T12:00:00.000Z"
    );
    expect(normalizeDueDate("")).toBeNull();
  });

  it("accepts only valid task status updates", () => {
    expect(taskStatusUpdateSchema.safeParse({ status: "DONE" }).success).toBe(
      true
    );
    expect(
      taskStatusUpdateSchema.safeParse({ status: "INVALID" }).success
    ).toBe(false);
  });
});

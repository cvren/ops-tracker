import { describe, expect, it } from "vitest";

import {
  normalizeDueDate,
  parseProjectFormData,
  parseTaskFormData,
  taskStatusUpdateSchema
} from "@/lib/validation";

function createFormData(values: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
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

    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.code).toBeDefined();
      expect(parsed.error.flatten().fieldErrors.description).toBeDefined();
    }
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
        assigneeId: "",
        dueDate: "2026-03-12"
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
        dueDate: "2026-13-40"
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
    expect(taskStatusUpdateSchema.safeParse({ status: "INVALID" }).success).toBe(
      false
    );
  });
});

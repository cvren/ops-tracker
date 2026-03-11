import { describe, expect, it } from "vitest";

import {
  activityEventLabels,
  projectStatusLabels,
  taskPriorityLabels,
  taskStatusLabels,
  taskViewLabels,
  workspaceRoleLabels
} from "@/lib/constants";

describe("label maps", () => {
  it("exposes human-friendly project labels", () => {
    expect(projectStatusLabels.ACTIVE).toBe("Active");
    expect(projectStatusLabels.ON_HOLD).toBe("On hold");
  });

  it("exposes human-friendly task labels", () => {
    expect(taskStatusLabels.IN_PROGRESS).toBe("In progress");
    expect(taskStatusLabels.NEEDS_REVIEW).toBe("Needs review");
    expect(taskPriorityLabels.HIGH).toBe("High");
  });

  it("exposes view and role labels", () => {
    expect(taskViewLabels["my-tasks"]).toBe("My Tasks");
    expect(workspaceRoleLabels.ADMIN).toBe("Admin");
    expect(activityEventLabels.COMMENT_MENTIONED).toBe("Mentioned teammate");
  });
});

import { describe, expect, it } from "vitest";

import {
  activityEventLabels,
  projectStatusLabels,
  recurringCadenceLabels,
  recurringExecutionStatusLabels,
  recurringTriggerSourceLabels,
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
    expect(taskViewLabels["review-queue"]).toBe("Review Queue");
    expect(workspaceRoleLabels.ADMIN).toBe("Admin");
    expect(workspaceRoleLabels.MANAGER).toBe("Manager");
    expect(activityEventLabels.COMMENT_MENTIONED).toBe("Mentioned teammate");
    expect(activityEventLabels.TASK_BULK_UPDATED).toBe("Bulk updated");
    expect(activityEventLabels.MANAGER_ROLE_GRANTED).toBe(
      "Manager access granted"
    );
    expect(activityEventLabels.RECURRING_EXECUTION_FAILED).toBe(
      "Recurring execution failed"
    );
    expect(recurringExecutionStatusLabels.FAILED).toBe("Failed");
    expect(recurringTriggerSourceLabels.USER).toBe("User");
    expect(recurringCadenceLabels.WEEKLY).toBe("Weekly");
  });
});

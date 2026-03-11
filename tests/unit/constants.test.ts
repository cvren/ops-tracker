import { describe, expect, it } from "vitest";

import {
  projectStatusLabels,
  taskPriorityLabels,
  taskStatusLabels
} from "@/lib/constants";

describe("label maps", () => {
  it("exposes human-friendly project labels", () => {
    expect(projectStatusLabels.ACTIVE).toBe("Active");
    expect(projectStatusLabels.ON_HOLD).toBe("On hold");
  });

  it("exposes human-friendly task labels", () => {
    expect(taskStatusLabels.IN_PROGRESS).toBe("In progress");
    expect(taskPriorityLabels.HIGH).toBe("High");
  });
});

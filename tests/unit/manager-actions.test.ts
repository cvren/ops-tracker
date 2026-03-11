import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireWorkspaceRole,
  createActivityEvent,
  assertWorkspaceUsers,
  revalidateTaskSurfaces,
  transaction,
  findMany,
  update
} = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  createActivityEvent: vi.fn(),
  assertWorkspaceUsers: vi.fn(),
  revalidateTaskSurfaces: vi.fn(),
  transaction: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn()
}));

vi.mock("@/lib/workspace", () => ({
  requireWorkspaceRole
}));

vi.mock("@/lib/activity", () => ({
  createActivityEvent
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transaction
  }
}));

vi.mock("@/lib/task-action-helpers", () => ({
  assertWorkspaceUsers,
  collectSelectedUserIds: (values: Array<string | null | undefined>) =>
    values.filter((value): value is string => Boolean(value)),
  createTaskChangeEvents: vi.fn(),
  getUserNameMap: vi.fn(),
  getWorkspaceProject: vi.fn(),
  revalidateTaskSurfaces
}));

vi.mock("@/lib/recurring", () => ({
  calculateNextRunAt: vi.fn()
}));

import { bulkUpdateTasksAction } from "@/app/actions/manager-actions";

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

describe("manager bulk actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireWorkspaceRole.mockResolvedValue({
      workspace: { id: "workspace-1" },
      user: { id: "admin-1" }
    });
    assertWorkspaceUsers.mockResolvedValue(undefined);
    createActivityEvent.mockResolvedValue({ id: "event-1" });
    update.mockResolvedValue({});
    transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback({
        task: {
          findMany,
          update
        }
      })
    );
  });

  it("keeps bulk actions admin-only", async () => {
    requireWorkspaceRole.mockRejectedValue(
      new Error("Only workspace admins can manage this queue.")
    );

    const result = await bulkUpdateTasksAction(
      { status: "idle" },
      createFormData({
        taskIds: ["cm8opsdemo0000000000000101"],
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

    expect(result).toMatchObject({
      status: "error",
      message: "Only workspace admins can manage this queue."
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("dedupes task ids and records bulk activity events for each affected task", async () => {
    findMany.mockResolvedValue([
      {
        id: "cm8opsdemo0000000000000101",
        title: "Assign nightly audit owner",
        projectId: "project-1",
        project: { id: "project-1", code: "OPS-1" },
        assigneeId: null,
        reviewerId: null,
        dueDate: null,
        status: "BACKLOG",
        priority: "MEDIUM",
        blockedReason: null,
        blockedCategory: null,
        startedAt: null,
        completedAt: null
      },
      {
        id: "cm8opsdemo0000000000000102",
        title: "Backfill escalation owner",
        projectId: "project-1",
        project: { id: "project-1", code: "OPS-1" },
        assigneeId: null,
        reviewerId: null,
        dueDate: null,
        status: "BACKLOG",
        priority: "MEDIUM",
        blockedReason: null,
        blockedCategory: null,
        startedAt: null,
        completedAt: null
      }
    ]);

    const result = await bulkUpdateTasksAction(
      { status: "idle" },
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

    expect(result).toMatchObject({
      status: "success",
      message: "Updated 2 tasks."
    });
    const [[findManyInput]] = findMany.mock.calls as [[
      {
        where: {
          id: {
            in: string[];
          };
        };
      }
    ]];

    expect(findManyInput.where.id.in).toEqual([
      "cm8opsdemo0000000000000101",
      "cm8opsdemo0000000000000102"
    ]);
    expect(update).toHaveBeenCalledTimes(2);
    expect(createActivityEvent).toHaveBeenCalledTimes(2);
    const [, firstActivityInput] = createActivityEvent.mock.calls[0] as [
      unknown,
      {
        type: string;
        payload: {
          changedFields: string[];
        };
      }
    ];

    expect(firstActivityInput.type).toBe("TASK_BULK_UPDATED");
    expect(firstActivityInput.payload.changedFields).toEqual(["owner"]);
    expect(revalidateTaskSurfaces).toHaveBeenCalledWith({
      projectIds: ["project-1"]
    });
  });

  it("fails the entire batch when one selected task violates a workflow rule", async () => {
    findMany.mockResolvedValue([
      {
        id: "cm8opsdemo0000000000000101",
        title: "Blocked dependency",
        projectId: "project-1",
        project: { id: "project-1", code: "OPS-1" },
        assigneeId: "cm8opsdemo0000000000000001",
        reviewerId: "cm8opsdemo0000000000000002",
        dueDate: null,
        status: "BLOCKED",
        priority: "HIGH",
        blockedReason: "Waiting on vendor",
        blockedCategory: "DEPENDENCY",
        startedAt: new Date("2026-03-10T00:00:00.000Z"),
        completedAt: null
      },
      {
        id: "cm8opsdemo0000000000000102",
        title: "Healthy backlog item",
        projectId: "project-1",
        project: { id: "project-1", code: "OPS-1" },
        assigneeId: "cm8opsdemo0000000000000001",
        reviewerId: "cm8opsdemo0000000000000002",
        dueDate: null,
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        blockedReason: null,
        blockedCategory: null,
        startedAt: new Date("2026-03-10T00:00:00.000Z"),
        completedAt: null
      }
    ]);

    const result = await bulkUpdateTasksAction(
      { status: "idle" },
      createFormData({
        taskIds: [
          "cm8opsdemo0000000000000101",
          "cm8opsdemo0000000000000102"
        ],
        assigneeId: "",
        reviewerId: "",
        dueDate: "",
        status: "BACKLOG",
        priority: "",
        blockedState: "keep",
        blockedReason: "",
        blockedCategory: ""
      })
    );

    expect(result).toMatchObject({
      status: "error"
    });
    expect(result.message).toContain("Unblock it before applying a bulk status change");
    expect(update).not.toHaveBeenCalled();
    expect(createActivityEvent).not.toHaveBeenCalled();
    expect(revalidateTaskSurfaces).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireWorkspaceRole,
  createActivityEvent,
  assertWorkspaceUsers,
  createTaskChangeEvents,
  getUserNameMap,
  getWorkspaceProject,
  revalidateTaskSurfaces,
  calculateNextRunAt,
  transaction,
  taskTemplateFindFirst,
  taskTemplateCreate,
  taskTemplateUpdate,
  recurringScheduleFindFirst,
  recurringScheduleCreate,
  recurringScheduleUpdate,
  recurringExecutionCreate,
  recurringExecutionUpdate,
  taskCreate
} = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  createActivityEvent: vi.fn(),
  assertWorkspaceUsers: vi.fn(),
  createTaskChangeEvents: vi.fn(),
  getUserNameMap: vi.fn(),
  getWorkspaceProject: vi.fn(),
  revalidateTaskSurfaces: vi.fn(),
  calculateNextRunAt: vi.fn(),
  transaction: vi.fn(),
  taskTemplateFindFirst: vi.fn(),
  taskTemplateCreate: vi.fn(),
  taskTemplateUpdate: vi.fn(),
  recurringScheduleFindFirst: vi.fn(),
  recurringScheduleCreate: vi.fn(),
  recurringScheduleUpdate: vi.fn(),
  recurringExecutionCreate: vi.fn(),
  recurringExecutionUpdate: vi.fn(),
  taskCreate: vi.fn()
}));

vi.mock("@/lib/workspace", () => ({
  requireWorkspaceRole
}));

vi.mock("@/lib/activity", () => ({
  createActivityEvent
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transaction,
    taskTemplate: {
      findFirst: taskTemplateFindFirst
    },
    recurringSchedule: {
      findFirst: recurringScheduleFindFirst
    }
  }
}));

vi.mock("@/lib/task-action-helpers", () => ({
  assertWorkspaceUsers,
  collectSelectedUserIds: (values: Array<string | null | undefined>) =>
    values.filter((value): value is string => Boolean(value)),
  createTaskChangeEvents,
  getUserNameMap,
  getWorkspaceProject,
  revalidateTaskSurfaces
}));

vi.mock("@/lib/recurring", () => ({
  calculateNextRunAt
}));

import {
  createRecurringScheduleAction,
  createTaskFromTemplateAction,
  createTaskTemplateAction,
  executeRecurringScheduleAction,
  updateRecurringScheduleAction,
  updateTaskTemplateAction
} from "@/app/actions/manager-actions";

type ActivityInput = {
  type: string;
  payload?: Record<string, unknown>;
};

function getActivityInput(type: string) {
  const activityCall = createActivityEvent.mock.calls.find((entry) => {
    const [, input] = entry as [unknown, ActivityInput];
    return input.type === type;
  }) as [unknown, ActivityInput] | undefined;

  return activityCall?.[1];
}

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

function installTransactionMock() {
  transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
    callback({
      taskTemplate: {
        create: taskTemplateCreate,
        update: taskTemplateUpdate
      },
      recurringSchedule: {
        create: recurringScheduleCreate,
        update: recurringScheduleUpdate
      },
      recurringExecution: {
        create: recurringExecutionCreate,
        update: recurringExecutionUpdate
      },
      task: {
        create: taskCreate
      }
    })
  );
}

describe("repeat-work manager actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-11T09:00:00.000Z"));

    requireWorkspaceRole.mockResolvedValue({
      workspace: { id: "workspace-1" },
      user: { id: "admin-1" }
    });
    assertWorkspaceUsers.mockResolvedValue(undefined);
    createActivityEvent.mockResolvedValue({ id: "event-1" });
    createTaskChangeEvents.mockResolvedValue(undefined);
    getUserNameMap.mockResolvedValue(
      new Map([
        ["member-1", "Ken Operator"],
        ["reviewer-1", "Mika Reviewer"]
      ])
    );
    getWorkspaceProject.mockResolvedValue({
      id: "project-1",
      code: "OPS-ALPHA",
      name: "Harbor inventory rollout"
    });
    calculateNextRunAt.mockReturnValue(new Date("2026-03-18T12:00:00.000Z"));

    installTransactionMock();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a task template with authorship and activity trace", async () => {
    taskTemplateFindFirst.mockResolvedValue(null);
    taskTemplateCreate.mockResolvedValue({
      id: "template-1",
      name: "Weekly review sweep"
    });

    const result = await createTaskTemplateAction(
      { status: "idle" },
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

    expect(result).toMatchObject({
      status: "success",
      entityId: "template-1"
    });
    const [[createTemplateCall]] = taskTemplateCreate.mock.calls as Array<
      [
        {
          data: {
            workspaceId: string;
            name: string;
            createdById: string;
            updatedById: string;
            defaultDueOffsetDays: number | null;
          };
        }
      ]
    >;

    expect(createTemplateCall.data.workspaceId).toBe("workspace-1");
    expect(createTemplateCall.data.name).toBe("Weekly review sweep");
    expect(createTemplateCall.data.createdById).toBe("admin-1");
    expect(createTemplateCall.data.updatedById).toBe("admin-1");
    expect(createTemplateCall.data.defaultDueOffsetDays).toBe(2);

    const templateCreatedActivity = getActivityInput("TASK_TEMPLATE_CREATED");
    expect(templateCreatedActivity?.payload).toMatchObject({
      templateId: "template-1"
    });
    expect(revalidateTaskSurfaces).toHaveBeenCalledWith({});
  });

  it("updates a task template and records the changed fields", async () => {
    taskTemplateFindFirst
      .mockResolvedValueOnce({
        id: "template-1",
        workspaceId: "workspace-1",
        name: "Weekly review sweep",
        title: "Run weekly review sweep",
        description: "Sweep the review queue and capture the next handoff risk.",
        defaultAssigneeId: "cm8opsdemo0000000000000001",
        defaultReviewerId: "cm8opsdemo0000000000000002",
        defaultDueOffsetDays: 2,
        defaultPriority: "MEDIUM",
        defaultStatus: "BACKLOG"
      })
      .mockResolvedValueOnce(null);
    taskTemplateUpdate.mockResolvedValue({
      id: "template-1",
      name: "Weekly review sweep"
    });

    const result = await updateTaskTemplateAction(
      { status: "idle" },
      createFormData({
        templateId: "cm8opsdemo0000000000000101",
        name: "Weekly review sweep",
        title: "Run weekly review sweep",
        description: "Sweep the review queue and capture the next handoff risk.",
        defaultAssigneeId: "cm8opsdemo0000000000000001",
        defaultReviewerId: "cm8opsdemo0000000000000002",
        defaultDueOffsetDays: "4",
        defaultPriority: "HIGH",
        defaultStatus: "IN_PROGRESS"
      })
    );

    expect(result).toMatchObject({
      status: "success",
      entityId: "template-1"
    });
    const [[updateTemplateCall]] = taskTemplateUpdate.mock.calls as Array<
      [
        {
          where: {
            id: string;
          };
          data: {
            updatedById: string;
            defaultDueOffsetDays: number | null;
            defaultPriority: string;
            defaultStatus: string;
          };
        }
      ]
    >;

    expect(updateTemplateCall.where.id).toBe("cm8opsdemo0000000000000101");
    expect(updateTemplateCall.data.updatedById).toBe("admin-1");
    expect(updateTemplateCall.data.defaultDueOffsetDays).toBe(4);
    expect(updateTemplateCall.data.defaultPriority).toBe("HIGH");
    expect(updateTemplateCall.data.defaultStatus).toBe("IN_PROGRESS");

    const templateUpdatedActivity = getActivityInput("TASK_TEMPLATE_UPDATED");
    expect(templateUpdatedActivity?.payload).toMatchObject({
      changedFields: ["default due offset", "default priority", "default status"]
    });
  });

  it("creates a task from a template with the mapped defaults", async () => {
    taskTemplateFindFirst.mockResolvedValue({
      id: "template-1",
      name: "Weekly review sweep",
      title: "Run weekly review sweep",
      description: "Sweep the review queue and capture the next handoff risk.",
      defaultAssigneeId: "member-1",
      defaultReviewerId: "reviewer-1",
      defaultDueOffsetDays: 2,
      defaultPriority: "HIGH",
      defaultStatus: "IN_PROGRESS",
      defaultAssignee: { id: "member-1", name: "Ken Operator" },
      defaultReviewer: { id: "reviewer-1", name: "Mika Reviewer" }
    });
    taskCreate.mockResolvedValue({
      id: "task-1",
      title: "Run weekly review sweep",
      projectId: "project-1",
      assigneeId: "member-1",
      reviewerId: "reviewer-1",
      createdById: "admin-1",
      dueDate: new Date("2026-03-13T12:00:00.000Z")
    });

    const result = await createTaskFromTemplateAction(
      { status: "idle" },
      createFormData({
        templateId: "cm8opsdemo0000000000000101",
        projectId: "cm8opsdemo0000000000000102"
      })
    );

    expect(result).toMatchObject({
      status: "success",
      entityId: "task-1"
    });
    const [[createTaskCall]] = taskCreate.mock.calls as Array<
      [
        {
          data: {
            projectId: string;
            title: string;
            assigneeId: string | null;
            reviewerId: string | null;
            createdById: string;
            updatedById: string;
            dueDate: Date | null;
            status: string;
            priority: string;
          };
        }
      ]
    >;

    expect(createTaskCall.data.projectId).toBe("project-1");
    expect(createTaskCall.data.title).toBe("Run weekly review sweep");
    expect(createTaskCall.data.assigneeId).toBe("member-1");
    expect(createTaskCall.data.reviewerId).toBe("reviewer-1");
    expect(createTaskCall.data.createdById).toBe("admin-1");
    expect(createTaskCall.data.updatedById).toBe("admin-1");
    expect(createTaskCall.data.dueDate).toEqual(
      new Date("2026-03-13T12:00:00.000Z")
    );
    expect(createTaskCall.data.status).toBe("IN_PROGRESS");
    expect(createTaskCall.data.priority).toBe("HIGH");

    const createdFromTemplateActivity = getActivityInput(
      "TASK_CREATED_FROM_TEMPLATE"
    );
    expect(createdFromTemplateActivity?.payload).toMatchObject({
      templateId: "template-1"
    });
    expect(revalidateTaskSurfaces).toHaveBeenCalledWith({
      taskId: "task-1",
      projectIds: ["project-1"]
    });
  });

  it("creates and updates recurring schedules with activity trace", async () => {
    taskTemplateFindFirst.mockResolvedValue({
      id: "template-1",
      name: "Weekly review sweep",
      title: "Run weekly review sweep",
      description: "Sweep the review queue and capture the next handoff risk.",
      defaultAssigneeId: "member-1",
      defaultReviewerId: "reviewer-1",
      defaultDueOffsetDays: 2,
      defaultPriority: "HIGH",
      defaultStatus: "BACKLOG",
      defaultAssignee: { id: "member-1", name: "Ken Operator" },
      defaultReviewer: { id: "reviewer-1", name: "Mika Reviewer" }
    });
    recurringScheduleCreate.mockResolvedValue({
      id: "schedule-1"
    });

    const createResult = await createRecurringScheduleAction(
      { status: "idle" },
      createFormData({
        templateId: "cm8opsdemo0000000000000101",
        projectId: "cm8opsdemo0000000000000102",
        cadence: "WEEKLY",
        interval: "2",
        nextRunAt: "2026-03-20",
        isActive: "on"
      })
    );

    expect(createResult).toMatchObject({
      status: "success",
      entityId: "schedule-1"
    });
    const [[createScheduleCall]] = recurringScheduleCreate.mock.calls as Array<
      [
        {
          data: {
            workspaceId: string;
            templateId: string;
            projectId: string;
            cadence: string;
            interval: number;
            nextRunAt: Date;
            isActive: boolean;
            createdById: string;
            updatedById: string;
          };
        }
      ]
    >;

    expect(createScheduleCall.data.workspaceId).toBe("workspace-1");
    expect(createScheduleCall.data.templateId).toBe("template-1");
    expect(createScheduleCall.data.projectId).toBe("project-1");
    expect(createScheduleCall.data.cadence).toBe("WEEKLY");
    expect(createScheduleCall.data.interval).toBe(2);
    expect(createScheduleCall.data.nextRunAt).toEqual(
      new Date("2026-03-20T12:00:00.000Z")
    );
    expect(createScheduleCall.data.isActive).toBe(true);
    expect(createScheduleCall.data.createdById).toBe("admin-1");
    expect(createScheduleCall.data.updatedById).toBe("admin-1");

    recurringScheduleFindFirst.mockResolvedValue({
      id: "schedule-1",
      templateId: "template-1",
      projectId: "project-1",
      cadence: "WEEKLY",
      interval: 2,
      nextRunAt: new Date("2026-03-20T12:00:00.000Z"),
      isActive: true,
      template: {
        id: "template-1",
        name: "Weekly review sweep",
        defaultAssigneeId: "member-1",
        defaultReviewerId: "reviewer-1",
        defaultAssignee: { id: "member-1", name: "Ken Operator" },
        defaultReviewer: { id: "reviewer-1", name: "Mika Reviewer" }
      },
      project: {
        id: "project-1",
        code: "OPS-ALPHA",
        name: "Harbor inventory rollout"
      }
    });
    recurringScheduleUpdate.mockResolvedValue({
      id: "schedule-1"
    });

    const updateResult = await updateRecurringScheduleAction(
      { status: "idle" },
      createFormData({
        scheduleId: "cm8opsdemo0000000000000103",
        templateId: "cm8opsdemo0000000000000101",
        projectId: "cm8opsdemo0000000000000102",
        cadence: "MONTHLY",
        interval: "1",
        nextRunAt: "2026-04-01",
        isActive: ""
      })
    );

    expect(updateResult).toMatchObject({
      status: "success",
      entityId: "schedule-1"
    });
    const [[updateScheduleCall]] = recurringScheduleUpdate.mock.calls as Array<
      [
        {
          where: {
            id: string;
          };
          data: {
            cadence: string;
            interval: number;
            nextRunAt: Date;
            isActive: boolean;
            updatedById: string;
          };
        }
      ]
    >;

    expect(updateScheduleCall.where.id).toBe("cm8opsdemo0000000000000103");
    expect(updateScheduleCall.data.cadence).toBe("MONTHLY");
    expect(updateScheduleCall.data.interval).toBe(1);
    expect(updateScheduleCall.data.nextRunAt).toEqual(
      new Date("2026-04-01T12:00:00.000Z")
    );
    expect(updateScheduleCall.data.isActive).toBe(false);
    expect(updateScheduleCall.data.updatedById).toBe("admin-1");

    const scheduleUpdatedActivity = getActivityInput(
      "RECURRING_SCHEDULE_UPDATED"
    );
    expect(scheduleUpdatedActivity?.payload).toMatchObject({
      changedFields: ["cadence", "interval", "next run", "active state"]
    });
  });

  it("executes a recurring schedule, advances run dates, and records activity", async () => {
    recurringScheduleFindFirst.mockResolvedValue({
      id: "schedule-1",
      templateId: "template-1",
      projectId: "project-1",
      cadence: "WEEKLY",
      interval: 1,
      nextRunAt: new Date("2026-03-12T12:00:00.000Z"),
      isActive: true,
      template: {
        id: "template-1",
        name: "Weekly review sweep",
        title: "Run weekly review sweep",
        description: "Sweep the review queue and capture the next handoff risk.",
        defaultAssigneeId: "member-1",
        defaultReviewerId: "reviewer-1",
        defaultDueOffsetDays: 2,
        defaultPriority: "HIGH",
        defaultStatus: "BACKLOG",
        defaultAssignee: { id: "member-1", name: "Ken Operator" },
        defaultReviewer: { id: "reviewer-1", name: "Mika Reviewer" }
      },
      project: {
        id: "project-1",
        code: "OPS-ALPHA",
        name: "Harbor inventory rollout"
      }
    });
    recurringExecutionCreate.mockResolvedValue({
      id: "execution-1"
    });
    taskCreate.mockResolvedValue({
      id: "task-1",
      title: "Run weekly review sweep",
      projectId: "project-1",
      assigneeId: "member-1",
      reviewerId: "reviewer-1",
      createdById: "admin-1",
      dueDate: new Date("2026-03-13T12:00:00.000Z")
    });
    recurringExecutionUpdate.mockResolvedValue({});
    recurringScheduleUpdate.mockResolvedValue({
      id: "schedule-1"
    });

    const result = await executeRecurringScheduleAction("schedule-1");

    expect(result).toMatchObject({
      status: "success",
      entityId: "task-1"
    });
    expect(recurringExecutionCreate).toHaveBeenCalledWith({
      data: {
        scheduleId: "schedule-1",
        scheduledFor: new Date("2026-03-12T12:00:00.000Z")
      }
    });
    const [[executeUpdateCall]] = recurringScheduleUpdate.mock.calls as Array<
      [
        {
          where: {
            id: string;
          };
          data: {
            lastRunAt: Date;
            nextRunAt: Date;
            updatedById: string;
          };
        }
      ]
    >;

    expect(executeUpdateCall.where.id).toBe("schedule-1");
    expect(executeUpdateCall.data.lastRunAt).toEqual(
      new Date("2026-03-11T09:00:00.000Z")
    );
    expect(executeUpdateCall.data.nextRunAt).toEqual(
      new Date("2026-03-18T12:00:00.000Z")
    );
    expect(executeUpdateCall.data.updatedById).toBe("admin-1");

    const createdTypes = createActivityEvent.mock.calls.map((entry) => {
      const [, input] = entry as [unknown, ActivityInput];
      return input.type;
    });
    expect(createdTypes).toContain("TASK_CREATED");
    expect(createdTypes).toContain("TASK_CREATED_FROM_TEMPLATE");
    expect(createdTypes).toContain("RECURRING_SCHEDULE_EXECUTED");
    expect(revalidateTaskSurfaces).toHaveBeenCalledWith({
      taskId: "task-1",
      projectIds: ["project-1"]
    });
  });

  it("blocks inactive schedules and duplicate current-slot generation", async () => {
    recurringScheduleFindFirst.mockResolvedValue({
      id: "schedule-1",
      templateId: "template-1",
      projectId: "project-1",
      cadence: "DAILY",
      interval: 1,
      nextRunAt: new Date("2026-03-12T12:00:00.000Z"),
      isActive: false,
      template: {
        id: "template-1",
        name: "Weekly review sweep",
        title: "Run weekly review sweep",
        description: "Sweep the review queue and capture the next handoff risk.",
        defaultAssigneeId: "member-1",
        defaultReviewerId: "reviewer-1",
        defaultDueOffsetDays: 2,
        defaultPriority: "HIGH",
        defaultStatus: "BACKLOG",
        defaultAssignee: { id: "member-1", name: "Ken Operator" },
        defaultReviewer: { id: "reviewer-1", name: "Mika Reviewer" }
      },
      project: {
        id: "project-1",
        code: "OPS-ALPHA",
        name: "Harbor inventory rollout"
      }
    });

    const inactiveResult = await executeRecurringScheduleAction("schedule-1");

    expect(inactiveResult).toMatchObject({
      status: "error",
      message: "Activate the schedule before generating tasks."
    });
    expect(transaction).not.toHaveBeenCalled();

    recurringScheduleFindFirst.mockResolvedValue({
      id: "schedule-1",
      templateId: "template-1",
      projectId: "project-1",
      cadence: "DAILY",
      interval: 1,
      nextRunAt: new Date("2026-03-12T12:00:00.000Z"),
      isActive: true,
      template: {
        id: "template-1",
        name: "Weekly review sweep",
        title: "Run weekly review sweep",
        description: "Sweep the review queue and capture the next handoff risk.",
        defaultAssigneeId: "member-1",
        defaultReviewerId: "reviewer-1",
        defaultDueOffsetDays: 2,
        defaultPriority: "HIGH",
        defaultStatus: "BACKLOG",
        defaultAssignee: { id: "member-1", name: "Ken Operator" },
        defaultReviewer: { id: "reviewer-1", name: "Mika Reviewer" }
      },
      project: {
        id: "project-1",
        code: "OPS-ALPHA",
        name: "Harbor inventory rollout"
      }
    });
    transaction.mockRejectedValue({
      code: "P2002"
    });

    const duplicateResult = await executeRecurringScheduleAction("schedule-1");

    expect(duplicateResult).toMatchObject({
      status: "error",
      message: "This schedule already generated its current run slot."
    });
    expect(revalidateTaskSurfaces).not.toHaveBeenCalled();
  });
});

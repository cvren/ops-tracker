import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const workspaceId = "ckworkspace000000000000000001";
const managerId = "ckmanager0000000000000000001";
const memberId = "ckmember00000000000000000001";
const reviewerId = "ckreviewer00000000000000001";
const templateId = "cktemplate00000000000000001";
const projectId = "ckproject000000000000000001";
const scheduleId = "ckschedule00000000000000001";

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
  recurringScheduleUpdateMany,
  recurringExecutionFindFirst,
  recurringExecutionFindMany,
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
  recurringScheduleUpdateMany: vi.fn(),
  recurringExecutionFindFirst: vi.fn(),
  recurringExecutionFindMany: vi.fn(),
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
    },
    recurringExecution: {
      findFirst: recurringExecutionFindFirst,
      findMany: recurringExecutionFindMany,
      create: recurringExecutionCreate,
      update: recurringExecutionUpdate
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
  rerunRecurringExecutionAction,
  updateRecurringScheduleAction,
  updateTaskTemplateAction
} from "@/app/actions/manager-actions";

type ActivityInput = {
  type: string;
  payload?: Record<string, unknown>;
};

type TransactionMock = {
  taskTemplate: {
    create: typeof taskTemplateCreate;
    update: typeof taskTemplateUpdate;
  };
  recurringSchedule: {
    create: typeof recurringScheduleCreate;
    update: typeof recurringScheduleUpdate;
    updateMany: typeof recurringScheduleUpdateMany;
  };
  recurringExecution: {
    update: typeof recurringExecutionUpdate;
  };
  task: {
    create: typeof taskCreate;
  };
};

type MutationCreateArgs = {
  data: Record<string, unknown>;
};

type MutationUpdateArgs = {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
};

function getActivityTypes() {
  return createActivityEvent.mock.calls.map((entry) => {
    const [, input] = entry as [unknown, ActivityInput];
    return input.type;
  });
}

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
  transaction.mockImplementation((callback: (tx: TransactionMock) => unknown) =>
    Promise.resolve(
      callback({
      taskTemplate: {
        create: taskTemplateCreate,
        update: taskTemplateUpdate
      },
      recurringSchedule: {
        create: recurringScheduleCreate,
        update: recurringScheduleUpdate,
        updateMany: recurringScheduleUpdateMany
      },
      recurringExecution: {
        update: recurringExecutionUpdate
      },
      task: {
        create: taskCreate
      }
      })
    )
  );
}

function getFirstMockArgument<T>(mockFn: { mock: { calls: unknown[][] } }) {
  const firstCall = mockFn.mock.calls[0];

  if (!firstCall) {
    throw new Error("Expected mock to be called at least once.");
  }

  return firstCall[0] as T;
}

function buildSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: scheduleId,
    workspaceId,
    templateId,
    projectId,
    cadence: "WEEKLY",
    interval: 1,
    nextRunAt: new Date("2026-03-12T12:00:00.000Z"),
    lastRunAt: null,
    isActive: true,
    createdById: "ckadmin00000000000000000001",
    updatedById: "ckadmin00000000000000000001",
    template: {
      id: templateId,
      name: "Weekly review sweep",
      title: "Run weekly review sweep",
      description: "Sweep the review queue and capture the next handoff risk.",
      defaultAssigneeId: memberId,
      defaultReviewerId: reviewerId,
      defaultDueOffsetDays: 2,
      defaultPriority: "HIGH",
      defaultStatus: "BACKLOG",
      defaultAssignee: { id: memberId, name: "Ken Operator" },
      defaultReviewer: { id: reviewerId, name: "Mika Reviewer" }
    },
    project: {
      id: projectId,
      code: "OPS-ALPHA",
      name: "Harbor inventory rollout"
    },
    ...overrides
  };
}

describe("repeat-work manager actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-11T09:00:00.000Z"));

    requireWorkspaceRole.mockResolvedValue({
      workspace: { id: workspaceId },
      user: { id: managerId }
    });
    assertWorkspaceUsers.mockResolvedValue(undefined);
    createActivityEvent.mockResolvedValue({ id: "event-1" });
    createTaskChangeEvents.mockResolvedValue(undefined);
    getUserNameMap.mockResolvedValue(
      new Map([
        [memberId, "Ken Operator"],
        [reviewerId, "Mika Reviewer"]
      ])
    );
    getWorkspaceProject.mockResolvedValue({
      id: projectId,
      code: "OPS-ALPHA",
      name: "Harbor inventory rollout"
    });
    calculateNextRunAt.mockReturnValue(new Date("2026-03-19T12:00:00.000Z"));
    recurringExecutionFindMany.mockResolvedValue([]);
    recurringExecutionFindFirst.mockResolvedValue(null);
    recurringExecutionCreate.mockResolvedValue({
      id: "execution-1"
    });
    recurringExecutionUpdate.mockResolvedValue({});
    recurringScheduleUpdateMany.mockResolvedValue({ count: 1 });

    installTransactionMock();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a task template with authorship and activity trace", async () => {
    taskTemplateFindFirst.mockResolvedValue(null);
    taskTemplateCreate.mockResolvedValue({
      id: templateId,
      name: "Weekly review sweep"
    });

    const result = await createTaskTemplateAction(
      { status: "idle" },
      createFormData({
        name: "Weekly review sweep",
        title: "Run weekly review sweep",
        description: "Sweep the review queue and capture the next handoff risk.",
        defaultAssigneeId: memberId,
        defaultReviewerId: reviewerId,
        defaultDueOffsetDays: "2",
        defaultPriority: "HIGH",
        defaultStatus: "BACKLOG"
      })
    );

    expect(result).toMatchObject({
      status: "success",
      entityId: templateId
    });
    const createTemplateArgs =
      getFirstMockArgument<MutationCreateArgs>(taskTemplateCreate);
    expect(createTemplateArgs.data).toMatchObject({
      workspaceId,
      name: "Weekly review sweep",
      createdById: managerId,
      updatedById: managerId,
      defaultDueOffsetDays: 2
    });
    expect(getActivityInput("TASK_TEMPLATE_CREATED")?.payload).toMatchObject({
      templateId
    });
  });

  it("updates a task template and records the changed fields", async () => {
    taskTemplateFindFirst
      .mockResolvedValueOnce({
        id: templateId,
        workspaceId,
        name: "Weekly review sweep",
        title: "Run weekly review sweep",
        description: "Sweep the review queue and capture the next handoff risk.",
        defaultAssigneeId: memberId,
        defaultReviewerId: reviewerId,
        defaultDueOffsetDays: 2,
        defaultPriority: "MEDIUM",
        defaultStatus: "BACKLOG"
      })
      .mockResolvedValueOnce(null);
    taskTemplateUpdate.mockResolvedValue({
      id: templateId,
      name: "Weekly review sweep"
    });

    const result = await updateTaskTemplateAction(
      { status: "idle" },
      createFormData({
        templateId,
        name: "Weekly review sweep",
        title: "Run weekly review sweep",
        description: "Sweep the review queue and capture the next handoff risk.",
        defaultAssigneeId: memberId,
        defaultReviewerId: reviewerId,
        defaultDueOffsetDays: "4",
        defaultPriority: "HIGH",
        defaultStatus: "IN_PROGRESS"
      })
    );

    expect(result).toMatchObject({
      status: "success",
      entityId: templateId
    });
    const updateTemplateArgs =
      getFirstMockArgument<MutationUpdateArgs>(taskTemplateUpdate);
    expect(updateTemplateArgs.where).toMatchObject({ id: templateId });
    expect(updateTemplateArgs.data).toMatchObject({
      updatedById: managerId,
      defaultDueOffsetDays: 4,
      defaultPriority: "HIGH",
      defaultStatus: "IN_PROGRESS"
    });
    expect(getActivityInput("TASK_TEMPLATE_UPDATED")?.payload).toMatchObject({
      changedFields: ["default due offset", "default priority", "default status"]
    });
  });

  it("creates a task from a template with the mapped defaults", async () => {
    taskTemplateFindFirst.mockResolvedValue({
      id: templateId,
      name: "Weekly review sweep",
      title: "Run weekly review sweep",
      description: "Sweep the review queue and capture the next handoff risk.",
      defaultAssigneeId: memberId,
      defaultReviewerId: reviewerId,
      defaultDueOffsetDays: 2,
      defaultPriority: "HIGH",
      defaultStatus: "IN_PROGRESS",
      defaultAssignee: { id: memberId, name: "Ken Operator" },
      defaultReviewer: { id: reviewerId, name: "Mika Reviewer" }
    });
    taskCreate.mockResolvedValue({
      id: "task-1",
      title: "Run weekly review sweep",
      projectId,
      assigneeId: memberId,
      reviewerId,
      createdById: managerId,
      dueDate: new Date("2026-03-13T12:00:00.000Z")
    });

    const result = await createTaskFromTemplateAction(
      { status: "idle" },
      createFormData({
        templateId,
        projectId
      })
    );

    expect(result).toMatchObject({
      status: "success",
      entityId: "task-1"
    });
    const createTaskArgs = getFirstMockArgument<MutationCreateArgs>(taskCreate);
    expect(createTaskArgs.data).toMatchObject({
      projectId,
      title: "Run weekly review sweep",
      assigneeId: memberId,
      reviewerId,
      createdById: managerId,
      updatedById: managerId,
      status: "IN_PROGRESS",
      priority: "HIGH"
    });
    expect(getActivityInput("TASK_CREATED_FROM_TEMPLATE")?.payload).toMatchObject({
      templateId
    });
  });

  it("creates and updates recurring schedules with activity trace", async () => {
    taskTemplateFindFirst.mockResolvedValue({
      id: templateId,
      name: "Weekly review sweep",
      title: "Run weekly review sweep",
      description: "Sweep the review queue and capture the next handoff risk.",
      defaultAssigneeId: memberId,
      defaultReviewerId: reviewerId,
      defaultDueOffsetDays: 2,
      defaultPriority: "HIGH",
      defaultStatus: "BACKLOG",
      defaultAssignee: { id: memberId, name: "Ken Operator" },
      defaultReviewer: { id: reviewerId, name: "Mika Reviewer" }
    });
    recurringScheduleCreate.mockResolvedValue({ id: scheduleId });

    const createResult = await createRecurringScheduleAction(
      { status: "idle" },
      createFormData({
        templateId,
        projectId,
        cadence: "WEEKLY",
        interval: "2",
        nextRunAt: "2026-03-20",
        isActive: "on"
      })
    );

    expect(createResult).toMatchObject({
      status: "success",
      entityId: scheduleId
    });
    const createScheduleArgs =
      getFirstMockArgument<MutationCreateArgs>(recurringScheduleCreate);
    expect(createScheduleArgs.data).toMatchObject({
      workspaceId,
      templateId,
      projectId,
      cadence: "WEEKLY",
      interval: 2,
      isActive: true,
      createdById: managerId,
      updatedById: managerId
    });

    recurringScheduleFindFirst.mockResolvedValue(
      buildSchedule({
        nextRunAt: new Date("2026-03-20T12:00:00.000Z"),
        interval: 2
      })
    );
    recurringScheduleUpdate.mockResolvedValue({ id: scheduleId });

    const updateResult = await updateRecurringScheduleAction(
      { status: "idle" },
      createFormData({
        scheduleId,
        templateId,
        projectId,
        cadence: "MONTHLY",
        interval: "1",
        nextRunAt: "2026-04-01",
        isActive: ""
      })
    );

    expect(updateResult).toMatchObject({
      status: "success",
      entityId: scheduleId
    });
    const updateScheduleArgs =
      getFirstMockArgument<MutationUpdateArgs>(recurringScheduleUpdate);
    expect(updateScheduleArgs.where).toMatchObject({ id: scheduleId });
    expect(updateScheduleArgs.data).toMatchObject({
      cadence: "MONTHLY",
      interval: 1,
      isActive: false,
      updatedById: managerId
    });
    expect(getActivityInput("RECURRING_SCHEDULE_UPDATED")?.payload).toMatchObject({
      changedFields: ["cadence", "interval", "next run", "active state"]
    });
  });

  it("creates a recurring execution ledger row, links the generated task, and records success activity", async () => {
    recurringScheduleFindFirst.mockResolvedValue(buildSchedule());
    taskCreate.mockResolvedValue({
      id: "task-1",
      title: "Run weekly review sweep",
      projectId,
      assigneeId: memberId,
      reviewerId,
      createdById: managerId,
      dueDate: new Date("2026-03-13T12:00:00.000Z")
    });

    const result = await executeRecurringScheduleAction(scheduleId);

    expect(result).toMatchObject({
      status: "success",
      entityId: "task-1"
    });
    const createExecutionArgs =
      getFirstMockArgument<MutationCreateArgs>(recurringExecutionCreate);
    expect(createExecutionArgs.data).toMatchObject({
      recurringScheduleId: scheduleId,
      workspaceId,
      status: "RUNNING",
      scheduledFor: new Date("2026-03-12T12:00:00.000Z"),
      triggeredBy: "USER",
      triggeredByUserId: managerId,
      rerunOfExecutionId: null
    });
    const generatedTaskArgs = getFirstMockArgument<MutationCreateArgs>(taskCreate);
    expect(generatedTaskArgs.data).toMatchObject({
      projectId,
      recurringExecutionId: "execution-1",
      createdById: managerId,
      updatedById: managerId
    });
    const successExecutionUpdateArgs =
      getFirstMockArgument<MutationUpdateArgs>(recurringExecutionUpdate);
    expect(successExecutionUpdateArgs.where).toMatchObject({ id: "execution-1" });
    expect(successExecutionUpdateArgs.data).toMatchObject({
      status: "SUCCESS",
      errorMessage: null,
      generatedTaskCount: 1
    });
    const successScheduleUpdateArgs =
      getFirstMockArgument<MutationUpdateArgs>(recurringScheduleUpdateMany);
    expect(successScheduleUpdateArgs.where).toMatchObject({
      id: scheduleId,
      nextRunAt: new Date("2026-03-12T12:00:00.000Z")
    });
    expect(successScheduleUpdateArgs.data).toMatchObject({
      lastRunAt: new Date("2026-03-11T09:00:00.000Z"),
      nextRunAt: new Date("2026-03-19T12:00:00.000Z"),
      updatedById: managerId
    });
    expect(getActivityTypes()).toEqual(
      expect.arrayContaining([
        "RECURRING_EXECUTION_STARTED",
        "RECURRING_EXECUTION_SUCCEEDED",
        "RECURRING_SCHEDULE_EXECUTED",
        "TASK_CREATED_FROM_TEMPLATE"
      ])
    );
    expect(getActivityInput("RECURRING_EXECUTION_SUCCEEDED")?.payload).toMatchObject(
      {
        executionId: "execution-1",
        generatedTaskCount: 1,
        generatedTaskIds: ["task-1"]
      }
    );
    expect(revalidateTaskSurfaces).toHaveBeenCalledWith({
      taskId: "task-1",
      projectIds: [projectId]
    });
  });

  it("marks the ledger failed when task generation breaks and keeps the schedule slot in place", async () => {
    recurringScheduleFindFirst.mockResolvedValue(buildSchedule());
    taskCreate.mockRejectedValue(new Error("Default owner is no longer a workspace member."));

    const result = await executeRecurringScheduleAction(scheduleId);

    expect(result).toMatchObject({
      status: "error",
      message: "Default owner is no longer a workspace member."
    });
    expect(recurringScheduleUpdateMany).not.toHaveBeenCalled();
    const failedExecutionUpdateArgs =
      getFirstMockArgument<MutationUpdateArgs>(recurringExecutionUpdate);
    expect(failedExecutionUpdateArgs.where).toMatchObject({ id: "execution-1" });
    expect(failedExecutionUpdateArgs.data).toMatchObject({
      status: "FAILED",
      errorMessage: "Default owner is no longer a workspace member.",
      generatedTaskCount: 0
    });
    expect(getActivityTypes()).toEqual(
      expect.arrayContaining([
        "RECURRING_EXECUTION_STARTED",
        "RECURRING_EXECUTION_FAILED"
      ])
    );
  });

  it("reruns a failed execution by creating a fresh ledger record for the same slot", async () => {
    recurringExecutionFindFirst.mockResolvedValue({
      id: "execution-failed-1",
      workspaceId,
      recurringScheduleId: scheduleId,
      scheduledFor: new Date("2026-03-12T12:00:00.000Z"),
      status: "FAILED",
      recurringSchedule: buildSchedule()
    });
    recurringExecutionFindMany.mockResolvedValue([
      {
        id: "execution-failed-1",
        status: "FAILED",
        createdAt: new Date("2026-03-11T08:00:00.000Z")
      }
    ]);
    recurringExecutionCreate.mockResolvedValue({
      id: "execution-rerun-1"
    });
    taskCreate.mockResolvedValue({
      id: "task-2",
      title: "Run weekly review sweep",
      projectId,
      assigneeId: memberId,
      reviewerId,
      createdById: managerId,
      dueDate: new Date("2026-03-13T12:00:00.000Z")
    });

    const result = await rerunRecurringExecutionAction("execution-failed-1");

    expect(result).toMatchObject({
      status: "success",
      entityId: "task-2"
    });
    const rerunExecutionArgs =
      getFirstMockArgument<MutationCreateArgs>(recurringExecutionCreate);
    expect(rerunExecutionArgs.data).toMatchObject({
      recurringScheduleId: scheduleId,
      scheduledFor: new Date("2026-03-12T12:00:00.000Z"),
      rerunOfExecutionId: "execution-failed-1"
    });
    expect(getActivityTypes()).toEqual(
      expect.arrayContaining([
        "RECURRING_EXECUTION_RERUN",
        "RECURRING_EXECUTION_STARTED",
        "RECURRING_EXECUTION_SUCCEEDED"
      ])
    );
  });

  it("blocks inactive schedules and forces failed current slots through rerun instead of generate now", async () => {
    recurringScheduleFindFirst.mockResolvedValueOnce(
      buildSchedule({
        isActive: false
      })
    );

    const inactiveResult = await executeRecurringScheduleAction(scheduleId);

    expect(inactiveResult).toMatchObject({
      status: "error",
      message: "Activate the schedule before generating tasks."
    });
    expect(recurringExecutionCreate).not.toHaveBeenCalled();

    recurringScheduleFindFirst.mockResolvedValueOnce(buildSchedule());
    recurringExecutionFindMany.mockResolvedValueOnce([
      {
        id: "execution-failed-1",
        status: "FAILED",
        createdAt: new Date("2026-03-11T08:00:00.000Z")
      }
    ]);

    const failedSlotResult = await executeRecurringScheduleAction(scheduleId);

    expect(failedSlotResult).toMatchObject({
      status: "error",
      message: "Use the failed execution entry below to rerun this slot."
    });
    expect(recurringExecutionCreate).not.toHaveBeenCalled();
  });
});

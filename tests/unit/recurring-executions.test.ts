import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const workspaceId = "ckworkspace000000000000000001";
const managerId = "ckmanager0000000000000000001";
const memberId = "ckmember00000000000000000001";
const reviewerId = "ckreviewer00000000000000001";
const projectId = "ckproject000000000000000001";
const scheduleId = "ckschedule00000000000000001";
const templateId = "cktemplate00000000000000001";

const {
  createActivityEvent,
  transaction,
  recurringScheduleFindMany,
  recurringExecutionFindMany,
  recurringExecutionCreate,
  recurringExecutionUpdate,
  recurringScheduleUpdateMany,
  taskCreate,
  assertWorkspaceUsers,
  createTaskChangeEvents,
  getUserNameMap,
  calculateNextRunAt,
  getDefaultTemplateTaskSummary,
  buildTaskFromTemplateValues
} = vi.hoisted(() => ({
  createActivityEvent: vi.fn(),
  transaction: vi.fn(),
  recurringScheduleFindMany: vi.fn(),
  recurringExecutionFindMany: vi.fn(),
  recurringExecutionCreate: vi.fn(),
  recurringExecutionUpdate: vi.fn(),
  recurringScheduleUpdateMany: vi.fn(),
  taskCreate: vi.fn(),
  assertWorkspaceUsers: vi.fn(),
  createTaskChangeEvents: vi.fn(),
  getUserNameMap: vi.fn(),
  calculateNextRunAt: vi.fn(),
  getDefaultTemplateTaskSummary: vi.fn(),
  buildTaskFromTemplateValues: vi.fn()
}));

vi.mock("@/lib/activity", () => ({
  createActivityEvent
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transaction,
    recurringSchedule: {
      findMany: recurringScheduleFindMany
    },
    recurringExecution: {
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
  getUserNameMap
}));

vi.mock("@/lib/recurring", () => ({
  calculateNextRunAt
}));

vi.mock("@/lib/manager-console", () => ({
  getDefaultTemplateTaskSummary
}));

vi.mock("@/lib/manager-mutations", () => ({
  buildTaskFromTemplateValues
}));

import {
  runRecurringScheduleExecution,
  runRecurringScheduleTick
} from "@/lib/recurring-executions";

type ActivityInput = {
  actorId?: string | null;
  type: string;
  payload?: Record<string, unknown>;
};

type MutationCreateArgs = {
  data: Record<string, unknown>;
};

type MutationUpdateArgs = {
  where?: Record<string, unknown>;
  data: Record<string, unknown>;
};

type TransactionMock = {
  recurringSchedule: {
    updateMany: typeof recurringScheduleUpdateMany;
  };
  recurringExecution: {
    update: typeof recurringExecutionUpdate;
  };
  task: {
    create: typeof taskCreate;
  };
};

function installTransactionMock() {
  transaction.mockImplementation((callback: (tx: TransactionMock) => unknown) =>
    Promise.resolve(
      callback({
        recurringSchedule: {
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

function getActivityInput(type: string) {
  const activityCall = createActivityEvent.mock.calls.find((entry) => {
    const [, input] = entry as [unknown, ActivityInput];
    return input.type === type;
  }) as [unknown, ActivityInput] | undefined;

  return activityCall?.[1];
}

function buildSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: scheduleId,
    workspaceId,
    templateId,
    projectId,
    cadence: "DAILY" as const,
    interval: 1,
    nextRunAt: new Date("2026-03-11T12:00:00.000Z"),
    lastRunAt: new Date("2026-03-10T12:00:00.000Z"),
    isActive: true,
    createdById: "ckadmin00000000000000000001",
    updatedById: managerId,
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    updatedAt: new Date("2026-03-10T00:00:00.000Z"),
    template: {
      id: templateId,
      workspaceId,
      name: "Scheduled inventory digest",
      title: "Publish scheduled inventory digest",
      description: "Publish the inventory digest from the shared recurring pipeline.",
      defaultAssigneeId: memberId,
      defaultReviewerId: reviewerId,
      defaultDueOffsetDays: 2,
      defaultPriority: "MEDIUM" as const,
      defaultStatus: "BACKLOG" as const,
      createdById: "ckadmin00000000000000000001",
      updatedById: managerId,
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-10T00:00:00.000Z"),
      defaultAssignee: {
        id: memberId,
        name: "Ken Operator"
      },
      defaultReviewer: {
        id: reviewerId,
        name: "Mika Reviewer"
      }
    },
    project: {
      id: projectId,
      code: "OPS-ALPHA",
      name: "Harbor inventory rollout"
    },
    ...overrides
  };
}

describe("recurring execution service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T09:00:00.000Z"));

    installTransactionMock();
    assertWorkspaceUsers.mockResolvedValue(undefined);
    createActivityEvent.mockResolvedValue({ id: "event-1" });
    createTaskChangeEvents.mockResolvedValue(undefined);
    getUserNameMap.mockResolvedValue(
      new Map([
        [memberId, "Ken Operator"],
        [reviewerId, "Mika Reviewer"]
      ])
    );
    calculateNextRunAt.mockReturnValue(new Date("2026-03-12T12:00:00.000Z"));
    getDefaultTemplateTaskSummary.mockImplementation(
      ({ templateName, taskTitle }: { templateName: string; taskTitle: string }) =>
        `created "${taskTitle}" from template ${templateName}`
    );
    buildTaskFromTemplateValues.mockReturnValue({
      title: "Publish scheduled inventory digest",
      description: "Publish the inventory digest from the shared recurring pipeline.",
      status: "BACKLOG",
      priority: "MEDIUM",
      assigneeId: memberId,
      reviewerId,
      dueDate: new Date("2026-03-14T12:00:00.000Z")
    });
    recurringExecutionUpdate.mockResolvedValue({});
    recurringScheduleUpdateMany.mockResolvedValue({ count: 1 });
    taskCreate.mockResolvedValue({
      id: "task-1",
      title: "Publish scheduled inventory digest",
      projectId,
      assigneeId: memberId,
      reviewerId,
      createdById: managerId,
      dueDate: new Date("2026-03-14T12:00:00.000Z")
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the same pipeline for USER and SYSTEM execution while changing trigger provenance", async () => {
    const schedule = buildSchedule();

    recurringExecutionCreate
      .mockResolvedValueOnce({ id: "execution-user-1" })
      .mockResolvedValueOnce({ id: "execution-system-1" });

    const manualResult = await runRecurringScheduleExecution({
      schedule,
      scheduledFor: schedule.nextRunAt,
      actor: {
        trigger: "USER",
        triggeredByUserId: managerId,
        taskActorUserId: managerId,
        executionActivityActorId: managerId
      }
    });

    const systemResult = await runRecurringScheduleExecution({
      schedule,
      scheduledFor: new Date("2026-03-13T12:00:00.000Z"),
      actor: {
        trigger: "SYSTEM",
        triggeredByUserId: null,
        taskActorUserId: managerId,
        executionActivityActorId: null
      }
    });

    expect(manualResult).toMatchObject({
      outcome: "SUCCESS",
      executionId: "execution-user-1",
      taskId: "task-1"
    });
    expect(systemResult).toMatchObject({
      outcome: "SUCCESS",
      executionId: "execution-system-1",
      taskId: "task-1"
    });

    expect(recurringExecutionCreate.mock.calls[0]?.[0]).toMatchObject({
      data: {
        triggeredBy: "USER",
        triggeredByUserId: managerId
      }
    });
    expect(recurringExecutionCreate.mock.calls[1]?.[0]).toMatchObject({
      data: {
        triggeredBy: "SYSTEM",
        triggeredByUserId: null
      }
    });

    const scheduledSuccess = createActivityEvent.mock.calls
      .map((entry) => entry[1] as ActivityInput)
      .find(
        (input) =>
          input.type === "RECURRING_EXECUTION_SUCCEEDED" &&
          input.payload?.executionId === "execution-system-1"
      );

    expect(scheduledSuccess?.actorId ?? null).toBeNull();
    expect(scheduledSuccess?.payload).toMatchObject({
      triggeredBy: "SYSTEM"
    });
  });

  it("selects due active schedules for the official tick and records SYSTEM executions", async () => {
    const dueSchedule = buildSchedule();
    const failedSchedule = buildSchedule({
      id: "ckschedule00000000000000002",
      template: {
        ...buildSchedule().template,
        id: "cktemplate00000000000000002",
        name: "Recovery retry drill",
        title: "Reissue launch recovery retry packet"
      }
    });

    recurringScheduleFindMany.mockResolvedValue([dueSchedule, failedSchedule]);
    recurringExecutionFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "execution-failed-1",
          status: "FAILED",
          createdAt: new Date("2026-03-12T08:00:00.000Z")
        }
      ]);
    recurringExecutionCreate.mockResolvedValue({ id: "execution-system-1" });

    const result = await runRecurringScheduleTick({
      now: new Date("2026-03-12T09:00:00.000Z")
    });

    const dueScheduleArgs = getFirstMockArgument<{
      where: {
        isActive: boolean;
        nextRunAt: {
          lte: Date;
        };
      };
      orderBy: Array<Record<string, "asc" | "desc">>;
      include: unknown;
    }>(recurringScheduleFindMany);
    expect(dueScheduleArgs.where).toMatchObject({
      isActive: true,
      nextRunAt: {
        lte: new Date("2026-03-12T09:00:00.000Z")
      }
    });
    expect(dueScheduleArgs.orderBy).toEqual([
      { nextRunAt: "asc" },
      { createdAt: "asc" }
    ]);
    expect(dueScheduleArgs.include).toBeTruthy();
    expect(result).toMatchObject({
      dueCount: 2,
      succeededCount: 1,
      failedCount: 0,
      skippedCount: 1
    });
    expect(result.items[0]).toMatchObject({
      outcome: "SUCCESS",
      executionId: "execution-system-1",
      taskId: "task-1"
    });
    expect(result.items[1]).toMatchObject({
      outcome: "SKIPPED",
      message:
        "This scheduled slot already has a failed execution. Use rerun from the manager console."
    });

    const slotClaimArgs =
      getFirstMockArgument<MutationCreateArgs>(recurringExecutionCreate);
    expect(slotClaimArgs.data).toMatchObject({
      recurringScheduleId: scheduleId,
      triggeredBy: "SYSTEM",
      triggeredByUserId: null
    });

    const scheduleAdvanceArgs =
      getFirstMockArgument<MutationUpdateArgs>(recurringScheduleUpdateMany);
    expect(scheduleAdvanceArgs.where).toMatchObject({
      id: scheduleId,
      nextRunAt: new Date("2026-03-11T12:00:00.000Z")
    });
    expect(scheduleAdvanceArgs.data).toMatchObject({
      updatedById: managerId,
      nextRunAt: new Date("2026-03-12T12:00:00.000Z")
    });
  });

  it("skips duplicate slot claims instead of creating duplicate scheduled tasks", async () => {
    const dueSchedule = buildSchedule();

    recurringScheduleFindMany.mockResolvedValue([dueSchedule]);
    recurringExecutionFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "execution-running-1",
          status: "RUNNING",
          createdAt: new Date("2026-03-12T08:55:00.000Z")
        }
      ]);
    recurringExecutionCreate.mockRejectedValue({ code: "P2002" });

    const result = await runRecurringScheduleTick({
      now: new Date("2026-03-12T09:00:00.000Z")
    });

    expect(result).toMatchObject({
      dueCount: 1,
      succeededCount: 0,
      failedCount: 0,
      skippedCount: 1
    });
    expect(result.items[0]).toMatchObject({
      outcome: "SKIPPED",
      message: "A recurring execution is already running for this scheduled slot."
    });
    expect(taskCreate).not.toHaveBeenCalled();
  });

  it("marks SYSTEM executions failed when scheduled task generation breaks", async () => {
    const dueSchedule = buildSchedule();

    recurringScheduleFindMany.mockResolvedValue([dueSchedule]);
    recurringExecutionFindMany.mockResolvedValueOnce([]);
    recurringExecutionCreate.mockResolvedValue({ id: "execution-system-1" });
    taskCreate.mockRejectedValue(new Error("Nightly slot could not generate the digest task."));

    const result = await runRecurringScheduleTick({
      now: new Date("2026-03-12T09:00:00.000Z")
    });

    expect(result).toMatchObject({
      dueCount: 1,
      succeededCount: 0,
      failedCount: 1,
      skippedCount: 0
    });
    expect(result.items[0]).toMatchObject({
      outcome: "FAILED",
      executionId: "execution-system-1",
      message: "Nightly slot could not generate the digest task."
    });

    const failedExecutionUpdateArgs =
      getFirstMockArgument<MutationUpdateArgs>(recurringExecutionUpdate);
    expect(failedExecutionUpdateArgs.where).toMatchObject({
      id: "execution-system-1"
    });
    expect(failedExecutionUpdateArgs.data).toMatchObject({
      status: "FAILED",
      errorMessage: "Nightly slot could not generate the digest task.",
      generatedTaskCount: 0
    });
    expect(getActivityInput("RECURRING_EXECUTION_FAILED")?.payload).toMatchObject(
      {
        executionId: "execution-system-1",
        triggeredBy: "SYSTEM"
      }
    );
  });
});

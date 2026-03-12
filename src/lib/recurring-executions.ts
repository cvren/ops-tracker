import {
  ActivityEventType,
  RecurringExecutionStatus,
  RecurringTriggerSource,
  type Prisma,
  type TaskStatus
} from "@prisma/client";

import { createActivityEvent } from "@/lib/activity";
import { getDefaultTemplateTaskSummary } from "@/lib/manager-console";
import { buildTaskFromTemplateValues } from "@/lib/manager-mutations";
import { prisma } from "@/lib/prisma";
import { calculateNextRunAt } from "@/lib/recurring";
import {
  assertWorkspaceUsers,
  collectSelectedUserIds,
  createTaskChangeEvents,
  getUserNameMap
} from "@/lib/task-action-helpers";

const recurringScheduleExecutionInclude = {
  template: {
    include: {
      defaultAssignee: {
        select: {
          id: true,
          name: true
        }
      },
      defaultReviewer: {
        select: {
          id: true,
          name: true
        }
      }
    }
  },
  project: {
    select: {
      id: true,
      code: true,
      name: true
    }
  }
} as const satisfies Prisma.RecurringScheduleInclude;

const recurringExecutionInclude = {
  recurringSchedule: {
    include: recurringScheduleExecutionInclude
  },
  generatedTasks: {
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      title: true
    }
  }
} as const satisfies Prisma.RecurringExecutionInclude;

type WorkspaceSchedule = Prisma.RecurringScheduleGetPayload<{
  include: typeof recurringScheduleExecutionInclude;
}>;

type SlotExecutionSummary = {
  id: string;
  status: RecurringExecutionStatus;
  createdAt: Date;
};

type ExecutionActivityActorId = string | null;

type ExecutionActor =
  | {
      trigger: "USER";
      triggeredByUserId: string;
      taskActorUserId: string;
      executionActivityActorId: string;
    }
  | {
      trigger: "SYSTEM";
      triggeredByUserId: null;
      taskActorUserId: string;
      executionActivityActorId: ExecutionActivityActorId;
    };

type ExecuteRecurringScheduleInput = {
  schedule: WorkspaceSchedule;
  scheduledFor: Date;
  actor: ExecutionActor;
  rerunOfExecutionId?: string;
};

type SharedExecutionResult =
  | {
      outcome: "SUCCESS";
      executionId: string;
      taskId: string;
      taskTitle: string;
      projectId: string;
      recurringScheduleId: string;
      scheduledFor: Date;
      message: string;
    }
  | {
      outcome: "FAILED";
      executionId: string;
      projectId: string;
      recurringScheduleId: string;
      scheduledFor: Date;
      message: string;
    }
  | {
      outcome: "DUPLICATE";
      projectId: string;
      recurringScheduleId: string;
      scheduledFor: Date;
      message: string;
    };

type ScheduledTickItem =
  | {
      scheduleId: string;
      templateName: string;
      scheduledFor: Date;
      outcome: "SUCCESS";
      executionId: string;
      taskId: string;
      message: string;
    }
  | {
      scheduleId: string;
      templateName: string;
      scheduledFor: Date;
      outcome: "FAILED" | "SKIPPED";
      executionId?: string;
      message: string;
    };

export type RecurringTickResult = {
  startedAt: Date;
  finishedAt: Date;
  dueCount: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
  items: ScheduledTickItem[];
};

function getRecurringExecutionFailureMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Recurring schedule execution failed.";
}

function isSlotClaimConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

async function recordRecurringExecutionActivity(input: {
  workspaceId: string;
  projectId: string;
  taskId?: string | null;
  actorId: ExecutionActivityActorId;
  type: ActivityEventType;
  payload: Prisma.InputJsonObject;
}) {
  await prisma.$transaction(async (tx) => {
    await createActivityEvent(tx, {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      actorId: input.actorId,
      type: input.type,
      payload: input.payload
    });
  });
}

export async function createTaskFromTemplateInTransaction(input: {
  tx: Prisma.TransactionClient;
  workspaceId: string;
  projectId: string;
  taskActorUserId: string;
  template: {
    id: string;
    name: string;
    title: string;
    description: string;
    defaultAssigneeId: string | null;
    defaultReviewerId: string | null;
    defaultDueOffsetDays: number | null;
    defaultPriority: "LOW" | "MEDIUM" | "HIGH";
    defaultStatus: TaskStatus;
    defaultAssignee?: {
      name: string;
    } | null;
    defaultReviewer?: {
      name: string;
    } | null;
  };
  now: Date;
  scheduleId?: string;
  recurringExecutionId?: string;
}) {
  const taskValues = buildTaskFromTemplateValues(input.template, input.now);
  const createdTask = await input.tx.task.create({
    data: {
      projectId: input.projectId,
      recurringExecutionId: input.recurringExecutionId ?? null,
      ...taskValues,
      createdById: input.taskActorUserId,
      updatedById: input.taskActorUserId
    }
  });

  await createActivityEvent(input.tx, {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    taskId: createdTask.id,
    actorId: input.taskActorUserId,
    type: ActivityEventType.TASK_CREATED,
    payload: {
      summary: `created task "${createdTask.title}"`
    }
  });

  const userNameMap = await getUserNameMap(
    input.tx,
    collectSelectedUserIds([
      createdTask.assigneeId,
      createdTask.reviewerId
    ])
  );

  await createTaskChangeEvents(input.tx, {
    actorId: input.taskActorUserId,
    workspaceId: input.workspaceId,
    task: {
      id: createdTask.id,
      title: createdTask.title,
      projectId: createdTask.projectId,
      assigneeId: createdTask.assigneeId,
      reviewerId: createdTask.reviewerId,
      createdById: createdTask.createdById,
      dueDate: createdTask.dueDate,
      assigneeName: createdTask.assigneeId
        ? userNameMap.get(createdTask.assigneeId)
        : null,
      reviewerName: createdTask.reviewerId
        ? userNameMap.get(createdTask.reviewerId)
        : null
    },
    previous: {
      assigneeId: null,
      reviewerId: null,
      dueDate: null
    },
    generalChangedFields: []
  });

  await createActivityEvent(input.tx, {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    taskId: createdTask.id,
    actorId: input.taskActorUserId,
    type: ActivityEventType.TASK_CREATED_FROM_TEMPLATE,
    payload: {
      templateId: input.template.id,
      scheduleId: input.scheduleId ?? null,
      executionId: input.recurringExecutionId ?? null,
      summary: getDefaultTemplateTaskSummary({
        templateName: input.template.name,
        taskTitle: createdTask.title
      })
    }
  });

  return createdTask;
}

export async function getWorkspaceRecurringSchedule(
  workspaceId: string,
  scheduleId: string
) {
  return prisma.recurringSchedule.findFirst({
    where: {
      id: scheduleId,
      workspaceId
    },
    include: recurringScheduleExecutionInclude
  });
}

export async function getWorkspaceRecurringExecution(
  workspaceId: string,
  executionId: string
) {
  return prisma.recurringExecution.findFirst({
    where: {
      id: executionId,
      workspaceId
    },
    include: recurringExecutionInclude
  });
}

export async function listScheduleSlotExecutions(input: {
  workspaceId: string;
  recurringScheduleId: string;
  scheduledFor: Date;
}) {
  return prisma.recurringExecution.findMany({
    where: {
      workspaceId: input.workspaceId,
      recurringScheduleId: input.recurringScheduleId,
      scheduledFor: input.scheduledFor
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      createdAt: true
    }
  });
}

export function getManualGenerateNowBlockMessage(
  executions: SlotExecutionSummary[]
) {
  if (executions.some((execution) => execution.status === "RUNNING")) {
    return "This schedule already has a running execution for its current slot.";
  }

  if (
    executions.some(
      (execution) =>
        execution.status === "SUCCESS" || execution.status === "SKIPPED"
    )
  ) {
    return "This schedule already answered its current run slot.";
  }

  if (executions.some((execution) => execution.status === "FAILED")) {
    return "Use the failed execution entry below to rerun this slot.";
  }

  return null;
}

export function getRerunBlockMessage(input: {
  failedExecutionId: string;
  executions: SlotExecutionSummary[];
}) {
  if (
    input.executions.some(
      (execution) =>
        execution.id !== input.failedExecutionId && execution.status === "RUNNING"
    )
  ) {
    return "This slot already has a running rerun in progress.";
  }

  if (
    input.executions.some(
      (execution) =>
        execution.id !== input.failedExecutionId &&
        (execution.status === "SUCCESS" || execution.status === "SKIPPED")
    )
  ) {
    return "This failed slot has already been recovered.";
  }

  return null;
}

export function getScheduledTickBlockMessage(executions: SlotExecutionSummary[]) {
  if (executions.some((execution) => execution.status === "RUNNING")) {
    return "A recurring execution is already running for this scheduled slot.";
  }

  if (
    executions.some(
      (execution) =>
        execution.status === "SUCCESS" || execution.status === "SKIPPED"
    )
  ) {
    return "This scheduled slot has already been answered.";
  }

  if (executions.some((execution) => execution.status === "FAILED")) {
    return "This scheduled slot already has a failed execution. Use rerun from the manager console.";
  }

  return null;
}

function getDuplicateSlotMessage(input: {
  slotExecutions: SlotExecutionSummary[];
  rerunOfExecutionId?: string;
  trigger: RecurringTriggerSource;
}) {
  if (input.rerunOfExecutionId) {
    return (
      getRerunBlockMessage({
        failedExecutionId: input.rerunOfExecutionId,
        executions: input.slotExecutions
      }) ?? "This failed slot is no longer available for rerun."
    );
  }

  if (input.trigger === RecurringTriggerSource.SYSTEM) {
    return (
      getScheduledTickBlockMessage(input.slotExecutions) ??
      "This scheduled slot has already been claimed."
    );
  }

  return (
    getManualGenerateNowBlockMessage(input.slotExecutions) ??
    "This schedule already has an execution for the current slot."
  );
}

export async function runRecurringScheduleExecution(
  input: ExecuteRecurringScheduleInput
): Promise<SharedExecutionResult> {
  const startedAt = new Date();

  let execution: {
    id: string;
  };

  try {
    execution = await prisma.recurringExecution.create({
      data: {
        recurringScheduleId: input.schedule.id,
        workspaceId: input.schedule.workspaceId,
        status: RecurringExecutionStatus.RUNNING,
        scheduledFor: input.scheduledFor,
        startedAt,
        triggeredBy: input.actor.trigger,
        triggeredByUserId: input.actor.triggeredByUserId,
        rerunOfExecutionId: input.rerunOfExecutionId ?? null
      }
    });
  } catch (error) {
    if (!isSlotClaimConflict(error)) {
      throw error;
    }

    const slotExecutions = await listScheduleSlotExecutions({
      workspaceId: input.schedule.workspaceId,
      recurringScheduleId: input.schedule.id,
      scheduledFor: input.scheduledFor
    });

    return {
      outcome: "DUPLICATE",
      projectId: input.schedule.projectId,
      recurringScheduleId: input.schedule.id,
      scheduledFor: input.scheduledFor,
      message: getDuplicateSlotMessage({
        slotExecutions,
        rerunOfExecutionId: input.rerunOfExecutionId,
        trigger: input.actor.trigger
      })
    };
  }

  if (input.rerunOfExecutionId) {
    await recordRecurringExecutionActivity({
      workspaceId: input.schedule.workspaceId,
      projectId: input.schedule.projectId,
      actorId: input.actor.executionActivityActorId,
      type: ActivityEventType.RECURRING_EXECUTION_RERUN,
      payload: {
        executionId: execution.id,
        recurringScheduleId: input.schedule.id,
        rerunOfExecutionId: input.rerunOfExecutionId,
        triggeredBy: input.actor.trigger,
        summary: `reran failed execution for ${input.schedule.template.name}`
      }
    });
  }

  await recordRecurringExecutionActivity({
    workspaceId: input.schedule.workspaceId,
    projectId: input.schedule.projectId,
    actorId: input.actor.executionActivityActorId,
    type: ActivityEventType.RECURRING_EXECUTION_STARTED,
    payload: {
      executionId: execution.id,
      recurringScheduleId: input.schedule.id,
      templateId: input.schedule.template.id,
      scheduledFor: input.scheduledFor.toISOString(),
      triggeredBy: input.actor.trigger,
      summary: `started recurring execution for ${input.schedule.template.name}`
    }
  });

  try {
    await assertWorkspaceUsers(
      input.schedule.workspaceId,
      collectSelectedUserIds([
        input.schedule.template.defaultAssigneeId,
        input.schedule.template.defaultReviewerId
      ])
    );

    const result = await prisma.$transaction(async (tx) => {
      const task = await createTaskFromTemplateInTransaction({
        tx,
        workspaceId: input.schedule.workspaceId,
        projectId: input.schedule.projectId,
        taskActorUserId: input.actor.taskActorUserId,
        template: input.schedule.template,
        now: startedAt,
        scheduleId: input.schedule.id,
        recurringExecutionId: execution.id
      });

      await tx.recurringSchedule.updateMany({
        where: {
          id: input.schedule.id,
          nextRunAt: input.scheduledFor
        },
        data: {
          lastRunAt: startedAt,
          updatedById: input.actor.taskActorUserId,
          nextRunAt: calculateNextRunAt({
            cadence: input.schedule.cadence,
            interval: input.schedule.interval,
            nextRunAt: input.scheduledFor
          })
        }
      });

      const finishedAt = new Date();
      await tx.recurringExecution.update({
        where: {
          id: execution.id
        },
        data: {
          status: RecurringExecutionStatus.SUCCESS,
          finishedAt,
          errorMessage: null,
          generatedTaskCount: 1
        }
      });

      await createActivityEvent(tx, {
        workspaceId: input.schedule.workspaceId,
        projectId: input.schedule.projectId,
        taskId: task.id,
        actorId: input.actor.executionActivityActorId,
        type: ActivityEventType.RECURRING_EXECUTION_SUCCEEDED,
        payload: {
          executionId: execution.id,
          recurringScheduleId: input.schedule.id,
          templateId: input.schedule.template.id,
          generatedTaskCount: 1,
          generatedTaskIds: [task.id],
          triggeredBy: input.actor.trigger,
          summary: `completed recurring execution for ${input.schedule.template.name}`
        }
      });

      await createActivityEvent(tx, {
        workspaceId: input.schedule.workspaceId,
        projectId: input.schedule.projectId,
        taskId: task.id,
        actorId: input.actor.executionActivityActorId,
        type: ActivityEventType.RECURRING_SCHEDULE_EXECUTED,
        payload: {
          executionId: execution.id,
          scheduleId: input.schedule.id,
          templateId: input.schedule.template.id,
          triggeredBy: input.actor.trigger,
          summary: `generated recurring task from ${input.schedule.template.name}`
        }
      });

      return { task };
    });

    return {
      outcome: "SUCCESS",
      executionId: execution.id,
      taskId: result.task.id,
      taskTitle: result.task.title,
      projectId: input.schedule.projectId,
      recurringScheduleId: input.schedule.id,
      scheduledFor: input.scheduledFor,
      message: `Generated ${result.task.title}.`
    };
  } catch (error) {
    const failureMessage = getRecurringExecutionFailureMessage(error);

    await prisma.recurringExecution.update({
      where: {
        id: execution.id
      },
      data: {
        status: RecurringExecutionStatus.FAILED,
        finishedAt: new Date(),
        errorMessage: failureMessage,
        generatedTaskCount: 0
      }
    });

    await recordRecurringExecutionActivity({
      workspaceId: input.schedule.workspaceId,
      projectId: input.schedule.projectId,
      actorId: input.actor.executionActivityActorId,
      type: ActivityEventType.RECURRING_EXECUTION_FAILED,
      payload: {
        executionId: execution.id,
        recurringScheduleId: input.schedule.id,
        templateId: input.schedule.template.id,
        errorMessage: failureMessage,
        triggeredBy: input.actor.trigger,
        summary: `failed recurring execution for ${input.schedule.template.name}: ${failureMessage}`
      }
    });

    return {
      outcome: "FAILED",
      executionId: execution.id,
      projectId: input.schedule.projectId,
      recurringScheduleId: input.schedule.id,
      scheduledFor: input.scheduledFor,
      message: failureMessage
    };
  }
}

async function listDueRecurringSchedules(now: Date) {
  return prisma.recurringSchedule.findMany({
    where: {
      isActive: true,
      nextRunAt: {
        lte: now
      }
    },
    orderBy: [{ nextRunAt: "asc" }, { createdAt: "asc" }],
    include: recurringScheduleExecutionInclude
  });
}

export async function runRecurringScheduleTick(input?: {
  now?: Date;
}): Promise<RecurringTickResult> {
  const startedAt = new Date();
  const now = input?.now ?? startedAt;
  const dueSchedules = await listDueRecurringSchedules(now);
  const items: ScheduledTickItem[] = [];

  for (const schedule of dueSchedules) {
    const blockMessage = getScheduledTickBlockMessage(
      await listScheduleSlotExecutions({
        workspaceId: schedule.workspaceId,
        recurringScheduleId: schedule.id,
        scheduledFor: schedule.nextRunAt
      })
    );

    if (blockMessage) {
      items.push({
        scheduleId: schedule.id,
        templateName: schedule.template.name,
        scheduledFor: schedule.nextRunAt,
        outcome: "SKIPPED",
        message: blockMessage
      });
      continue;
    }

    const result = await runRecurringScheduleExecution({
      schedule,
      scheduledFor: schedule.nextRunAt,
      actor: {
        trigger: RecurringTriggerSource.SYSTEM,
        triggeredByUserId: null,
        taskActorUserId: schedule.updatedById,
        executionActivityActorId: null
      }
    });

    if (result.outcome === "SUCCESS") {
      items.push({
        scheduleId: schedule.id,
        templateName: schedule.template.name,
        scheduledFor: schedule.nextRunAt,
        outcome: "SUCCESS",
        executionId: result.executionId,
        taskId: result.taskId,
        message: result.message
      });
      continue;
    }

    if (result.outcome === "FAILED") {
      items.push({
        scheduleId: schedule.id,
        templateName: schedule.template.name,
        scheduledFor: schedule.nextRunAt,
        outcome: "FAILED",
        executionId: result.executionId,
        message: result.message
      });
      continue;
    }

    items.push({
      scheduleId: schedule.id,
      templateName: schedule.template.name,
      scheduledFor: schedule.nextRunAt,
      outcome: "SKIPPED",
      message: result.message
    });
  }

  return {
    startedAt,
    finishedAt: new Date(),
    dueCount: dueSchedules.length,
    succeededCount: items.filter((item) => item.outcome === "SUCCESS").length,
    failedCount: items.filter((item) => item.outcome === "FAILED").length,
    skippedCount: items.filter((item) => item.outcome === "SKIPPED").length,
    items
  };
}

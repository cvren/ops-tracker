"use server";

import {
  ActivityEventType,
  WorkspaceRole
} from "@prisma/client";

import { createActivityEvent } from "@/lib/activity";
import {
  getBulkUpdateSummary,
  getDefaultTemplateTaskSummary
} from "@/lib/manager-console";
import {
  buildBulkTaskUpdatePlan,
  dedupeBulkTaskIds,
  getBulkTaskValidationError,
  buildTaskFromTemplateValues
} from "@/lib/manager-mutations";
import { prisma } from "@/lib/prisma";
import { calculateNextRunAt } from "@/lib/recurring";
import {
  assertWorkspaceUsers,
  collectSelectedUserIds,
  createTaskChangeEvents,
  getUserNameMap,
  getWorkspaceProject,
  revalidateTaskSurfaces
} from "@/lib/task-action-helpers";
import {
  flattenFieldErrors,
  getStringValue,
  normalizeDueDate,
  normalizeOptionalInteger,
  normalizeOptionalText,
  parseBulkTaskUpdateFormData,
  parseCreateTaskFromTemplateFormData,
  parseRecurringScheduleFormData,
  parseTaskTemplateFormData
} from "@/lib/validation";
import { requireWorkspaceRole } from "@/lib/workspace";
import { type ActionState } from "@/lib/forms";
import type { TaskStatus } from "@prisma/client";

async function getWorkspaceTemplate(workspaceId: string, templateId: string) {
  return prisma.taskTemplate.findFirst({
    where: {
      id: templateId,
      workspaceId
    },
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
  });
}

async function getWorkspaceSchedule(workspaceId: string, scheduleId: string) {
  return prisma.recurringSchedule.findFirst({
    where: {
      id: scheduleId,
      workspaceId
    },
    include: {
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
    }
  });
}

async function ensureUniqueTemplateName(
  workspaceId: string,
  templateName: string,
  excludedTemplateId?: string
) {
  const existingTemplate = await prisma.taskTemplate.findFirst({
    where: {
      workspaceId,
      name: templateName,
      ...(excludedTemplateId
        ? {
            id: {
              not: excludedTemplateId
            }
          }
        : {})
    },
    select: {
      id: true
    }
  });

  if (existingTemplate) {
    throw new Error("Template name already exists in this workspace.");
  }
}

async function createTaskFromTemplateInTransaction(input: {
  tx: Parameters<typeof createTaskChangeEvents>[0];
  workspaceId: string;
  projectId: string;
  actorId: string;
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
}) {
  const taskValues = buildTaskFromTemplateValues(input.template, input.now);
  const createdTask = await input.tx.task.create({
    data: {
      projectId: input.projectId,
      ...taskValues,
      createdById: input.actorId,
      updatedById: input.actorId
    }
  });

  await createActivityEvent(input.tx, {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    taskId: createdTask.id,
    actorId: input.actorId,
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
    actorId: input.actorId,
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
    actorId: input.actorId,
    type: ActivityEventType.TASK_CREATED_FROM_TEMPLATE,
    payload: {
      templateId: input.template.id,
      scheduleId: input.scheduleId ?? null,
      summary: getDefaultTemplateTaskSummary({
        templateName: input.template.name,
        taskTitle: createdTask.title
      })
    }
  });

  return createdTask;
}

export async function bulkUpdateTasksAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole(WorkspaceRole.ADMIN);
    const parsed = parseBulkTaskUpdateFormData(formData);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Bulk update validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    if (parsed.data.status !== "" && parsed.data.blockedState !== "keep") {
      return {
        status: "error",
        message: "Choose either a status change or blocked state change, not both."
      };
    }

    const taskIds = dedupeBulkTaskIds(parsed.data.taskIds);

    await assertWorkspaceUsers(
      context.workspace.id,
      collectSelectedUserIds([
        parsed.data.assigneeId,
        parsed.data.reviewerId
      ])
    );

    const dueDate = normalizeDueDate(parsed.data.dueDate);
    const blockedReason = normalizeOptionalText(parsed.data.blockedReason);
    const blockedCategory =
      parsed.data.blockedCategory === ""
        ? null
        : parsed.data.blockedCategory;
    const now = new Date();
    const updateValues = {
      assigneeId: parsed.data.assigneeId || undefined,
      reviewerId: parsed.data.reviewerId || undefined,
      dueDate: parsed.data.dueDate ? dueDate : undefined,
      status: parsed.data.status || undefined,
      priority: parsed.data.priority || undefined,
      blockedState: parsed.data.blockedState,
      blockedReason,
      blockedCategory
    } as const;

    const result = await prisma.$transaction(async (tx) => {
      const tasks = await tx.task.findMany({
        where: {
          id: {
            in: taskIds
          },
          project: {
            workspaceId: context.workspace.id
          }
        },
        include: {
          project: {
            select: {
              id: true,
              code: true
            }
          },
          assignee: {
            select: {
              name: true
            }
          },
          reviewer: {
            select: {
              name: true
            }
          }
        }
      });

      if (tasks.length !== taskIds.length) {
        throw new Error("Some selected tasks are no longer available.");
      }

      for (const task of tasks) {
        const validationError = getBulkTaskValidationError(task, updateValues);

        if (validationError) {
          throw new Error(validationError);
        }
      }

      let updatedCount = 0;
      const updatedProjectIds = new Set<string>();

      for (const task of tasks) {
        const plan = buildBulkTaskUpdatePlan(task, updateValues, now);

        if (plan.changedFields.length === 0) {
          continue;
        }

        updatedCount += 1;
        updatedProjectIds.add(task.projectId);

        await tx.task.update({
          where: {
            id: task.id
          },
          data: {
            ...plan.data,
            updatedById: context.user.id
          }
        });

        await createActivityEvent(tx, {
          workspaceId: context.workspace.id,
          projectId: task.projectId,
          taskId: task.id,
          actorId: context.user.id,
          type: ActivityEventType.TASK_BULK_UPDATED,
          payload: {
            changedFields: plan.changedFields,
            summary: getBulkUpdateSummary(plan.changedFields)
          }
        });
      }

      return {
        projectIds: [...updatedProjectIds],
        updatedCount
      };
    });

    if (result.updatedCount === 0) {
      return {
        status: "error",
        message: "No selected tasks needed the requested changes."
      };
    }

    revalidateTaskSurfaces({
      projectIds: result.projectIds
    });

    return {
      status: "success",
      message: `Updated ${result.updatedCount} task${result.updatedCount === 1 ? "" : "s"}.`
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Bulk update failed."
    };
  }
}

export async function createTaskTemplateAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole(WorkspaceRole.ADMIN);
    const parsed = parseTaskTemplateFormData(formData);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Template validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    await assertWorkspaceUsers(
      context.workspace.id,
      collectSelectedUserIds([
        parsed.data.defaultAssigneeId,
        parsed.data.defaultReviewerId
      ])
    );
    await ensureUniqueTemplateName(context.workspace.id, parsed.data.name);

    const template = await prisma.$transaction(async (tx) => {
      const createdTemplate = await tx.taskTemplate.create({
        data: {
          workspaceId: context.workspace.id,
          name: parsed.data.name,
          title: parsed.data.title,
          description: parsed.data.description,
          defaultAssigneeId: parsed.data.defaultAssigneeId || null,
          defaultReviewerId: parsed.data.defaultReviewerId || null,
          defaultDueOffsetDays: normalizeOptionalInteger(
            parsed.data.defaultDueOffsetDays
          ),
          defaultPriority: parsed.data.defaultPriority,
          defaultStatus: parsed.data.defaultStatus,
          createdById: context.user.id,
          updatedById: context.user.id
        }
      });

      await createActivityEvent(tx, {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        type: ActivityEventType.TASK_TEMPLATE_CREATED,
        payload: {
          templateId: createdTemplate.id,
          summary: `created template ${createdTemplate.name}`
        }
      });

      return createdTemplate;
    });

    revalidateTaskSurfaces({});

    return {
      status: "success",
      message: `Template ${template.name} created.`,
      entityId: template.id
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Template creation failed."
    };
  }
}

export async function updateTaskTemplateAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole(WorkspaceRole.ADMIN);
    const templateId = getStringValue(formData, "templateId");
    const parsed = parseTaskTemplateFormData(formData);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Template validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    const existingTemplate = await getWorkspaceTemplate(
      context.workspace.id,
      templateId
    );

    if (!existingTemplate) {
      return {
        status: "error",
        message: "Template not found."
      };
    }

    await assertWorkspaceUsers(
      context.workspace.id,
      collectSelectedUserIds([
        parsed.data.defaultAssigneeId,
        parsed.data.defaultReviewerId
      ])
    );
    await ensureUniqueTemplateName(
      context.workspace.id,
      parsed.data.name,
      templateId
    );

    const changedFields = [
      existingTemplate.name !== parsed.data.name ? "name" : null,
      existingTemplate.title !== parsed.data.title ? "title" : null,
      existingTemplate.description !== parsed.data.description
        ? "description"
        : null,
      existingTemplate.defaultAssigneeId !==
      (parsed.data.defaultAssigneeId || null)
        ? "default owner"
        : null,
      existingTemplate.defaultReviewerId !==
      (parsed.data.defaultReviewerId || null)
        ? "default reviewer"
        : null,
      existingTemplate.defaultDueOffsetDays !==
      normalizeOptionalInteger(parsed.data.defaultDueOffsetDays)
        ? "default due offset"
        : null,
      existingTemplate.defaultPriority !== parsed.data.defaultPriority
        ? "default priority"
        : null,
      existingTemplate.defaultStatus !== parsed.data.defaultStatus
        ? "default status"
        : null
    ].filter(Boolean);

    const template = await prisma.$transaction(async (tx) => {
      const updatedTemplate = await tx.taskTemplate.update({
        where: {
          id: templateId
        },
        data: {
          name: parsed.data.name,
          title: parsed.data.title,
          description: parsed.data.description,
          defaultAssigneeId: parsed.data.defaultAssigneeId || null,
          defaultReviewerId: parsed.data.defaultReviewerId || null,
          defaultDueOffsetDays: normalizeOptionalInteger(
            parsed.data.defaultDueOffsetDays
          ),
          defaultPriority: parsed.data.defaultPriority,
          defaultStatus: parsed.data.defaultStatus,
          updatedById: context.user.id
        }
      });

      if (changedFields.length > 0) {
        await createActivityEvent(tx, {
          workspaceId: context.workspace.id,
          actorId: context.user.id,
          type: ActivityEventType.TASK_TEMPLATE_UPDATED,
          payload: {
            templateId: updatedTemplate.id,
            changedFields,
            summary: `updated template ${updatedTemplate.name}`
          }
        });
      }

      return updatedTemplate;
    });

    revalidateTaskSurfaces({});

    return {
      status: "success",
      message: "Template updated.",
      entityId: template.id
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Template update failed."
    };
  }
}

export async function deleteTaskTemplateAction(formData: FormData) {
  const context = await requireWorkspaceRole(WorkspaceRole.ADMIN);
  const templateId = getStringValue(formData, "templateId");
  const template = await prisma.taskTemplate.findFirst({
    where: {
      id: templateId,
      workspaceId: context.workspace.id
    },
    include: {
      _count: {
        select: {
          recurringSchedules: true
        }
      }
    }
  });

  if (!template) {
    throw new Error("Template not found.");
  }

  if (template._count.recurringSchedules > 0) {
    throw new Error("Delete recurring schedules that use this template first.");
  }

  await prisma.taskTemplate.delete({
    where: {
      id: templateId
    }
  });

  revalidateTaskSurfaces({});
}

export async function createTaskFromTemplateAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole(WorkspaceRole.ADMIN);
    const parsed = parseCreateTaskFromTemplateFormData(formData);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Template generation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    const [template, project] = await Promise.all([
      getWorkspaceTemplate(context.workspace.id, parsed.data.templateId),
      getWorkspaceProject(context.workspace.id, parsed.data.projectId)
    ]);

    if (!template || !project) {
      return {
        status: "error",
        message: "Choose a valid template and project."
      };
    }

    await assertWorkspaceUsers(
      context.workspace.id,
      collectSelectedUserIds([
        template.defaultAssigneeId,
        template.defaultReviewerId
      ])
    );

    const now = new Date();
    const task = await prisma.$transaction(async (tx) =>
      createTaskFromTemplateInTransaction({
        tx,
        workspaceId: context.workspace.id,
        projectId: project.id,
        actorId: context.user.id,
        template,
        now
      })
    );

    revalidateTaskSurfaces({
      taskId: task.id,
      projectIds: [project.id]
    });

    return {
      status: "success",
      message: `Created task from template ${template.name}.`,
      entityId: task.id
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Template generation failed."
    };
  }
}

export async function createRecurringScheduleAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole(WorkspaceRole.ADMIN);
    const parsed = parseRecurringScheduleFormData(formData);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Recurring schedule validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    const [template, project] = await Promise.all([
      getWorkspaceTemplate(context.workspace.id, parsed.data.templateId),
      getWorkspaceProject(context.workspace.id, parsed.data.projectId)
    ]);

    if (!template || !project) {
      return {
        status: "error",
        message: "Choose a valid template and project."
      };
    }

    const schedule = await prisma.$transaction(async (tx) => {
      const createdSchedule = await tx.recurringSchedule.create({
        data: {
          workspaceId: context.workspace.id,
          templateId: template.id,
          projectId: project.id,
          cadence: parsed.data.cadence,
          interval: Number(parsed.data.interval),
          nextRunAt: normalizeDueDate(parsed.data.nextRunAt) as Date,
          isActive: parsed.data.isActive,
          createdById: context.user.id,
          updatedById: context.user.id
        }
      });

      await createActivityEvent(tx, {
        workspaceId: context.workspace.id,
        projectId: project.id,
        actorId: context.user.id,
        type: ActivityEventType.RECURRING_SCHEDULE_CREATED,
        payload: {
          scheduleId: createdSchedule.id,
          templateId: template.id,
          summary: `created recurring schedule for ${template.name}`
        }
      });

      return createdSchedule;
    });

    revalidateTaskSurfaces({
      projectIds: [project.id]
    });

    return {
      status: "success",
      message: "Recurring schedule created.",
      entityId: schedule.id
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Recurring schedule creation failed."
    };
  }
}

export async function updateRecurringScheduleAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole(WorkspaceRole.ADMIN);
    const scheduleId = getStringValue(formData, "scheduleId");
    const parsed = parseRecurringScheduleFormData(formData);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Recurring schedule validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    const existingSchedule = await getWorkspaceSchedule(
      context.workspace.id,
      scheduleId
    );

    if (!existingSchedule) {
      return {
        status: "error",
        message: "Recurring schedule not found."
      };
    }

    const [template, project] = await Promise.all([
      getWorkspaceTemplate(context.workspace.id, parsed.data.templateId),
      getWorkspaceProject(context.workspace.id, parsed.data.projectId)
    ]);

    if (!template || !project) {
      return {
        status: "error",
        message: "Choose a valid template and project."
      };
    }

    const nextRunAt = normalizeDueDate(parsed.data.nextRunAt) as Date;
    const changedFields = [
      existingSchedule.templateId !== template.id ? "template" : null,
      existingSchedule.projectId !== project.id ? "project" : null,
      existingSchedule.cadence !== parsed.data.cadence ? "cadence" : null,
      existingSchedule.interval !== Number(parsed.data.interval)
        ? "interval"
        : null,
      existingSchedule.nextRunAt.getTime() !== nextRunAt.getTime()
        ? "next run"
        : null,
      existingSchedule.isActive !== parsed.data.isActive ? "active state" : null
    ].filter(Boolean);

    const schedule = await prisma.$transaction(async (tx) => {
      const updatedSchedule = await tx.recurringSchedule.update({
        where: {
          id: scheduleId
        },
        data: {
          templateId: template.id,
          projectId: project.id,
          cadence: parsed.data.cadence,
          interval: Number(parsed.data.interval),
          nextRunAt,
          isActive: parsed.data.isActive,
          updatedById: context.user.id
        }
      });

      if (changedFields.length > 0) {
        await createActivityEvent(tx, {
          workspaceId: context.workspace.id,
          projectId: project.id,
          actorId: context.user.id,
          type: ActivityEventType.RECURRING_SCHEDULE_UPDATED,
          payload: {
            scheduleId: updatedSchedule.id,
            templateId: template.id,
            changedFields,
            summary: `updated recurring schedule for ${template.name}`
          }
        });
      }

      return updatedSchedule;
    });

    revalidateTaskSurfaces({
      projectIds: [existingSchedule.projectId, project.id]
    });

    return {
      status: "success",
      message: "Recurring schedule updated.",
      entityId: schedule.id
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Recurring schedule update failed."
    };
  }
}

export async function executeRecurringScheduleAction(
  scheduleId: string
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole(WorkspaceRole.ADMIN);
    const schedule = await getWorkspaceSchedule(context.workspace.id, scheduleId);

    if (!schedule) {
      return {
        status: "error",
        message: "Recurring schedule not found."
      };
    }

    if (!schedule.isActive) {
      return {
        status: "error",
        message: "Activate the schedule before generating tasks."
      };
    }

    await assertWorkspaceUsers(
      context.workspace.id,
      collectSelectedUserIds([
        schedule.template.defaultAssigneeId,
        schedule.template.defaultReviewerId
      ])
    );

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const execution = await tx.recurringExecution.create({
        data: {
          scheduleId: schedule.id,
          scheduledFor: schedule.nextRunAt
        }
      });

      const task = await createTaskFromTemplateInTransaction({
        tx,
        workspaceId: context.workspace.id,
        projectId: schedule.projectId,
        actorId: context.user.id,
        template: schedule.template,
        now,
        scheduleId: schedule.id
      });

      await tx.recurringExecution.update({
        where: {
          id: execution.id
        },
        data: {
          createdTaskId: task.id
        }
      });

      const updatedSchedule = await tx.recurringSchedule.update({
        where: {
          id: schedule.id
        },
        data: {
          lastRunAt: now,
          updatedById: context.user.id,
          nextRunAt: calculateNextRunAt({
            cadence: schedule.cadence,
            interval: schedule.interval,
            nextRunAt: schedule.nextRunAt
          })
        }
      });

      await createActivityEvent(tx, {
        workspaceId: context.workspace.id,
        projectId: schedule.projectId,
        taskId: task.id,
        actorId: context.user.id,
        type: ActivityEventType.RECURRING_SCHEDULE_EXECUTED,
        payload: {
          scheduleId: schedule.id,
          templateId: schedule.template.id,
          summary: `generated recurring task from ${schedule.template.name}`
        }
      });

      return {
        task,
        updatedSchedule
      };
    });

    revalidateTaskSurfaces({
      taskId: result.task.id,
      projectIds: [schedule.projectId]
    });

    return {
      status: "success",
      message: `Generated ${result.task.title}.`,
      entityId: result.task.id
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return {
        status: "error",
        message: "This schedule already generated its current run slot."
      };
    }

    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Recurring schedule execution failed."
    };
  }
}

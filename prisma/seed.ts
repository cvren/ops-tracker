import {
  ActivityEventType,
  BlockedCategory,
  ProjectStatus,
  RecurringCadence,
  RecurringExecutionStatus,
  RecurringTriggerSource,
  TaskPriority,
  TaskStatus,
  WorkspaceRole
} from "@prisma/client";

import {
  createActivityEvent,
  resolveTaskCommentNotificationRecipients
} from "../src/lib/activity";
import { hashPassword } from "../src/lib/auth";
import { getEnv } from "../src/lib/env";
import { buildTaskFromTemplateValues } from "../src/lib/manager-mutations";
import { prisma } from "../src/lib/prisma";

function atNoonOffset(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const localDate = [
    date.getFullYear(),
    `${date.getMonth() + 1}`.padStart(2, "0"),
    `${date.getDate()}`.padStart(2, "0")
  ].join("-");

  return new Date(`${localDate}T12:00:00.000Z`);
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function main() {
  const env = getEnv();
  const adminPasswordHash = await hashPassword(env.OPS_TRACKER_DEMO_PASSWORD);
  const operatorPasswordHash = await hashPassword(
    env.OPS_TRACKER_SECONDARY_PASSWORD
  );
  const reviewerPasswordHash = await hashPassword(
    env.OPS_TRACKER_TERTIARY_PASSWORD
  );
  const managerPasswordHash = await hashPassword(
    env.OPS_TRACKER_MANAGER_PASSWORD
  );
  const viewerPasswordHash = await hashPassword(env.OPS_TRACKER_VIEWER_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: env.OPS_TRACKER_DEMO_EMAIL.toLowerCase() },
    update: {
      name: "Aiko Admin",
      passwordHash: adminPasswordHash,
      role: "admin"
    },
    create: {
      name: "Aiko Admin",
      email: env.OPS_TRACKER_DEMO_EMAIL.toLowerCase(),
      passwordHash: adminPasswordHash,
      role: "admin"
    }
  });

  const operator = await prisma.user.upsert({
    where: { email: env.OPS_TRACKER_SECONDARY_EMAIL.toLowerCase() },
    update: {
      name: "Ken Operator",
      passwordHash: operatorPasswordHash,
      role: "member"
    },
    create: {
      name: "Ken Operator",
      email: env.OPS_TRACKER_SECONDARY_EMAIL.toLowerCase(),
      passwordHash: operatorPasswordHash,
      role: "member"
    }
  });

  const reviewer = await prisma.user.upsert({
    where: { email: env.OPS_TRACKER_TERTIARY_EMAIL.toLowerCase() },
    update: {
      name: "Mika Reviewer",
      passwordHash: reviewerPasswordHash,
      role: "member"
    },
    create: {
      name: "Mika Reviewer",
      email: env.OPS_TRACKER_TERTIARY_EMAIL.toLowerCase(),
      passwordHash: reviewerPasswordHash,
      role: "member"
    }
  });

  const manager = await prisma.user.upsert({
    where: { email: env.OPS_TRACKER_MANAGER_EMAIL.toLowerCase() },
    update: {
      name: "Noa Manager",
      passwordHash: managerPasswordHash,
      role: "manager"
    },
    create: {
      name: "Noa Manager",
      email: env.OPS_TRACKER_MANAGER_EMAIL.toLowerCase(),
      passwordHash: managerPasswordHash,
      role: "manager"
    }
  });

  const viewer = await prisma.user.upsert({
    where: { email: env.OPS_TRACKER_VIEWER_EMAIL.toLowerCase() },
    update: {
      name: "Vera Viewer",
      passwordHash: viewerPasswordHash,
      role: "viewer"
    },
    create: {
      name: "Vera Viewer",
      email: env.OPS_TRACKER_VIEWER_EMAIL.toLowerCase(),
      passwordHash: viewerPasswordHash,
      role: "viewer"
    }
  });

  const workspace = await prisma.workspace.upsert({
    where: {
      slug: "ops-control-tower"
    },
    update: {
      name: "Ops Control Tower",
      description:
        "Single workspace for task ownership, review handoff, and risk visibility."
    },
    create: {
      id: "cmig000000000000000000000",
      name: "Ops Control Tower",
      slug: "ops-control-tower",
      description:
        "Single workspace for task ownership, review handoff, and risk visibility."
    }
  });

  for (const [userId, role] of [
    [admin.id, WorkspaceRole.ADMIN],
    [manager.id, WorkspaceRole.MANAGER],
    [operator.id, WorkspaceRole.MEMBER],
    [reviewer.id, WorkspaceRole.MEMBER],
    [viewer.id, WorkspaceRole.VIEWER]
  ] as const) {
    await prisma.membership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId
        }
      },
      update: {
        role,
        addedById: admin.id
      },
      create: {
        workspaceId: workspace.id,
        userId,
        role,
        addedById: admin.id
      }
    });
  }

  await prisma.recurringSchedule.deleteMany({
    where: {
      workspaceId: workspace.id
    }
  });

  await prisma.taskTemplate.deleteMany({
    where: {
      workspaceId: workspace.id
    }
  });

  await prisma.activityEvent.deleteMany({
    where: {
      workspaceId: workspace.id
    }
  });

  await prisma.project.deleteMany({
    where: {
      workspaceId: workspace.id
    }
  });

  await prisma.$transaction(async (tx) => {
    const alpha = await tx.project.create({
      data: {
        workspaceId: workspace.id,
        name: "Harbor inventory rollout",
        code: "OPS-ALPHA",
        description:
          "Coordinate the final warehouse scanner rollout and keep owner, review, and due-date risk visible through the last-mile handoff.",
        status: ProjectStatus.ACTIVE,
        ownerId: admin.id,
        updatedById: admin.id
      }
    });

    const beta = await tx.project.create({
      data: {
        workspaceId: workspace.id,
        name: "Retail launch recovery",
        code: "OPS-BETA",
        description:
          "Track recovery work, stalled dependencies, review loops, and operator handoff risk after the launch slip.",
        status: ProjectStatus.ON_HOLD,
        ownerId: admin.id,
        updatedById: operator.id
      }
    });

    await tx.project.create({
      data: {
        workspaceId: workspace.id,
        name: "Documentation refresh",
        code: "OPS-EMPTY",
        description:
          "An intentionally empty project used to verify the empty-state path after seeding.",
        status: ProjectStatus.ACTIVE,
        ownerId: admin.id,
        updatedById: admin.id
      }
    });

    const weeklySweepTemplate = await tx.taskTemplate.create({
      data: {
        workspaceId: workspace.id,
        name: "Weekly review sweep",
        title: "Run weekly review sweep",
        description:
          "Create a repeatable review-sweep task with a clear owner, reviewer, and due offset so the manager does not rebuild the same weekly work by hand.",
        defaultAssigneeId: operator.id,
        defaultReviewerId: reviewer.id,
        defaultDueOffsetDays: 14,
        defaultPriority: TaskPriority.MEDIUM,
        defaultStatus: TaskStatus.BACKLOG,
        createdById: admin.id,
        updatedById: admin.id
      }
    });

    const escalationDigestTemplate = await tx.taskTemplate.create({
      data: {
        workspaceId: workspace.id,
        name: "Store escalation digest",
        title: "Publish store escalation digest",
        description:
          "Package the store escalation notes into a repeatable digest task with the owner, reviewer, and due offset already set.",
        defaultAssigneeId: admin.id,
        defaultReviewerId: reviewer.id,
        defaultDueOffsetDays: 21,
        defaultPriority: TaskPriority.MEDIUM,
        defaultStatus: TaskStatus.BACKLOG,
        createdById: admin.id,
        updatedById: admin.id
      }
    });

    const recoveryRetryTemplate = await tx.taskTemplate.create({
      data: {
        workspaceId: workspace.id,
        name: "Recovery retry drill",
        title: "Reissue launch recovery retry packet",
        description:
          "Use a stable template for the ledger demo so managers can inspect a failed execution, rerun it, and confirm the recovered task without changing the schedule shape.",
        defaultAssigneeId: manager.id,
        defaultReviewerId: reviewer.id,
        defaultDueOffsetDays: 7,
        defaultPriority: TaskPriority.HIGH,
        defaultStatus: TaskStatus.BACKLOG,
        createdById: admin.id,
        updatedById: admin.id
      }
    });

    const scheduledDigestTemplate = await tx.taskTemplate.create({
      data: {
        workspaceId: workspace.id,
        name: "Scheduled inventory digest",
        title: "Publish scheduled inventory digest",
        description:
          "A release-ready demo template reserved for the scheduled tick so managers can verify the shared pipeline creates a visible SYSTEM execution ledger row.",
        defaultAssigneeId: manager.id,
        defaultReviewerId: reviewer.id,
        defaultDueOffsetDays: 3,
        defaultPriority: TaskPriority.MEDIUM,
        defaultStatus: TaskStatus.BACKLOG,
        createdById: admin.id,
        updatedById: manager.id
      }
    });

    const generateNowSchedule = await tx.recurringSchedule.create({
      data: {
        workspaceId: workspace.id,
        projectId: beta.id,
        templateId: escalationDigestTemplate.id,
        cadence: RecurringCadence.DAILY,
        interval: 1,
        nextRunAt: atNoonOffset(1),
        isActive: true,
        createdById: admin.id,
        updatedById: admin.id
      }
    });

    const scheduledTickSuccessSchedule = await tx.recurringSchedule.create({
      data: {
        workspaceId: workspace.id,
        projectId: alpha.id,
        templateId: scheduledDigestTemplate.id,
        cadence: RecurringCadence.DAILY,
        interval: 1,
        nextRunAt: atNoonOffset(-1),
        lastRunAt: hoursAgo(72),
        isActive: true,
        createdById: admin.id,
        updatedById: manager.id
      }
    });

    const rerunFailureSchedule = await tx.recurringSchedule.create({
      data: {
        workspaceId: workspace.id,
        projectId: beta.id,
        templateId: recoveryRetryTemplate.id,
        cadence: RecurringCadence.WEEKLY,
        interval: 1,
        nextRunAt: atNoonOffset(-1),
        lastRunAt: hoursAgo(120),
        isActive: true,
        createdById: admin.id,
        updatedById: manager.id
      }
    });

    const runningLedgerSchedule = await tx.recurringSchedule.create({
      data: {
        workspaceId: workspace.id,
        projectId: alpha.id,
        templateId: weeklySweepTemplate.id,
        cadence: RecurringCadence.DAILY,
        interval: 1,
        nextRunAt: atNoonOffset(2),
        lastRunAt: hoursAgo(144),
        isActive: true,
        createdById: admin.id,
        updatedById: manager.id
      }
    });

    const pausedSweepSchedule = await tx.recurringSchedule.create({
      data: {
        workspaceId: workspace.id,
        projectId: alpha.id,
        templateId: weeklySweepTemplate.id,
        cadence: RecurringCadence.WEEKLY,
        interval: 1,
        nextRunAt: atNoonOffset(5),
        lastRunAt: hoursAgo(72),
        isActive: false,
        createdById: admin.id,
        updatedById: admin.id
      }
    });

    const inProgressTask = await tx.task.create({
      data: {
        projectId: alpha.id,
        title: "Validate scanner sync on dock floor",
        description:
          "Run the dock-floor validation pass, confirm scan data reaches the warehouse console, and capture the exact handoff note for the reviewer.",
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assigneeId: operator.id,
        reviewerId: reviewer.id,
        createdById: admin.id,
        updatedById: operator.id,
        startedAt: hoursAgo(12),
        dueDate: atNoonOffset(1)
      }
    });

    const needsReviewTask = await tx.task.create({
      data: {
        projectId: alpha.id,
        title: "Prepare dock handoff checklist",
        description:
          "Finalize the checklist operators will use during cutover and send it through review before tomorrow's shift change.",
        status: TaskStatus.NEEDS_REVIEW,
        priority: TaskPriority.HIGH,
        assigneeId: operator.id,
        reviewerId: reviewer.id,
        createdById: admin.id,
        updatedById: operator.id,
        startedAt: hoursAgo(20),
        dueDate: atNoonOffset(0),
        reviewRequestedAt: hoursAgo(2),
        reviewRequestedById: operator.id
      }
    });

    const staleReviewTask = await tx.task.create({
      data: {
        projectId: beta.id,
        title: "Review partner escalation rollback brief",
        description:
          "The reviewer queue has been waiting too long on this rollback brief. It exists to show stale review risk on the manager console.",
        status: TaskStatus.NEEDS_REVIEW,
        priority: TaskPriority.HIGH,
        assigneeId: operator.id,
        reviewerId: reviewer.id,
        createdById: admin.id,
        updatedById: operator.id,
        startedAt: hoursAgo(80),
        dueDate: atNoonOffset(2),
        reviewRequestedAt: hoursAgo(72),
        reviewRequestedById: operator.id
      }
    });

    const changesRequestedTask = await tx.task.create({
      data: {
        projectId: beta.id,
        title: "Rebuild pricing export recovery checklist",
        description:
          "Update the launch recovery checklist with the corrected export steps and address reviewer notes before the evening sync.",
        status: TaskStatus.CHANGES_REQUESTED,
        priority: TaskPriority.MEDIUM,
        assigneeId: operator.id,
        reviewerId: reviewer.id,
        createdById: admin.id,
        updatedById: reviewer.id,
        startedAt: hoursAgo(28),
        dueDate: atNoonOffset(2),
        reviewRequestedAt: hoursAgo(8),
        reviewRequestedById: operator.id,
        reviewedAt: hoursAgo(5),
        reviewedById: reviewer.id
      }
    });

    const blockedTask = await tx.task.create({
      data: {
        projectId: beta.id,
        title: "Resolve carrier API dependency",
        description:
          "Unblock the launch recovery work by confirming the carrier API patch window and the operator rollback plan.",
        status: TaskStatus.BLOCKED,
        priority: TaskPriority.HIGH,
        assigneeId: operator.id,
        reviewerId: reviewer.id,
        createdById: admin.id,
        updatedById: operator.id,
        startedAt: hoursAgo(30),
        dueDate: atNoonOffset(-1),
        blockedReason:
          "Carrier engineering has not confirmed the production patch window.",
        blockedCategory: BlockedCategory.DEPENDENCY
      }
    });

    const secondBlockedTask = await tx.task.create({
      data: {
        projectId: alpha.id,
        title: "Wait on warehouse firewall approval",
        description:
          "A second blocked task so the manager can bulk unblock a real queue and watch the blocked count fall on the dashboard.",
        status: TaskStatus.BLOCKED,
        priority: TaskPriority.HIGH,
        assigneeId: operator.id,
        reviewerId: reviewer.id,
        createdById: admin.id,
        updatedById: admin.id,
        startedAt: hoursAgo(36),
        dueDate: atNoonOffset(-2),
        blockedReason:
          "Infra approval is still pending for the warehouse firewall change.",
        blockedCategory: BlockedCategory.EXTERNAL
      }
    });

    const overdueTask = await tx.task.create({
      data: {
        projectId: alpha.id,
        title: "Close scanner parity gap for west dock",
        description:
          "An overdue delivery used to demonstrate the manager bulk due-date flow.",
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assigneeId: operator.id,
        reviewerId: reviewer.id,
        createdById: admin.id,
        updatedById: operator.id,
        startedAt: hoursAgo(55),
        dueDate: atNoonOffset(-3)
      }
    });

    const unassignedTask = await tx.task.create({
      data: {
        projectId: beta.id,
        title: "Backfill owner for store escalation sheet",
        description:
          "Assign an owner to the escalation sheet update before the next manager review so nobody misses the store-side follow-up.",
        status: TaskStatus.BACKLOG,
        priority: TaskPriority.MEDIUM,
        assigneeId: null,
        reviewerId: null,
        createdById: admin.id,
        updatedById: admin.id,
        dueDate: atNoonOffset(3)
      }
    });

    const secondUnassignedTask = await tx.task.create({
      data: {
        projectId: alpha.id,
        title: "Assign nightly variance audit owner",
        description:
          "A second unassigned task so the manager can bulk assign a queue from the console demo.",
        status: TaskStatus.BACKLOG,
        priority: TaskPriority.HIGH,
        assigneeId: null,
        reviewerId: reviewer.id,
        createdById: admin.id,
        updatedById: admin.id,
        dueDate: atNoonOffset(2)
      }
    });

    const operatorLoadTask = await tx.task.create({
      data: {
        projectId: alpha.id,
        title: "Compile warehouse launch checkpoint pack",
        description:
          "An extra operator-owned task to make the workload table clearly skewed for the M3 dashboard demo.",
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        assigneeId: operator.id,
        reviewerId: null,
        createdById: admin.id,
        updatedById: operator.id,
        startedAt: hoursAgo(10),
        dueDate: atNoonOffset(4)
      }
    });

    const adminTask = await tx.task.create({
      data: {
        projectId: beta.id,
        title: "Prepare launch recovery standup brief",
        description:
          "A small manager-owned task that shows workload distribution is not completely one-sided.",
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.LOW,
        assigneeId: admin.id,
        reviewerId: null,
        createdById: admin.id,
        updatedById: admin.id,
        startedAt: hoursAgo(6),
        dueDate: atNoonOffset(5)
      }
    });

    const generatedTemplateTask = await tx.task.create({
      data: {
        projectId: beta.id,
        ...buildTaskFromTemplateValues(
          escalationDigestTemplate,
          new Date("2026-03-11T00:00:00.000Z")
        ),
        createdById: admin.id,
        updatedById: admin.id
      }
    });

    const successfulDigestExecution = await tx.recurringExecution.create({
      data: {
        recurringScheduleId: generateNowSchedule.id,
        workspaceId: workspace.id,
        status: RecurringExecutionStatus.SUCCESS,
        scheduledFor: atNoonOffset(-1),
        startedAt: hoursAgo(30),
        finishedAt: hoursAgo(30),
        errorMessage: null,
        generatedTaskCount: 1,
        triggeredBy: RecurringTriggerSource.USER,
        triggeredByUserId: admin.id
      }
    });

    const historicalDigestTask = await tx.task.create({
      data: {
        projectId: beta.id,
        recurringExecutionId: successfulDigestExecution.id,
        ...buildTaskFromTemplateValues(
          escalationDigestTemplate,
          hoursAgo(30)
        ),
        createdById: admin.id,
        updatedById: admin.id
      }
    });

    const successfulSweepExecution = await tx.recurringExecution.create({
      data: {
        recurringScheduleId: pausedSweepSchedule.id,
        workspaceId: workspace.id,
        status: RecurringExecutionStatus.SUCCESS,
        scheduledFor: atNoonOffset(-2),
        startedAt: hoursAgo(72),
        finishedAt: hoursAgo(72),
        errorMessage: null,
        generatedTaskCount: 1,
        triggeredBy: RecurringTriggerSource.USER,
        triggeredByUserId: admin.id
      }
    });

    const recurringGeneratedTask = await tx.task.create({
      data: {
        projectId: alpha.id,
        recurringExecutionId: successfulSweepExecution.id,
        ...buildTaskFromTemplateValues(
          weeklySweepTemplate,
          hoursAgo(72)
        ),
        createdById: admin.id,
        updatedById: admin.id
      }
    });

    const skippedSweepExecution = await tx.recurringExecution.create({
      data: {
        recurringScheduleId: pausedSweepSchedule.id,
        workspaceId: workspace.id,
        status: RecurringExecutionStatus.SKIPPED,
        scheduledFor: atNoonOffset(-1),
        startedAt: hoursAgo(40),
        finishedAt: hoursAgo(40),
        errorMessage:
          "Skipped during the warehouse freeze window because no publish owner was on shift.",
        generatedTaskCount: 0,
        triggeredBy: RecurringTriggerSource.USER,
        triggeredByUserId: manager.id
      }
    });

    const failedRecoveryExecution = await tx.recurringExecution.create({
      data: {
        recurringScheduleId: rerunFailureSchedule.id,
        workspaceId: workspace.id,
        status: RecurringExecutionStatus.FAILED,
        scheduledFor: rerunFailureSchedule.nextRunAt,
        startedAt: hoursAgo(6),
        finishedAt: hoursAgo(6),
        errorMessage:
          "Scheduled retry packet generation failed while the nightly slot was processing.",
        generatedTaskCount: 0,
        triggeredBy: RecurringTriggerSource.SYSTEM,
        triggeredByUserId: null
      }
    });

    const runningLedgerExecution = await tx.recurringExecution.create({
      data: {
        recurringScheduleId: runningLedgerSchedule.id,
        workspaceId: workspace.id,
        status: RecurringExecutionStatus.RUNNING,
        scheduledFor: runningLedgerSchedule.nextRunAt,
        startedAt: hoursAgo(2),
        finishedAt: null,
        errorMessage: null,
        generatedTaskCount: 0,
        triggeredBy: RecurringTriggerSource.USER,
        triggeredByUserId: manager.id
      }
    });

    const doneTask = await tx.task.create({
      data: {
        projectId: alpha.id,
        title: "Reissue launch comms pack",
        description:
          "Publish the revised comms pack for store managers after review is complete and the operator handoff note is captured.",
        status: TaskStatus.DONE,
        priority: TaskPriority.LOW,
        assigneeId: operator.id,
        reviewerId: reviewer.id,
        createdById: admin.id,
        updatedById: reviewer.id,
        startedAt: hoursAgo(48),
        dueDate: atNoonOffset(-2),
        reviewRequestedAt: hoursAgo(30),
        reviewRequestedById: operator.id,
        reviewedAt: hoursAgo(24),
        reviewedById: reviewer.id,
        completedAt: hoursAgo(24)
      }
    });

    const dockComment = await tx.comment.create({
      data: {
        taskId: inProgressTask.id,
        authorId: operator.id,
        body:
          "Scanner sync is stable on the east dock. Mentioning the reviewer now so the checklist review does not wait for Slack.",
        mentions: {
          create: {
            userId: reviewer.id
          }
        }
      }
    });

    const changesComment = await tx.comment.create({
      data: {
        taskId: changesRequestedTask.id,
        authorId: reviewer.id,
        body:
          "The checklist still misses the rollback owner and the exact export validation query. Please update those sections before resubmitting.",
        mentions: {
          create: {
            userId: operator.id
          }
        }
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: alpha.id,
      actorId: admin.id,
      type: ActivityEventType.PROJECT_CREATED,
      payload: { summary: "created project OPS-ALPHA" }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: beta.id,
      actorId: admin.id,
      type: ActivityEventType.PROJECT_CREATED,
      payload: { summary: "created project OPS-BETA" }
    });

    for (const template of [
      weeklySweepTemplate,
      escalationDigestTemplate,
      recoveryRetryTemplate,
      scheduledDigestTemplate
    ]) {
      await createActivityEvent(tx, {
        workspaceId: workspace.id,
        actorId: admin.id,
        type: ActivityEventType.TASK_TEMPLATE_CREATED,
        payload: {
          templateId: template.id,
          summary: `created template ${template.name}`
        }
      });
    }

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: generateNowSchedule.projectId,
      actorId: admin.id,
      type: ActivityEventType.RECURRING_SCHEDULE_CREATED,
      payload: {
        scheduleId: generateNowSchedule.id,
        templateId: escalationDigestTemplate.id,
        summary: `created recurring schedule for ${escalationDigestTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: rerunFailureSchedule.projectId,
      actorId: admin.id,
      type: ActivityEventType.RECURRING_SCHEDULE_CREATED,
      payload: {
        scheduleId: rerunFailureSchedule.id,
        templateId: recoveryRetryTemplate.id,
        summary: `created recurring schedule for ${recoveryRetryTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: scheduledTickSuccessSchedule.projectId,
      actorId: admin.id,
      type: ActivityEventType.RECURRING_SCHEDULE_CREATED,
      payload: {
        scheduleId: scheduledTickSuccessSchedule.id,
        templateId: scheduledDigestTemplate.id,
        summary: `created recurring schedule for ${scheduledDigestTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: runningLedgerSchedule.projectId,
      actorId: admin.id,
      type: ActivityEventType.RECURRING_SCHEDULE_CREATED,
      payload: {
        scheduleId: runningLedgerSchedule.id,
        templateId: weeklySweepTemplate.id,
        summary: `created recurring schedule for ${weeklySweepTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: pausedSweepSchedule.projectId,
      actorId: admin.id,
      type: ActivityEventType.RECURRING_SCHEDULE_CREATED,
      payload: {
        scheduleId: pausedSweepSchedule.id,
        templateId: weeklySweepTemplate.id,
        summary: `created recurring schedule for ${weeklySweepTemplate.name}`
      }
    });

    for (const task of [
      inProgressTask,
      needsReviewTask,
      staleReviewTask,
      changesRequestedTask,
      blockedTask,
      secondBlockedTask,
      overdueTask,
      unassignedTask,
      secondUnassignedTask,
      operatorLoadTask,
      adminTask,
      generatedTemplateTask,
      historicalDigestTask,
      recurringGeneratedTask,
      doneTask
    ]) {
      await createActivityEvent(tx, {
        workspaceId: workspace.id,
        projectId: task.projectId,
        taskId: task.id,
        actorId: task.createdById,
        type: ActivityEventType.TASK_CREATED,
        payload: {
          summary: `created task "${task.title}"`
        }
      });
    }

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: inProgressTask.projectId,
      taskId: inProgressTask.id,
      actorId: admin.id,
      type: ActivityEventType.TASK_ASSIGNEE_CHANGED,
      payload: {
        summary: `changed owner to ${operator.name}`
      },
      notificationUserIds: [operator.id]
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: inProgressTask.projectId,
      taskId: inProgressTask.id,
      actorId: admin.id,
      type: ActivityEventType.TASK_REVIEWER_CHANGED,
      payload: {
        summary: `set reviewer to ${reviewer.name}`
      },
      notificationUserIds: [reviewer.id]
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: needsReviewTask.projectId,
      taskId: needsReviewTask.id,
      actorId: operator.id,
      type: ActivityEventType.TASK_REVIEW_REQUESTED,
      payload: {
        summary: `requested review from ${reviewer.name}`
      },
      notificationUserIds: [reviewer.id]
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: staleReviewTask.projectId,
      taskId: staleReviewTask.id,
      actorId: operator.id,
      type: ActivityEventType.TASK_REVIEW_REQUESTED,
      payload: {
        summary: `requested review from ${reviewer.name}`
      },
      notificationUserIds: [reviewer.id]
    });

    const changesRequestedEvent = await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: changesRequestedTask.projectId,
      taskId: changesRequestedTask.id,
      actorId: reviewer.id,
      type: ActivityEventType.TASK_CHANGES_REQUESTED,
      payload: {
        summary: "requested changes"
      },
      notificationUserIds: [operator.id]
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: blockedTask.projectId,
      taskId: blockedTask.id,
      actorId: operator.id,
      type: ActivityEventType.TASK_BLOCKED,
      payload: {
        summary: `blocked the task: ${blockedTask.blockedReason}`
      },
      notificationUserIds: [reviewer.id, admin.id]
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: secondBlockedTask.projectId,
      taskId: secondBlockedTask.id,
      actorId: admin.id,
      type: ActivityEventType.TASK_BLOCKED,
      payload: {
        summary: `blocked the task: ${secondBlockedTask.blockedReason}`
      },
      notificationUserIds: [reviewer.id, operator.id]
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: doneTask.projectId,
      taskId: doneTask.id,
      actorId: reviewer.id,
      type: ActivityEventType.TASK_REVIEW_APPROVED,
      payload: {
        summary: "approved the task"
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: generatedTemplateTask.projectId,
      taskId: generatedTemplateTask.id,
      actorId: admin.id,
      type: ActivityEventType.TASK_CREATED_FROM_TEMPLATE,
      payload: {
        templateId: escalationDigestTemplate.id,
        summary: `created "${generatedTemplateTask.title}" from template ${escalationDigestTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: historicalDigestTask.projectId,
      actorId: admin.id,
      type: ActivityEventType.RECURRING_EXECUTION_STARTED,
      payload: {
        executionId: successfulDigestExecution.id,
        recurringScheduleId: generateNowSchedule.id,
        templateId: escalationDigestTemplate.id,
        scheduledFor: atNoonOffset(-1).toISOString(),
        summary: `started recurring execution for ${escalationDigestTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: historicalDigestTask.projectId,
      taskId: historicalDigestTask.id,
      actorId: admin.id,
      type: ActivityEventType.TASK_CREATED_FROM_TEMPLATE,
      payload: {
        templateId: escalationDigestTemplate.id,
        scheduleId: generateNowSchedule.id,
        executionId: successfulDigestExecution.id,
        summary: `created "${historicalDigestTask.title}" from template ${escalationDigestTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: historicalDigestTask.projectId,
      taskId: historicalDigestTask.id,
      actorId: admin.id,
      type: ActivityEventType.RECURRING_EXECUTION_SUCCEEDED,
      payload: {
        executionId: successfulDigestExecution.id,
        recurringScheduleId: generateNowSchedule.id,
        templateId: escalationDigestTemplate.id,
        generatedTaskCount: 1,
        generatedTaskIds: [historicalDigestTask.id],
        summary: `completed recurring execution for ${escalationDigestTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: historicalDigestTask.projectId,
      taskId: historicalDigestTask.id,
      actorId: admin.id,
      type: ActivityEventType.RECURRING_SCHEDULE_EXECUTED,
      payload: {
        executionId: successfulDigestExecution.id,
        scheduleId: generateNowSchedule.id,
        templateId: escalationDigestTemplate.id,
        summary: `generated recurring task from ${escalationDigestTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: recurringGeneratedTask.projectId,
      actorId: admin.id,
      type: ActivityEventType.RECURRING_EXECUTION_STARTED,
      payload: {
        executionId: successfulSweepExecution.id,
        recurringScheduleId: pausedSweepSchedule.id,
        templateId: weeklySweepTemplate.id,
        scheduledFor: atNoonOffset(-2).toISOString(),
        summary: `started recurring execution for ${weeklySweepTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: recurringGeneratedTask.projectId,
      taskId: recurringGeneratedTask.id,
      actorId: admin.id,
      type: ActivityEventType.TASK_CREATED_FROM_TEMPLATE,
      payload: {
        templateId: weeklySweepTemplate.id,
        scheduleId: pausedSweepSchedule.id,
        executionId: successfulSweepExecution.id,
        summary: `created "${recurringGeneratedTask.title}" from template ${weeklySweepTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: recurringGeneratedTask.projectId,
      taskId: recurringGeneratedTask.id,
      actorId: admin.id,
      type: ActivityEventType.RECURRING_EXECUTION_SUCCEEDED,
      payload: {
        executionId: successfulSweepExecution.id,
        recurringScheduleId: pausedSweepSchedule.id,
        templateId: weeklySweepTemplate.id,
        generatedTaskCount: 1,
        generatedTaskIds: [recurringGeneratedTask.id],
        summary: `completed recurring execution for ${weeklySweepTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: recurringGeneratedTask.projectId,
      taskId: recurringGeneratedTask.id,
      actorId: admin.id,
      type: ActivityEventType.RECURRING_SCHEDULE_EXECUTED,
      payload: {
        scheduleId: pausedSweepSchedule.id,
        templateId: weeklySweepTemplate.id,
        executionId: successfulSweepExecution.id,
        summary: `generated recurring task from ${weeklySweepTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: pausedSweepSchedule.projectId,
      actorId: manager.id,
      type: ActivityEventType.RECURRING_EXECUTION_SKIPPED,
      payload: {
        executionId: skippedSweepExecution.id,
        recurringScheduleId: pausedSweepSchedule.id,
        templateId: weeklySweepTemplate.id,
        errorMessage: skippedSweepExecution.errorMessage,
        summary: `skipped recurring execution for ${weeklySweepTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: rerunFailureSchedule.projectId,
      actorId: null,
      type: ActivityEventType.RECURRING_EXECUTION_STARTED,
      payload: {
        executionId: failedRecoveryExecution.id,
        recurringScheduleId: rerunFailureSchedule.id,
        templateId: recoveryRetryTemplate.id,
        scheduledFor: rerunFailureSchedule.nextRunAt.toISOString(),
        triggeredBy: RecurringTriggerSource.SYSTEM,
        summary: `started recurring execution for ${recoveryRetryTemplate.name}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: rerunFailureSchedule.projectId,
      actorId: null,
      type: ActivityEventType.RECURRING_EXECUTION_FAILED,
      payload: {
        executionId: failedRecoveryExecution.id,
        recurringScheduleId: rerunFailureSchedule.id,
        templateId: recoveryRetryTemplate.id,
        errorMessage: failedRecoveryExecution.errorMessage,
        triggeredBy: RecurringTriggerSource.SYSTEM,
        summary: `failed recurring execution for ${recoveryRetryTemplate.name}: ${failedRecoveryExecution.errorMessage}`
      }
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: runningLedgerSchedule.projectId,
      actorId: manager.id,
      type: ActivityEventType.RECURRING_EXECUTION_STARTED,
      payload: {
        executionId: runningLedgerExecution.id,
        recurringScheduleId: runningLedgerSchedule.id,
        templateId: weeklySweepTemplate.id,
        scheduledFor: runningLedgerSchedule.nextRunAt.toISOString(),
        summary: `started recurring execution for ${weeklySweepTemplate.name}`
      }
    });

    const dockCommentRecipients = resolveTaskCommentNotificationRecipients({
      task: inProgressTask,
      mentionedUserIds: [reviewer.id],
      authorId: operator.id
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: inProgressTask.projectId,
      taskId: inProgressTask.id,
      commentId: dockComment.id,
      actorId: operator.id,
      type: ActivityEventType.COMMENT_CREATED,
      payload: {
        body: dockComment.body,
        summary: "commented on the task"
      },
      notificationUserIds: dockCommentRecipients.commentUserIds
    });

    const dockMentionEvent = await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: inProgressTask.projectId,
      taskId: inProgressTask.id,
      commentId: dockComment.id,
      actorId: operator.id,
      type: ActivityEventType.COMMENT_MENTIONED,
      payload: {
        body: dockComment.body,
        mentionedUserIds: [reviewer.id],
        summary: `mentioned ${reviewer.name} in a comment`
      },
      notificationUserIds: dockCommentRecipients.mentionUserIds
    });

    const changesCommentRecipients = resolveTaskCommentNotificationRecipients({
      task: changesRequestedTask,
      mentionedUserIds: [operator.id],
      authorId: reviewer.id
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: changesRequestedTask.projectId,
      taskId: changesRequestedTask.id,
      commentId: changesComment.id,
      actorId: reviewer.id,
      type: ActivityEventType.COMMENT_CREATED,
      payload: {
        body: changesComment.body,
        summary: "commented on the task"
      },
      notificationUserIds: changesCommentRecipients.commentUserIds
    });

    await createActivityEvent(tx, {
      workspaceId: workspace.id,
      projectId: changesRequestedTask.projectId,
      taskId: changesRequestedTask.id,
      commentId: changesComment.id,
      actorId: reviewer.id,
      type: ActivityEventType.COMMENT_MENTIONED,
      payload: {
        body: changesComment.body,
        mentionedUserIds: [operator.id],
        summary: `mentioned ${operator.name} in a comment`
      },
      notificationUserIds: changesCommentRecipients.mentionUserIds
    });

    await tx.notification.updateMany({
      where: {
        OR: [
          {
            activityEventId: dockMentionEvent.id,
            userId: reviewer.id
          },
          {
            activityEventId: changesRequestedEvent.id,
            userId: operator.id
          }
        ]
      },
      data: {
        readAt: hoursAgo(1)
      }
    });

    await tx.$executeRaw`
      UPDATE "Task"
      SET "updatedAt" = ${hoursAgo(96)}
      WHERE "id" = ${blockedTask.id}
    `;

    await tx.$executeRaw`
      UPDATE "Task"
      SET "updatedAt" = ${hoursAgo(88)}
      WHERE "id" = ${secondBlockedTask.id}
    `;

    await tx.$executeRaw`
      UPDATE "Task"
      SET "updatedAt" = ${hoursAgo(90)}
      WHERE "id" = ${staleReviewTask.id}
    `;

    await tx.$executeRaw`
      UPDATE "Task"
      SET "updatedAt" = ${hoursAgo(72)}
      WHERE "id" = ${secondUnassignedTask.id}
    `;

    await tx.$executeRaw`
      UPDATE "Task"
      SET "updatedAt" = ${hoursAgo(84)}
      WHERE "id" = ${overdueTask.id}
    `;
  });

  console.log(
    "Seeded ops-tracker v0.4.0 release-ready demo data."
  );
  console.log(`Admin login: ${env.OPS_TRACKER_DEMO_EMAIL}`);
  console.log(`Manager login: ${env.OPS_TRACKER_MANAGER_EMAIL}`);
  console.log(`Operator login: ${env.OPS_TRACKER_SECONDARY_EMAIL}`);
  console.log(`Reviewer login: ${env.OPS_TRACKER_TERTIARY_EMAIL}`);
  console.log(`Viewer login: ${env.OPS_TRACKER_VIEWER_EMAIL}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

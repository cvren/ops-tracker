import {
  ActivityEventType,
  BlockedCategory,
  ProjectStatus,
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
    [operator.id, WorkspaceRole.MEMBER],
    [reviewer.id, WorkspaceRole.MEMBER]
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

  const seededCodes = ["OPS-ALPHA", "OPS-BETA", "OPS-EMPTY"];
  const existingProjects = await prisma.project.findMany({
    where: {
      code: {
        in: seededCodes
      }
    },
    select: {
      id: true
    }
  });

  if (existingProjects.length > 0) {
    await prisma.project.deleteMany({
      where: {
        id: {
          in: existingProjects.map((project) => project.id)
        }
      }
    });
  }

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

    for (const task of [
      inProgressTask,
      needsReviewTask,
      changesRequestedTask,
      blockedTask,
      unassignedTask,
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
      projectId: doneTask.projectId,
      taskId: doneTask.id,
      actorId: reviewer.id,
      type: ActivityEventType.TASK_REVIEW_APPROVED,
      payload: {
        summary: "approved the task"
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
  });

  console.log("Seeded ops-tracker v0.2.0 M2 collaboration demo data.");
  console.log(`Admin login: ${env.OPS_TRACKER_DEMO_EMAIL}`);
  console.log(`Operator login: ${env.OPS_TRACKER_SECONDARY_EMAIL}`);
  console.log(`Reviewer login: ${env.OPS_TRACKER_TERTIARY_EMAIL}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

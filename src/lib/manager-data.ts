import { WorkspaceRole } from "@prisma/client";

import { getActivitySummary } from "@/lib/activity";
import {
  buildAgingBuckets,
  buildWorkloadByMember,
  getDueNextSevenDaysCount,
  getDueTodayCount,
  isStaleReviewTask
} from "@/lib/manager-console";
import { prisma } from "@/lib/prisma";
import {
  getDueDateBoundary,
  getHighRiskWhere
} from "@/lib/task-views";
import { requireWorkspaceRole } from "@/lib/workspace";

const taskCardInclude = {
  project: {
    select: {
      id: true,
      code: true,
      name: true
    }
  },
  assignee: {
    select: {
      id: true,
      name: true
    }
  },
  reviewer: {
    select: {
      id: true,
      name: true
    }
  }
} as const;

async function getTaskCards(workspaceId: string, taskIds: string[]) {
  if (taskIds.length === 0) {
    return [];
  }

  const tasks = await prisma.task.findMany({
    where: {
      id: {
        in: taskIds
      },
      project: {
        workspaceId
      }
    },
    include: taskCardInclude
  });

  const byId = new Map(tasks.map((task) => [task.id, task]));
  return taskIds
    .map((taskId) => byId.get(taskId))
    .filter((task): task is (typeof tasks)[number] => Boolean(task));
}

export async function getManagerDashboardData() {
  const context = await requireWorkspaceRole(WorkspaceRole.MANAGER);
  const now = new Date();
  const overdueBoundary = getDueDateBoundary(now);

  const [memberships, openTasks] = await Promise.all([
    prisma.membership.findMany({
      where: {
        workspaceId: context.workspace.id
      },
      orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }),
    prisma.task.findMany({
      where: {
        project: {
          workspaceId: context.workspace.id
        },
        status: {
          not: "DONE"
        }
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        updatedAt: true,
        createdAt: true,
        reviewRequestedAt: true,
        assigneeId: true,
        reviewerId: true
      }
    })
  ]);

  const overdueCount = openTasks.filter(
    (task) => task.dueDate !== null && task.dueDate < overdueBoundary
  ).length;
  const reviewQueueCount = openTasks.filter(
    (task) => task.status === "NEEDS_REVIEW"
  ).length;
  const unassignedCount = openTasks.filter((task) => task.assigneeId === null)
    .length;
  const blockedCount = openTasks.filter((task) => task.status === "BLOCKED")
    .length;

  const oldestOverdueTaskIds = openTasks
    .filter((task) => task.dueDate !== null && task.dueDate < overdueBoundary)
    .sort(
      (left, right) =>
        (left.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (right.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER)
    )
    .slice(0, 4)
    .map((task) => task.id);

  const staleReviewTaskIds = openTasks
    .filter((task) => isStaleReviewTask(task, now))
    .sort(
      (left, right) =>
        (left.reviewRequestedAt?.getTime() ?? left.updatedAt.getTime()) -
        (right.reviewRequestedAt?.getTime() ?? right.updatedAt.getTime())
    )
    .slice(0, 4)
    .map((task) => task.id);

  const oldestBlockedTaskIds = openTasks
    .filter((task) => task.status === "BLOCKED")
    .sort((left, right) => left.updatedAt.getTime() - right.updatedAt.getTime())
    .slice(0, 4)
    .map((task) => task.id);

  const oldestUnassignedTaskIds = openTasks
    .filter((task) => task.assigneeId === null)
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .slice(0, 4)
    .map((task) => task.id);

  const highRiskTaskIds = (
    await prisma.task.findMany({
      where: {
        project: {
          workspaceId: context.workspace.id
        },
        ...getHighRiskWhere(now)
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "asc" }],
      take: 6,
      select: {
        id: true
      }
    })
  ).map((task) => task.id);

  const [
    oldestOverdue,
    staleReviewQueue,
    oldestBlocked,
    oldestUnassigned,
    highRiskQueue
  ] = await Promise.all([
    getTaskCards(context.workspace.id, oldestOverdueTaskIds),
    getTaskCards(context.workspace.id, staleReviewTaskIds),
    getTaskCards(context.workspace.id, oldestBlockedTaskIds),
    getTaskCards(context.workspace.id, oldestUnassignedTaskIds),
    getTaskCards(context.workspace.id, highRiskTaskIds)
  ]);

  return {
    blockedCount,
    dueNextSevenDaysCount: getDueNextSevenDaysCount(openTasks, now),
    dueTodayCount: getDueTodayCount(openTasks, now),
    highRiskQueue,
    oldestBlocked,
    oldestOverdue,
    oldestUnassigned,
    overdueCount,
    reviewQueueCount,
    staleReviewQueue,
    unassignedCount,
    agingBuckets: buildAgingBuckets(openTasks, now),
    workload: buildWorkloadByMember(
      memberships.map((membership) => ({
        id: membership.user.id,
        name: membership.user.name,
        role: membership.role
      })),
      openTasks,
      now
    )
  };
}

export async function getManagerWorkloadData() {
  const context = await requireWorkspaceRole(WorkspaceRole.MANAGER);
  const now = new Date();

  const [memberships, openTasks] = await Promise.all([
    prisma.membership.findMany({
      where: {
        workspaceId: context.workspace.id
      },
      orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }),
    prisma.task.findMany({
      where: {
        project: {
          workspaceId: context.workspace.id
        },
        status: {
          not: "DONE"
        }
      },
      select: {
        assigneeId: true,
        reviewerId: true,
        dueDate: true,
        status: true
      }
    })
  ]);

  return buildWorkloadByMember(
    memberships.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      role: membership.role
    })),
    openTasks,
    now
  );
}

export async function getTemplateConsoleData() {
  const context = await requireWorkspaceRole(WorkspaceRole.MANAGER);

  const [users, projects, templates, schedules, recentActivity] =
    await Promise.all([
      prisma.membership.findMany({
        where: {
          workspaceId: context.workspace.id
        },
        orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.project.findMany({
        where: {
          workspaceId: context.workspace.id
        },
        orderBy: [{ status: "asc" }, { name: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          status: true
        }
      }),
      prisma.taskTemplate.findMany({
        where: {
          workspaceId: context.workspace.id
        },
        orderBy: [{ updatedAt: "desc" }],
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
          },
          _count: {
            select: {
              recurringSchedules: true
            }
          }
        }
      }),
      prisma.recurringSchedule.findMany({
        where: {
          workspaceId: context.workspace.id
        },
        orderBy: [{ nextRunAt: "asc" }],
        include: {
          template: {
            select: {
              id: true,
              name: true,
              title: true
            }
          },
          project: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          executions: {
            orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
            take: 6,
            include: {
              triggeredByUser: {
                select: {
                  id: true,
                  name: true
                }
              },
              generatedTasks: {
                orderBy: [{ createdAt: "asc" }],
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        }
      }),
      prisma.activityEvent.findMany({
        where: {
          workspaceId: context.workspace.id,
          type: {
            in: [
              "TASK_TEMPLATE_CREATED",
              "TASK_TEMPLATE_UPDATED",
              "TASK_CREATED_FROM_TEMPLATE",
              "RECURRING_SCHEDULE_CREATED",
              "RECURRING_SCHEDULE_UPDATED",
              "RECURRING_SCHEDULE_EXECUTED",
              "RECURRING_EXECUTION_STARTED",
              "RECURRING_EXECUTION_SUCCEEDED",
              "RECURRING_EXECUTION_FAILED",
              "RECURRING_EXECUTION_RERUN",
              "RECURRING_EXECUTION_SKIPPED"
            ]
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 8,
        include: {
          actor: {
            select: {
              name: true
            }
          },
          task: {
            select: {
              id: true,
              title: true
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
      })
    ]);

  return {
    projects,
    recentActivity: recentActivity.map((event) => ({
      ...event,
      summary: getActivitySummary(event.payload)
    })),
    schedules,
    templates,
    users: users.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role
    }))
  };
}

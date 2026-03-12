import {
  ProjectStatus,
  TaskStatus,
  type Prisma,
  type TaskPriority
} from "@prisma/client";

import { getActivitySummary } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { type TaskView } from "@/lib/constants";
import { getTaskViewOrderBy, getTaskViewWhere } from "@/lib/task-views";
import { getCurrentWorkspaceContext } from "@/lib/workspace";

type ProjectFilters = {
  query?: string;
  status?: ProjectStatus;
};

type TaskFilters = {
  query?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  view?: TaskView;
  assigneeId?: string;
  reviewerId?: string;
};

type WorkspaceScopedTaskWhereInput = Prisma.TaskWhereInput;

function getTaskSearchWhere(query: string): WorkspaceScopedTaskWhereInput {
  return {
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      {
        project: {
          name: { contains: query, mode: "insensitive" }
        }
      },
      {
        project: {
          code: { contains: query, mode: "insensitive" }
        }
      }
    ]
  };
}

export async function getAssignableUsers() {
  const { workspace } = await getCurrentWorkspaceContext();

  const memberships = await prisma.membership.findMany({
    where: {
      workspaceId: workspace.id
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
  });

  return memberships.map((membership) => ({
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role
  }));
}

export async function getAppShellData() {
  const context = await getCurrentWorkspaceContext();

  const unreadNotifications = await prisma.notification.count({
    where: {
      userId: context.user.id,
      readAt: null
    }
  });

  return {
    membership: context.membership,
    user: context.user,
    unreadNotifications,
    workspace: context.workspace
  };
}

export async function getDashboardData() {
  const context = await getCurrentWorkspaceContext();
  const workspaceWhere = {
    workspaceId: context.workspace.id
  };
  const taskWorkspaceWhere = {
    project: workspaceWhere
  } satisfies WorkspaceScopedTaskWhereInput;

  const [projectCount, activeProjectCount, blockedTaskCount, dueSoonCount] =
    await Promise.all([
      prisma.project.count({
        where: workspaceWhere
      }),
      prisma.project.count({
        where: {
          ...workspaceWhere,
          status: ProjectStatus.ACTIVE
        }
      }),
      prisma.task.count({
        where: {
          ...taskWorkspaceWhere,
          status: TaskStatus.BLOCKED
        }
      }),
      prisma.task.count({
        where: {
          ...taskWorkspaceWhere,
          dueDate: {
            lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
          },
          status: {
            not: TaskStatus.DONE
          }
        }
      })
    ]);

  const [myTasksCount, needsReviewCount, overdueCount, unassignedCount] =
    await Promise.all([
      prisma.task.count({
        where: {
          ...taskWorkspaceWhere,
          ...getTaskViewWhere({
            view: "my-tasks",
            userId: context.user.id
          })
        }
      }),
      prisma.task.count({
        where: {
          ...taskWorkspaceWhere,
          ...getTaskViewWhere({
            view: "needs-review",
            userId: context.user.id
          })
        }
      }),
      prisma.task.count({
        where: {
          ...taskWorkspaceWhere,
          ...getTaskViewWhere({
            view: "overdue",
            userId: context.user.id
          })
        }
      }),
      prisma.task.count({
        where: {
          ...taskWorkspaceWhere,
          ...getTaskViewWhere({
            view: "unassigned",
            userId: context.user.id
          })
        }
      })
    ]);

  const [recentProjects, recentTasks, focusTasks, recentActivity] =
    await Promise.all([
      prisma.project.findMany({
        where: workspaceWhere,
        orderBy: { updatedAt: "desc" },
        take: 4,
        include: {
          _count: {
            select: { tasks: true }
          }
        }
      }),
      prisma.task.findMany({
        where: taskWorkspaceWhere,
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: {
          project: {
            select: {
              id: true,
              name: true,
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
      }),
      prisma.task.findMany({
        where: {
          ...taskWorkspaceWhere,
          OR: [
            {
              status: TaskStatus.NEEDS_REVIEW
            },
            {
              status: TaskStatus.BLOCKED
            },
            getTaskViewWhere({
              view: "overdue",
              userId: context.user.id
            }),
            getTaskViewWhere({
              view: "unassigned",
              userId: context.user.id
            })
          ]
        },
        orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
        take: 6,
        include: {
          project: {
            select: {
              id: true,
              code: true,
              name: true
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
      }),
      prisma.activityEvent.findMany({
        where: {
          workspaceId: context.workspace.id
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
    activeProjectCount,
    blockedTaskCount,
    dueSoonCount,
    focusTasks,
    myTasksCount,
    needsReviewCount,
    overdueCount,
    projectCount,
    recentActivity: recentActivity.map((event) => ({
      ...event,
      summary: getActivitySummary(event.payload)
    })),
    recentProjects,
    recentTasks,
    unassignedCount
  };
}

export async function listProjects(filters: ProjectFilters = {}) {
  const { workspace } = await getCurrentWorkspaceContext();
  const query = filters.query?.trim();

  return prisma.project.findMany({
    where: {
      workspaceId: workspace.id,
      status: filters.status,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { code: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: {
        select: { tasks: true }
      },
      owner: {
        select: { name: true }
      }
    }
  });
}

export async function getProjectById(projectId: string) {
  const { workspace } = await getCurrentWorkspaceContext();

  return prisma.project.findFirst({
    where: {
      id: projectId,
      workspaceId: workspace.id
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      updatedBy: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: { tasks: true }
      }
    }
  });
}

export async function listTasks(filters: TaskFilters = {}) {
  const context = await getCurrentWorkspaceContext();
  const query = filters.query?.trim();

  return prisma.task.findMany({
    where: {
      project: {
        workspaceId: context.workspace.id
      },
      projectId: filters.projectId,
      assigneeId: filters.assigneeId,
      reviewerId: filters.reviewerId,
      status: filters.status,
      priority: filters.priority,
      ...getTaskViewWhere({
        view: filters.view,
        userId: context.user.id
      }),
      ...(query ? getTaskSearchWhere(query) : {})
    },
    orderBy: getTaskViewOrderBy(filters.view),
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true
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
    }
  });
}

export async function getTaskById(taskId: string) {
  const { workspace } = await getCurrentWorkspaceContext();

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        workspaceId: workspace.id
      }
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          workspaceId: true
        }
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      createdBy: {
        select: {
          id: true,
          name: true
        }
      },
      updatedBy: {
        select: {
          id: true,
          name: true
        }
      },
      recurringExecution: {
        include: {
          recurringSchedule: {
            select: {
              id: true,
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
              }
            }
          }
        }
      },
      reviewRequestedBy: {
        select: {
          id: true,
          name: true
        }
      },
      reviewedBy: {
        select: {
          id: true,
          name: true
        }
      },
      comments: {
        orderBy: {
          createdAt: "desc"
        },
        include: {
          author: {
            select: {
              id: true,
              name: true
            }
          },
          mentions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      },
      activityEvents: {
        orderBy: {
          createdAt: "desc"
        },
        include: {
          actor: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  if (!task) {
    return null;
  }

  return {
    ...task,
    activityEvents: task.activityEvents.map((event) => ({
      ...event,
      summary: getActivitySummary(event.payload)
    }))
  };
}

export async function getWorkspaceMembersData() {
  const context = await getCurrentWorkspaceContext();

  const [memberships, availableUsers] = await Promise.all([
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
        },
        addedBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    prisma.user.findMany({
      where: {
        memberships: {
          none: {
            workspaceId: context.workspace.id
          }
        }
      },
      orderBy: {
        name: "asc"
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })
  ]);

  return {
    availableUsers,
    memberships
  };
}

export async function getInboxNotifications() {
  const context = await getCurrentWorkspaceContext();

  const notifications = await prisma.notification.findMany({
    where: {
      userId: context.user.id
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      activityEvent: {
        include: {
          actor: {
            select: {
              id: true,
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
      }
    }
  });

  return notifications.map((notification) => ({
    ...notification,
    summary: getActivitySummary(notification.activityEvent.payload)
  }));
}

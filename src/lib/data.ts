import {
  ProjectStatus,
  TaskStatus,
  type TaskPriority
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type ProjectFilters = {
  query?: string;
  status?: ProjectStatus;
};

type TaskFilters = {
  query?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
};

export async function getAssignableUsers() {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true
    }
  });
}

export async function getDashboardData() {
  const [
    projectCount,
    activeProjectCount,
    blockedTaskCount,
    dueSoonCount,
    recentProjects,
    recentTasks
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({
      where: {
        status: ProjectStatus.ACTIVE
      }
    }),
    prisma.task.count({
      where: {
        status: TaskStatus.BLOCKED
      }
    }),
    prisma.task.count({
      where: {
        dueDate: {
          lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
        },
        status: {
          not: TaskStatus.DONE
        }
      }
    }),
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: {
        _count: {
          select: { tasks: true }
        }
      }
    }),
    prisma.task.findMany({
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
        }
      }
    })
  ]);

  return {
    projectCount,
    activeProjectCount,
    blockedTaskCount,
    dueSoonCount,
    recentProjects,
    recentTasks
  };
}

export async function listProjects(filters: ProjectFilters = {}) {
  const query = filters.query?.trim();

  return prisma.project.findMany({
    where: {
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
  return prisma.project.findUnique({
    where: { id: projectId },
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
  const query = filters.query?.trim();

  return prisma.task.findMany({
    where: {
      projectId: filters.projectId,
      status: filters.status,
      priority: filters.priority,
      ...(query
        ? {
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
          }
        : {})
    },
    orderBy: [{ updatedAt: "desc" }],
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
      }
    }
  });
}

export async function getTaskById(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true
        }
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
}

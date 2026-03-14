import { WorkspaceRole } from "@prisma/client";
import type { CommitmentSeverity } from "@prisma/client";

import { getActivitySummary } from "@/lib/activity";
import {
  attachRecurringScheduleRiskMetadataFromExceptionCases,
  attachTaskRiskMetadataFromExceptionCases,
  countOpenExceptionSources,
  countOpenExceptionsByPolicyId,
  summarizeOpenExceptionKinds
} from "@/lib/exception-case-data";
import {
  activeExceptionStatuses,
  getExceptionCaseDetails,
  syncExceptionLedgerForWorkspace
} from "@/lib/exception-cases";
import { formatCommitmentPolicyThreshold, getCommitmentPolicyScopeLabel } from "@/lib/commitment-policies";
import {
  commitmentPolicyKindLabels,
  commitmentSeverityLabels,
  workspaceRoleLabels
} from "@/lib/constants";
import {
  buildAgingBuckets,
  buildWorkloadByMember,
  getDueNextSevenDaysCount,
  getDueTodayCount,
  isStaleReviewTask
} from "@/lib/manager-console";
import { prisma } from "@/lib/prisma";
import { getDueDateBoundary } from "@/lib/task-views";
import { requireWorkspaceRole } from "@/lib/workspace";

const severityRank: Record<CommitmentSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

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
  },
  recurringExecution: {
    select: {
      recurringSchedule: {
        select: {
          templateId: true
        }
      }
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

async function listOpenExceptionCaseRisks(input: {
  recurringExecutionIds?: string[];
  taskIds?: string[];
  workspaceId: string;
}) {
  const taskIds = input.taskIds?.filter(Boolean) ?? [];
  const recurringExecutionIds = input.recurringExecutionIds?.filter(Boolean) ?? [];
  const sourceFilters: Array<
    | {
        taskId: {
          in: string[];
        };
      }
    | {
        recurringExecutionId: {
          in: string[];
        };
      }
  > = [];

  if (taskIds.length > 0) {
    sourceFilters.push({
      taskId: {
        in: taskIds
      }
    });
  }

  if (recurringExecutionIds.length > 0) {
    sourceFilters.push({
      recurringExecutionId: {
        in: recurringExecutionIds
      }
    });
  }

  if (sourceFilters.length === 0) {
    return [];
  }

  return prisma.exceptionCase.findMany({
    where: {
      workspaceId: input.workspaceId,
      status: {
        in: [...activeExceptionStatuses]
      },
      OR: sourceFilters
    },
    select: {
      id: true,
      kind: true,
      severity: true,
      sourcePolicyId: true,
      taskId: true,
      recurringExecutionId: true,
      details: true,
      sourcePolicy: {
        select: {
          id: true,
          name: true,
          scopeId: true,
          scopeType: true
        }
      }
    }
  });
}

export async function getManagerDashboardData() {
  const context = await requireWorkspaceRole(WorkspaceRole.MANAGER);
  const now = new Date();
  const overdueBoundary = getDueDateBoundary(now);

  await syncExceptionLedgerForWorkspace({
    now,
    workspaceId: context.workspace.id
  });

  const [memberships, activePolicies, openTasks, recurringSchedules] =
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
      prisma.commitmentPolicy.findMany({
        where: {
          workspaceId: context.workspace.id,
          isActive: true
        },
        orderBy: [{ severity: "desc" }, { name: "asc" }]
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
          projectId: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          updatedAt: true,
          createdAt: true,
          reviewRequestedAt: true,
          assigneeId: true,
          reviewerId: true,
          recurringExecution: {
            select: {
              recurringSchedule: {
                select: {
                  templateId: true
                }
              }
            }
          }
        }
      }),
      prisma.recurringSchedule.findMany({
        where: {
          workspaceId: context.workspace.id
        },
        select: {
          id: true,
          projectId: true,
          templateId: true,
          executions: {
            orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
            take: 1,
            select: {
              id: true,
              status: true,
              startedAt: true,
              finishedAt: true,
              errorMessage: true
            }
          }
        }
      })
    ]);

  const openExceptionCases = await listOpenExceptionCaseRisks({
    recurringExecutionIds: recurringSchedules
      .map((schedule) => schedule.executions[0]?.id ?? null)
      .filter((executionId): executionId is string => Boolean(executionId)),
    taskIds: openTasks.map((task) => task.id),
    workspaceId: context.workspace.id
  });

  const openTasksWithRisk = attachTaskRiskMetadataFromExceptionCases({
    cases: openExceptionCases.filter((exceptionCase) => exceptionCase.taskId),
    tasks: openTasks
  });
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

  const highRiskTaskIds = openTasksWithRisk
    .filter((task) => task.risk.hits.length > 0)
    .sort((left, right) => {
      const severityDelta =
        severityRank[right.risk.highestSeverity ?? "LOW"] -
        severityRank[left.risk.highestSeverity ?? "LOW"];

      if (severityDelta !== 0) {
        return severityDelta;
      }

      return (
        (left.dueDate?.getTime() ?? left.updatedAt.getTime()) -
        (right.dueDate?.getTime() ?? right.updatedAt.getTime())
      );
    })
    .slice(0, 6)
    .map((task) => task.id);

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

  const visibleTaskExceptionCases = await listOpenExceptionCaseRisks({
    taskIds: [
      ...oldestOverdueTaskIds,
      ...staleReviewTaskIds,
      ...oldestBlockedTaskIds,
      ...oldestUnassignedTaskIds,
      ...highRiskTaskIds
    ],
    workspaceId: context.workspace.id
  });

  const oldestOverdueWithRisk = attachTaskRiskMetadataFromExceptionCases({
    cases: visibleTaskExceptionCases,
    tasks: oldestOverdue
  });
  const staleReviewQueueWithRisk = attachTaskRiskMetadataFromExceptionCases({
    cases: visibleTaskExceptionCases,
    tasks: staleReviewQueue
  });
  const oldestBlockedWithRisk = attachTaskRiskMetadataFromExceptionCases({
    cases: visibleTaskExceptionCases,
    tasks: oldestBlocked
  });
  const oldestUnassignedWithRisk = attachTaskRiskMetadataFromExceptionCases({
    cases: visibleTaskExceptionCases,
    tasks: oldestUnassigned
  });
  const highRiskQueueWithRisk = attachTaskRiskMetadataFromExceptionCases({
    cases: visibleTaskExceptionCases,
    tasks: highRiskQueue
  });
  const riskKindCounts = summarizeOpenExceptionKinds(openExceptionCases);

  return {
    blockedCount,
    commitmentSummary: {
      activePoliciesCount: activePolicies.length,
      kindCounts: riskKindCounts.map((entry) => ({
        ...entry,
        label: commitmentPolicyKindLabels[entry.kind]
      })),
      recurringRiskCount: countOpenExceptionSources({
        cases: openExceptionCases,
        source: "RECURRING_EXECUTION"
      }),
      taskRiskCount: countOpenExceptionSources({
        cases: openExceptionCases,
        source: "TASK"
      })
    },
    dueNextSevenDaysCount: getDueNextSevenDaysCount(openTasks, now),
    dueTodayCount: getDueTodayCount(openTasks, now),
    highRiskQueue: highRiskQueueWithRisk,
    oldestBlocked: oldestBlockedWithRisk,
    oldestOverdue: oldestOverdueWithRisk,
    oldestUnassigned: oldestUnassignedWithRisk,
    overdueCount,
    reviewQueueCount,
    staleReviewQueue: staleReviewQueueWithRisk,
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

  await syncExceptionLedgerForWorkspace({
    workspaceId: context.workspace.id
  });

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

  const schedulesWithLatestExecution = schedules.map((schedule) => ({
    ...schedule,
    latestExecution: schedule.executions[0]
      ? {
          id: schedule.executions[0].id,
          status: schedule.executions[0].status,
          startedAt: schedule.executions[0].startedAt,
          finishedAt: schedule.executions[0].finishedAt,
          errorMessage: schedule.executions[0].errorMessage
        }
      : null
  }));
  const recurringExceptionCases = await listOpenExceptionCaseRisks({
    recurringExecutionIds: schedulesWithLatestExecution
      .map((schedule) => schedule.latestExecution?.id ?? null)
      .filter((executionId): executionId is string => Boolean(executionId)),
    workspaceId: context.workspace.id
  });
  const schedulesWithRisk = attachRecurringScheduleRiskMetadataFromExceptionCases({
    cases: recurringExceptionCases,
    schedules: schedulesWithLatestExecution
  });

  return {
    projects,
    recentActivity: recentActivity.map((event) => ({
      ...event,
      summary: getActivitySummary(event.payload)
    })),
    schedules: schedulesWithRisk,
    templates,
    users: users.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role
    }))
  };
}

export async function getCommitmentPolicyConsoleData() {
  const context = await requireWorkspaceRole(WorkspaceRole.MANAGER);
  await syncExceptionLedgerForWorkspace({
    workspaceId: context.workspace.id
  });

  const [projects, templates, policies, openExceptionCases] = await Promise.all([
    prisma.project.findMany({
      where: {
        workspaceId: context.workspace.id
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true
      }
    }),
    prisma.taskTemplate.findMany({
      where: {
        workspaceId: context.workspace.id
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        title: true
      }
    }),
    prisma.commitmentPolicy.findMany({
      where: {
        workspaceId: context.workspace.id
      },
      orderBy: [{ severity: "desc" }, { name: "asc" }]
    }),
    prisma.exceptionCase.findMany({
      where: {
        workspaceId: context.workspace.id,
        status: {
          in: [...activeExceptionStatuses]
        }
      },
      select: {
        id: true,
        kind: true,
        severity: true,
        sourcePolicyId: true,
        taskId: true,
        recurringExecutionId: true,
        details: true,
        sourcePolicy: {
          select: {
            id: true,
            name: true,
            scopeId: true,
            scopeType: true
          }
        }
      }
    })
  ]);

  const breachCountsByPolicy = countOpenExceptionsByPolicyId(openExceptionCases);
  const projectsById = new Map(
    projects.map((project) => [
      project.id,
      {
        code: project.code,
        name: project.name
      }
    ])
  );
  const templatesById = new Map(
    templates.map((template) => [
      template.id,
      {
        name: template.name,
        title: template.title
      }
    ])
  );

  return {
    policies: policies.map((policy) => ({
      ...policy,
      breachCount: breachCountsByPolicy.get(policy.id) ?? 0,
      scopeLabel: getCommitmentPolicyScopeLabel({
        policy,
        projectsById,
        templatesById,
        workspaceName: context.workspace.name
      }),
      severityLabel: commitmentSeverityLabels[policy.severity],
      thresholdLabel: formatCommitmentPolicyThreshold(policy)
    })),
    projects,
    templates
  };
}

export async function getExceptionQueueData() {
  const context = await requireWorkspaceRole(WorkspaceRole.MANAGER);
  const syncSummary = await syncExceptionLedgerForWorkspace({
    workspaceId: context.workspace.id
  });
  const [openCases, assignableOwners] = await Promise.all([
    prisma.exceptionCase.findMany({
      where: {
        workspaceId: context.workspace.id,
        status: {
          in: [...activeExceptionStatuses]
        }
      },
      orderBy: [{ severity: "desc" }, { openedAt: "asc" }],
      include: {
        owner: {
          select: {
            id: true,
            name: true
          }
        },
        sourcePolicy: {
          select: {
            id: true,
            name: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            project: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        },
        recurringExecution: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            finishedAt: true,
            errorMessage: true,
            recurringSchedule: {
              select: {
                id: true,
                project: {
                  select: {
                    id: true,
                    code: true,
                    name: true
                  }
                },
                template: {
                  select: {
                    id: true,
                    name: true,
                    title: true
                  }
                }
              }
            }
          }
        },
        emailDeliveries: {
          orderBy: {
            deliveredAt: "desc"
          },
          take: 3,
          include: {
            recipientUser: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    }),
    prisma.membership.findMany({
      where: {
        workspaceId: context.workspace.id,
        role: {
          not: WorkspaceRole.VIEWER
        }
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
    })
  ]);

  const mappedCases = openCases.map((exceptionCase) => {
    const details = getExceptionCaseDetails(exceptionCase.details);
    const taskSource = exceptionCase.task
      ? {
          href: `/tasks/${exceptionCase.task.id}`,
          label: `Open task · ${exceptionCase.task.project.code}`
        }
      : null;
    const recurringSource = exceptionCase.recurringExecution
      ? {
          href: `/templates#execution-${exceptionCase.recurringExecution.id}`,
          label: `Open execution record · ${exceptionCase.recurringExecution.recurringSchedule.project.code}`
        }
      : null;

    return {
      acknowledgedAt: exceptionCase.acknowledgedAt,
      id: exceptionCase.id,
      kind: exceptionCase.kind,
      openedAt: exceptionCase.openedAt,
      ownerId: exceptionCase.owner?.id ?? null,
      ownerName: exceptionCase.owner?.name ?? "Unassigned",
      policyName: exceptionCase.sourcePolicy.name,
      recentEmailDeliveries: exceptionCase.emailDeliveries.map((delivery) => ({
        deliveredAt: delivery.deliveredAt,
        event: delivery.event,
        id: delivery.id,
        recipientLabel:
          delivery.recipientUser?.name ?? delivery.recipientEmail,
        subject: delivery.subject
      })),
      severity: exceptionCase.severity,
      snoozedUntil: exceptionCase.snoozedUntil,
      sourceContextLabel: details
        ? `${details.projectCode} · ${details.projectName}`
        : null,
      sourceHref: taskSource?.href ?? recurringSource?.href ?? null,
      sourceLabel: taskSource?.label ?? recurringSource?.label ?? null,
      sourceSummary: details?.summary ?? exceptionCase.title,
      status: exceptionCase.status,
      title: exceptionCase.title
    };
  });

  return {
    cases: mappedCases.filter((exceptionCase) => exceptionCase.status !== "SNOOZED"),
    ownerOptions: assignableOwners.map((membership) => ({
      id: membership.user.id,
      label: `${membership.user.name} · ${membership.user.email} · ${workspaceRoleLabels[membership.role]}`,
      name: membership.user.name
    })),
    snoozedCases: mappedCases.filter(
      (exceptionCase) => exceptionCase.status === "SNOOZED"
    ),
    syncSummary: {
      ...syncSummary,
      actionableCount: mappedCases.filter(
        (exceptionCase) => exceptionCase.status !== "SNOOZED"
      ).length,
      deliveredEmailCount: mappedCases.reduce(
        (count, exceptionCase) => count + exceptionCase.recentEmailDeliveries.length,
        0
      ),
      snoozedCount: mappedCases.filter(
        (exceptionCase) => exceptionCase.status === "SNOOZED"
      ).length
    }
  };
}

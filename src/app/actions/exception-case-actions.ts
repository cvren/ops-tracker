"use server";

import {
  ActivityEventType,
  ExceptionEmailDeliveryEvent,
  ExceptionResolutionKind,
  WorkspaceRole
} from "@prisma/client";

import { type ActionState } from "@/lib/forms";
import { createActivityEvent } from "@/lib/activity";
import {
  activeExceptionStatuses,
  getExceptionCaseDetails
} from "@/lib/exception-cases";
import {
  buildExceptionCaseTransition,
  buildExceptionEmailMessage,
  buildExceptionResponseSummary,
  createExceptionEmailDeliveries
} from "@/lib/exception-response";
import { prisma } from "@/lib/prisma";
import { revalidateTaskSurfaces } from "@/lib/task-action-helpers";
import {
  flattenFieldErrors,
  parseExceptionResponseFormData
} from "@/lib/validation";
import { requireWorkspaceRole } from "@/lib/workspace";

export async function updateExceptionCaseAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole(WorkspaceRole.MANAGER);
    const parsed = parseExceptionResponseFormData(formData);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Exception response validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const exceptionCase = await tx.exceptionCase.findFirst({
        where: {
          id: parsed.data.caseId,
          workspaceId: context.workspace.id,
          status: {
            in: [...activeExceptionStatuses]
          }
        },
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
              projectId: true,
              project: {
                select: {
                  code: true,
                  name: true
                }
              }
            }
          },
          recurringExecution: {
            select: {
              id: true,
              recurringSchedule: {
                select: {
                  projectId: true,
                  project: {
                    select: {
                      code: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!exceptionCase) {
        throw new Error("Choose an active exception case from the current workspace.");
      }

      const details = getExceptionCaseDetails(exceptionCase.details);
      const projectId =
        exceptionCase.task?.projectId ??
        exceptionCase.recurringExecution?.recurringSchedule.projectId ??
        details?.projectId ??
        null;
      const projectCode =
        exceptionCase.task?.project.code ??
        exceptionCase.recurringExecution?.recurringSchedule.project.code ??
        details?.projectCode ??
        "OPS";
      const sourceSummary = details?.summary ?? exceptionCase.title;
      const baseResult = {
        caseId: exceptionCase.id,
        projectId,
        taskId: exceptionCase.taskId ?? null
      };

      switch (parsed.data.intent) {
        case "acknowledge": {
          await tx.exceptionCase.update({
            where: {
              id: exceptionCase.id
            },
            data: buildExceptionCaseTransition({
              currentAcknowledgedAt: exceptionCase.acknowledgedAt,
              intent: "acknowledge",
              now
            })
          });

          await createActivityEvent(tx, {
            workspaceId: context.workspace.id,
            projectId,
            taskId: exceptionCase.taskId,
            actorId: context.user.id,
            type: ActivityEventType.EXCEPTION_CASE_ACKNOWLEDGED,
            payload: {
              exceptionCaseId: exceptionCase.id,
              summary: buildExceptionResponseSummary({
                intent: "acknowledge",
                title: exceptionCase.title
              })
            }
          });

          return {
            ...baseResult,
            message: `Exception ${exceptionCase.title} acknowledged.`
          };
        }
        case "assign-owner": {
          const nextOwnerId = parsed.data.ownerId;

          if (!nextOwnerId) {
            throw new Error("Choose an owner for the exception.");
          }

          if (nextOwnerId === exceptionCase.ownerId) {
            throw new Error("Choose a different owner to reassign this exception.");
          }

          const ownerMembership = await tx.membership.findFirst({
            where: {
              workspaceId: context.workspace.id,
              userId: nextOwnerId,
              role: {
                not: WorkspaceRole.VIEWER
              }
            },
            select: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true
                }
              }
            }
          });

          if (!ownerMembership) {
            throw new Error("Choose an owner who can work items in this workspace.");
          }

          await tx.exceptionCase.update({
            where: {
              id: exceptionCase.id
            },
            data: buildExceptionCaseTransition({
              currentAcknowledgedAt: exceptionCase.acknowledgedAt,
              intent: "assign-owner",
              now,
              ownerId: ownerMembership.user.id
            })
          });

          await createActivityEvent(tx, {
            workspaceId: context.workspace.id,
            projectId,
            taskId: exceptionCase.taskId,
            actorId: context.user.id,
            type: ActivityEventType.EXCEPTION_CASE_ASSIGNED,
            payload: {
              exceptionCaseId: exceptionCase.id,
              ownerId: ownerMembership.user.id,
              summary: buildExceptionResponseSummary({
                intent: "assign-owner",
                ownerName: ownerMembership.user.name,
                title: exceptionCase.title
              })
            },
            notificationUserIds: [ownerMembership.user.id]
          });

          const message = buildExceptionEmailMessage({
            event: ExceptionEmailDeliveryEvent.ASSIGNED,
            kind: exceptionCase.kind,
            policyName: exceptionCase.sourcePolicy.name,
            projectCode,
            severity: exceptionCase.severity,
            sourceSummary,
            title: exceptionCase.title
          });

          await createExceptionEmailDeliveries(tx, {
            workspaceId: context.workspace.id,
            exceptionCaseId: exceptionCase.id,
            event: ExceptionEmailDeliveryEvent.ASSIGNED,
            recipients: [
              {
                recipientUserId: ownerMembership.user.id,
                recipientEmail: ownerMembership.user.email
              }
            ],
            subject: message.subject,
            body: message.body
          });

          return {
            ...baseResult,
            message: `Exception ${exceptionCase.title} assigned to ${ownerMembership.user.name}.`
          };
        }
        case "snooze": {
          const snoozeHours = Number(parsed.data.snoozeHours);
          const snoozeTransition = buildExceptionCaseTransition({
            currentAcknowledgedAt: exceptionCase.acknowledgedAt,
            intent: "snooze",
            now,
            snoozeHours
          });
          const snoozedUntil = snoozeTransition.snoozedUntil;

          await tx.exceptionCase.update({
            where: {
              id: exceptionCase.id
            },
            data: snoozeTransition
          });

          await createActivityEvent(tx, {
            workspaceId: context.workspace.id,
            projectId,
            taskId: exceptionCase.taskId,
            actorId: context.user.id,
            type: ActivityEventType.EXCEPTION_CASE_SNOOZED,
            payload: {
              exceptionCaseId: exceptionCase.id,
              snoozedUntil,
              summary: buildExceptionResponseSummary({
                intent: "snooze",
                snoozeHours,
                title: exceptionCase.title
              })
            }
          });

          return {
            ...baseResult,
            message: `Exception ${exceptionCase.title} snoozed for ${snoozeHours} hours.`
          };
        }
        case "resolve": {
          await tx.exceptionCase.update({
            where: {
              id: exceptionCase.id
            },
            data: buildExceptionCaseTransition({
              currentAcknowledgedAt: exceptionCase.acknowledgedAt,
              intent: "resolve",
              now
            })
          });

          await createActivityEvent(tx, {
            workspaceId: context.workspace.id,
            projectId,
            taskId: exceptionCase.taskId,
            actorId: context.user.id,
            type: ActivityEventType.EXCEPTION_CASE_RESOLVED,
            payload: {
              exceptionCaseId: exceptionCase.id,
              resolutionKind: ExceptionResolutionKind.MANUAL,
              summary: buildExceptionResponseSummary({
                intent: "resolve",
                title: exceptionCase.title
              })
            }
          });

          return {
            ...baseResult,
            message: `Exception ${exceptionCase.title} resolved manually. If the source still violates its policy, the ledger will reopen it on a future refresh.`
          };
        }
        default: {
          throw new Error("Unsupported exception action.");
        }
      }
    });

    revalidateTaskSurfaces({
      taskId: result.taskId ?? undefined,
      projectIds: result.projectId ? [result.projectId] : []
    });

    return {
      status: "success",
      message: result.message,
      entityId: result.caseId
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Exception response failed."
    };
  }
}

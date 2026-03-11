import { TaskStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import {
  createActivityEvent,
  getTaskTransitionActivityDescriptor
} from "@/lib/activity";
import { getCurrentUser } from "@/lib/auth";
import { taskStatusLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  getTaskTransitionResult,
  type TaskTransitionIntent
} from "@/lib/task-workflow";
import { taskStatusUpdateSchema } from "@/lib/validation";

function mapStatusToIntent(
  status: TaskStatus,
  currentStatus: TaskStatus
): TaskTransitionIntent {
  switch (status) {
    case TaskStatus.BACKLOG:
      return "move-to-backlog";
    case TaskStatus.IN_PROGRESS:
      return currentStatus === TaskStatus.BLOCKED
        ? "resume-work"
        : "start-work";
    case TaskStatus.BLOCKED:
      return "mark-blocked";
    case TaskStatus.NEEDS_REVIEW:
      return "request-review";
    case TaskStatus.CHANGES_REQUESTED:
      return "request-changes";
    case TaskStatus.DONE:
      return "mark-done";
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: user.id
    },
    include: {
      workspace: true
    }
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Workspace membership not found." },
      { status: 403 }
    );
  }

  const { taskId } = await params;
  const payload: unknown = await request.json().catch(() => null);
  const parsed = taskStatusUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Status payload is invalid." },
      { status: 400 }
    );
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        workspaceId: membership.workspaceId
      }
    },
    include: {
      project: {
        select: {
          id: true
        }
      },
      reviewer: {
        select: {
          name: true
        }
      },
      assignee: {
        select: {
          name: true
        }
      }
    }
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  let intent = mapStatusToIntent(parsed.data.status, task.status);

  if (
    parsed.data.status === TaskStatus.DONE &&
    task.reviewerId &&
    task.status === TaskStatus.NEEDS_REVIEW
  ) {
    intent = "approve-review";
  }

  const transition = getTaskTransitionResult({
    intent,
    actorId: user.id,
    membership: {
      role: membership.role,
      userId: membership.userId
    },
    task
  });

  if (!transition.ok) {
    return NextResponse.json({ error: transition.error }, { status: 400 });
  }

  const updatedTask = await prisma.$transaction(async (tx) => {
    const nextTask = await tx.task.update({
      where: {
        id: task.id
      },
      data: {
        ...transition.data,
        updatedById: user.id
      }
    });

    const descriptor = getTaskTransitionActivityDescriptor({
      eventType: transition.eventType,
      task,
      currentStatus: taskStatusLabels[task.status],
      nextStatus: taskStatusLabels[transition.nextStatus]
    });

    await createActivityEvent(tx, {
      workspaceId: membership.workspaceId,
      projectId: task.projectId,
      taskId: task.id,
      actorId: user.id,
      type: transition.eventType,
      payload: {
        fromStatus: task.status,
        toStatus: transition.nextStatus,
        summary: descriptor.summary
      },
      notificationUserIds: descriptor.notificationUserIds
    });

    return nextTask;
  });

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${updatedTask.id}`);
  revalidatePath(`/projects/${updatedTask.projectId}`);
  revalidatePath("/inbox");

  return NextResponse.json({ ok: true, task: updatedTask });
}

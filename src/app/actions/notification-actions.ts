"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWorkspaceRole } from "@/lib/workspace";

export async function markNotificationReadAction(notificationId: string) {
  const context = await requireWorkspaceRole("VIEWER");

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: context.user.id,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  revalidatePath("/inbox");
}

export async function markAllNotificationsReadAction() {
  const context = await requireWorkspaceRole("VIEWER");

  await prisma.notification.updateMany({
    where: {
      userId: context.user.id,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  revalidatePath("/inbox");
}

import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath, requireWorkspaceRole, updateMany } = vi.hoisted(() => ({
  updateMany: vi.fn(),
  revalidatePath: vi.fn(),
  requireWorkspaceRole: vi.fn()
}));

vi.mock("next/cache", () => ({
  revalidatePath
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      updateMany
    }
  }
}));

vi.mock("@/lib/workspace", () => ({
  requireWorkspaceRole
}));

import {
  markAllNotificationsReadAction,
  markNotificationReadAction
} from "@/app/actions/notification-actions";

type SingleNotificationUpdate = {
  where: {
    id: string;
    userId: string;
    readAt: null;
  };
  data: {
    readAt: Date;
  };
};

type AllNotificationsUpdate = {
  where: {
    userId: string;
    readAt: null;
  };
  data: {
    readAt: Date;
  };
};

describe("notification actions", () => {
  beforeEach(() => {
    updateMany.mockReset();
    revalidatePath.mockReset();
    requireWorkspaceRole.mockReset();
    requireWorkspaceRole.mockResolvedValue({
      user: { id: "user-1" }
    });
  });

  it("marks a single notification as read for the current user", async () => {
    await markNotificationReadAction("notification-1");

    const [call] = updateMany.mock.calls as [[SingleNotificationUpdate]];

    expect(call[0].where).toEqual({
      id: "notification-1",
      userId: "user-1",
      readAt: null
    });
    expect(call[0].data.readAt).toBeInstanceOf(Date);
    expect(revalidatePath).toHaveBeenCalledWith("/inbox");
  });

  it("marks all unread notifications as read", async () => {
    await markAllNotificationsReadAction();

    const [call] = updateMany.mock.calls as [[AllNotificationsUpdate]];

    expect(call[0].where).toEqual({
      userId: "user-1",
      readAt: null
    });
    expect(call[0].data.readAt).toBeInstanceOf(Date);
    expect(revalidatePath).toHaveBeenCalledWith("/inbox");
  });
});

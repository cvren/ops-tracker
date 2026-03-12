import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireWorkspaceRole,
  createActivityEvent,
  revalidatePath,
  membershipFindUnique,
  membershipCount,
  membershipUpdate,
  transaction
} = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  createActivityEvent: vi.fn(),
  revalidatePath: vi.fn(),
  membershipFindUnique: vi.fn(),
  membershipCount: vi.fn(),
  membershipUpdate: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("next/cache", () => ({
  revalidatePath
}));

vi.mock("@/lib/workspace", () => ({
  requireWorkspaceRole
}));

vi.mock("@/lib/activity", () => ({
  createActivityEvent
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findUnique: membershipFindUnique,
      count: membershipCount
    },
    $transaction: transaction
  }
}));

import { updateWorkspaceMemberRoleAction } from "@/app/actions/workspace-actions";

type ActivityInput = {
  type: string;
  payload?: Record<string, unknown>;
};

function createFormData(values: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("workspace role delegation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireWorkspaceRole.mockResolvedValue({
      workspace: { id: "workspace-1" },
      user: { id: "admin-1" }
    });
    createActivityEvent.mockResolvedValue({ id: "event-1" });
    membershipCount.mockResolvedValue(2);
    membershipUpdate.mockResolvedValue({});
    transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback({
        membership: {
          update: membershipUpdate
        }
      })
    );
  });

  it("records manager grant activity when an admin promotes a member", async () => {
    membershipFindUnique.mockResolvedValue({
      id: "membership-1",
      workspaceId: "workspace-1",
      userId: "member-1",
      role: "MEMBER",
      user: {
        name: "Ken Operator"
      }
    });

    const result = await updateWorkspaceMemberRoleAction(
      { status: "idle" },
      createFormData({
        membershipId: "cm8opsdemo0000000000000101",
        role: "MANAGER"
      })
    );

    expect(result).toMatchObject({
      status: "success",
      message: "Ken Operator is now Manager."
    });
    expect(membershipUpdate).toHaveBeenCalledWith({
      where: {
        id: "membership-1"
      },
      data: {
        role: "MANAGER"
      }
    });
    expect(createActivityEvent).toHaveBeenCalledTimes(2);
    expect(
      createActivityEvent.mock.calls.map((entry) => {
        const [, input] = entry as [unknown, ActivityInput];
        return input.type;
      })
    ).toEqual(["MEMBERSHIP_ROLE_CHANGED", "MANAGER_ROLE_GRANTED"]);
    const [, grantedInput] = createActivityEvent.mock.calls[1] as [
      unknown,
      ActivityInput
    ];

    expect(grantedInput.payload).toMatchObject({
      membershipId: "membership-1",
      targetUserId: "member-1",
      previousRole: "MEMBER",
      nextRole: "MANAGER",
      summary: "granted manager access to Ken Operator"
    });
  });

  it("records manager revocation activity when an admin demotes a manager", async () => {
    membershipFindUnique.mockResolvedValue({
      id: "membership-1",
      workspaceId: "workspace-1",
      userId: "manager-1",
      role: "MANAGER",
      user: {
        name: "Noa Manager"
      }
    });

    const result = await updateWorkspaceMemberRoleAction(
      { status: "idle" },
      createFormData({
        membershipId: "cm8opsdemo0000000000000102",
        role: "MEMBER"
      })
    );

    expect(result).toMatchObject({
      status: "success",
      message: "Noa Manager is now Member."
    });
    expect(createActivityEvent).toHaveBeenCalledTimes(2);
    expect(
      createActivityEvent.mock.calls.map((entry) => {
        const [, input] = entry as [unknown, ActivityInput];
        return input.type;
      })
    ).toEqual(["MEMBERSHIP_ROLE_CHANGED", "MANAGER_ROLE_REVOKED"]);
    const [, revokedInput] = createActivityEvent.mock.calls[1] as [
      unknown,
      ActivityInput
    ];

    expect(revokedInput.payload).toMatchObject({
      membershipId: "membership-1",
      targetUserId: "manager-1",
      previousRole: "MANAGER",
      nextRole: "MEMBER",
      summary: "revoked manager access from Noa Manager"
    });
  });

  it("keeps role assignment admin-only", async () => {
    requireWorkspaceRole.mockRejectedValue(
      new Error("Only workspace admins can perform that action.")
    );

    const result = await updateWorkspaceMemberRoleAction(
      { status: "idle" },
      createFormData({
        membershipId: "cm8opsdemo0000000000000103",
        role: "MANAGER"
      })
    );

    expect(result).toMatchObject({
      status: "error",
      message: "Only workspace admins can perform that action."
    });
    expect(transaction).not.toHaveBeenCalled();
  });
});

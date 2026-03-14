"use server";

import {
  CommitmentScopeType,
  WorkspaceRole
} from "@prisma/client";
import type { CommitmentPolicyKind } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { type ActionState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import {
  flattenFieldErrors,
  getStringValue,
  parseCommitmentPolicyFormData
} from "@/lib/validation";
import { requireWorkspaceRole } from "@/lib/workspace";

function revalidateCommitmentSurfaces() {
  revalidatePath("/commitments");
  revalidatePath("/exceptions");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/templates");
}

async function resolveCommitmentScope(input: {
  projectScopeId: string;
  scopeType: CommitmentScopeType;
  templateScopeId: string;
  workspaceId: string;
}) {
  switch (input.scopeType) {
    case CommitmentScopeType.WORKSPACE:
      return input.workspaceId;
    case CommitmentScopeType.PROJECT: {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectScopeId,
          workspaceId: input.workspaceId
        },
        select: {
          id: true
        }
      });

      if (!project) {
        throw new Error("Choose a project in the current workspace.");
      }

      return project.id;
    }
    case CommitmentScopeType.TEMPLATE: {
      const template = await prisma.taskTemplate.findFirst({
        where: {
          id: input.templateScopeId,
          workspaceId: input.workspaceId
        },
        select: {
          id: true
        }
      });

      if (!template) {
        throw new Error("Choose a template in the current workspace.");
      }

      return template.id;
    }
  }
}

function getThresholdFields(input: {
  thresholdUnit: "hours" | "minutes";
  thresholdValue: string;
}) {
  const thresholdValue = Number(input.thresholdValue);

  return input.thresholdUnit === "minutes"
    ? {
        thresholdMinutes: thresholdValue,
        thresholdHours: null
      }
    : {
        thresholdMinutes: null,
        thresholdHours: thresholdValue
      };
}

async function ensureUniqueCommitmentPolicy(input: {
  excludedPolicyId?: string;
  kind: CommitmentPolicyKind;
  scopeId: string;
  scopeType: CommitmentScopeType;
  workspaceId: string;
}) {
  const existingPolicy = await prisma.commitmentPolicy.findFirst({
    where: {
      workspaceId: input.workspaceId,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      kind: input.kind,
      ...(input.excludedPolicyId
        ? {
            id: {
              not: input.excludedPolicyId
            }
          }
        : {})
    },
    select: {
      id: true
    }
  });

  if (existingPolicy) {
    throw new Error(
      "A policy for this scope and commitment kind already exists."
    );
  }
}

export async function createCommitmentPolicyAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole(WorkspaceRole.MANAGER);
    const parsed = parseCommitmentPolicyFormData(formData);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Policy validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    const scopeId = await resolveCommitmentScope({
      scopeType: parsed.data.scopeType,
      projectScopeId: parsed.data.projectScopeId ?? "",
      templateScopeId: parsed.data.templateScopeId ?? "",
      workspaceId: context.workspace.id
    });

    await ensureUniqueCommitmentPolicy({
      workspaceId: context.workspace.id,
      scopeType: parsed.data.scopeType,
      scopeId,
      kind: parsed.data.kind
    });

    const policy = await prisma.commitmentPolicy.create({
      data: {
        workspaceId: context.workspace.id,
        name: parsed.data.name,
        scopeType: parsed.data.scopeType,
        scopeId,
        kind: parsed.data.kind,
        severity: parsed.data.severity,
        isActive: parsed.data.isActive,
        ...getThresholdFields({
          thresholdUnit: parsed.data.thresholdUnit,
          thresholdValue: parsed.data.thresholdValue
        })
      }
    });

    revalidateCommitmentSurfaces();

    return {
      status: "success",
      message: `Policy ${policy.name} created.`,
      entityId: policy.id
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Policy creation failed."
    };
  }
}

export async function updateCommitmentPolicyAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const context = await requireWorkspaceRole(WorkspaceRole.MANAGER);
    const policyId = getStringValue(formData, "policyId");
    const parsed = parseCommitmentPolicyFormData(formData);

    if (!policyId) {
      return {
        status: "error",
        message: "Choose a valid policy to update."
      };
    }

    if (!parsed.success) {
      return {
        status: "error",
        message: "Policy validation failed.",
        fieldErrors: flattenFieldErrors(parsed.error)
      };
    }

    const existingPolicy = await prisma.commitmentPolicy.findFirst({
      where: {
        id: policyId,
        workspaceId: context.workspace.id
      },
      select: {
        id: true
      }
    });

    if (!existingPolicy) {
      return {
        status: "error",
        message: "That policy is no longer available."
      };
    }

    const scopeId = await resolveCommitmentScope({
      scopeType: parsed.data.scopeType,
      projectScopeId: parsed.data.projectScopeId ?? "",
      templateScopeId: parsed.data.templateScopeId ?? "",
      workspaceId: context.workspace.id
    });

    await ensureUniqueCommitmentPolicy({
      excludedPolicyId: policyId,
      workspaceId: context.workspace.id,
      scopeType: parsed.data.scopeType,
      scopeId,
      kind: parsed.data.kind
    });

    const policy = await prisma.commitmentPolicy.update({
      where: {
        id: policyId
      },
      data: {
        name: parsed.data.name,
        scopeType: parsed.data.scopeType,
        scopeId,
        kind: parsed.data.kind,
        severity: parsed.data.severity,
        isActive: parsed.data.isActive,
        ...getThresholdFields({
          thresholdUnit: parsed.data.thresholdUnit,
          thresholdValue: parsed.data.thresholdValue
        })
      }
    });

    revalidateCommitmentSurfaces();

    return {
      status: "success",
      message: `Policy ${policy.name} updated.`,
      entityId: policy.id
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Policy update failed."
    };
  }
}

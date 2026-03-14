"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateWorkspaceMemberRoleAction } from "@/app/actions/workspace-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { Select } from "@/components/ui/select";
import { INITIAL_ACTION_STATE } from "@/lib/forms";
import { workspaceRoleOptions } from "@/lib/constants";

type WorkspaceMemberRoleFormProps = {
  currentRole: string;
  disabled?: boolean;
  memberEmail: string;
  membershipId: string;
  memberName: string;
};

export function WorkspaceMemberRoleForm({
  currentRole,
  disabled = false,
  memberEmail,
  membershipId,
  memberName
}: WorkspaceMemberRoleFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    updateWorkspaceMemberRoleAction,
    INITIAL_ACTION_STATE
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          name="role"
          defaultValue={currentRole}
          disabled={disabled}
          aria-label={`Role for ${memberName} (${memberEmail})`}
        >
          {workspaceRoleOptions.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </Select>
        <SubmitButton
          label="Save role"
          pendingLabel="Saving..."
          className="sm:w-auto"
        />
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}

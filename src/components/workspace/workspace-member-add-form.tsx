"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { addWorkspaceMemberAction } from "@/app/actions/workspace-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { INITIAL_ACTION_STATE } from "@/lib/forms";
import { workspaceRoleOptions } from "@/lib/constants";

type WorkspaceMemberAddFormProps = {
  users: Array<{
    id: string;
    name: string;
    email: string;
  }>;
};

export function WorkspaceMemberAddForm({
  users
}: WorkspaceMemberAddFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    addWorkspaceMemberAction,
    INITIAL_ACTION_STATE
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <Panel className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Add member
        </p>
        <h2 className="text-2xl font-semibold text-ink">
          Add an existing user
        </h2>
      </div>
      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="workspace-user" className="text-sm font-medium text-ink">
            User
          </label>
          <Select id="workspace-user" name="userId" defaultValue="">
            <option value="">Choose a user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} · {user.email}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="workspace-role" className="text-sm font-medium text-ink">
            Role
          </label>
          <Select id="workspace-role" name="role" defaultValue="MEMBER">
            {workspaceRoleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>
        </div>
        <ActionFeedback state={state} />
        <SubmitButton label="Add member" pendingLabel="Adding..." />
      </form>
    </Panel>
  );
}

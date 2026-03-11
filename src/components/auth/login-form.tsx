"use client";

import { useActionState } from "react";

import { signInAction } from "@/app/actions/auth-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { INITIAL_ACTION_STATE } from "@/lib/forms";

export function LoginForm() {
  const [state, formAction] = useActionState(
    signInAction,
    INITIAL_ACTION_STATE
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="reviewer@ops-tracker.local"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="ChangeMe123!"
          autoComplete="current-password"
          required
        />
      </div>
      <ActionFeedback state={state} />
      <SubmitButton label="Sign in" pendingLabel="Signing in..." />
    </form>
  );
}

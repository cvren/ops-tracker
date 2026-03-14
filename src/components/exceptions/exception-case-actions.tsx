"use client";

import { type ExceptionStatus } from "@prisma/client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { updateExceptionCaseAction } from "@/app/actions/exception-case-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { INITIAL_ACTION_STATE } from "@/lib/forms";
import { exceptionSnoozePresetOptions } from "@/lib/exception-response";

type ExceptionCaseActionsProps = {
  caseId: string;
  ownerId: string | null;
  ownerOptions: Array<{
    id: string;
    label: string;
    name: string;
  }>;
  status: ExceptionStatus;
};

export function ExceptionCaseActions({
  caseId,
  ownerId,
  ownerOptions,
  status
}: ExceptionCaseActionsProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    updateExceptionCaseAction,
    INITIAL_ACTION_STATE
  );
  const [selectedOwnerId, setSelectedOwnerId] = useState(ownerId ?? "");
  const [snoozeHours, setSnoozeHours] = useState("4");

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  useEffect(() => {
    setSelectedOwnerId(ownerId ?? "");
  }, [ownerId]);

  return (
    <form action={formAction} className="space-y-4 rounded-[1.75rem] bg-canvas/75 p-4">
      <input type="hidden" name="caseId" value={caseId} />

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="intent"
          value="acknowledge"
          variant="secondary"
          disabled={status === "ACKNOWLEDGED"}
        >
          {status === "ACKNOWLEDGED" ? "Acknowledged" : "Acknowledge"}
        </Button>
        <Button type="submit" name="intent" value="resolve" variant="danger">
          Resolve manually
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-2">
          <label
            htmlFor={`exception-owner-${caseId}`}
            className="text-sm font-medium text-ink"
          >
            Assign or reassign owner
          </label>
          <Select
            id={`exception-owner-${caseId}`}
            name="ownerId"
            value={selectedOwnerId}
            onChange={(event) => setSelectedOwnerId(event.currentTarget.value)}
          >
            <option value="">Choose owner</option>
            {ownerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" name="intent" value="assign-owner" variant="secondary">
          Save owner
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-2">
          <label
            htmlFor={`exception-snooze-${caseId}`}
            className="text-sm font-medium text-ink"
          >
            Snooze window
          </label>
          <Select
            id={`exception-snooze-${caseId}`}
            name="snoozeHours"
            value={snoozeHours}
            onChange={(event) => setSnoozeHours(event.currentTarget.value)}
          >
            <option value="">Choose snooze window</option>
            {exceptionSnoozePresetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" name="intent" value="snooze" variant="secondary">
          Snooze
        </Button>
      </div>

      <ActionFeedback state={state} />
      <p className="text-xs leading-5 text-ink/60">
        Manual resolve closes the current case. If the source still violates its
        policy, the next ledger refresh will open a new exception.
      </p>
    </form>
  );
}

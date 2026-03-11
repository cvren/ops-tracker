"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { executeRecurringScheduleAction } from "@/app/actions/manager-actions";
import { Button } from "@/components/ui/button";

export function ExecuteRecurringButton({
  scheduleId,
  isActive
}: {
  scheduleId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        onClick={() => {
          setMessage(null);
          setEntityId(null);
          setError(null);
          startTransition(async () => {
            const result = await executeRecurringScheduleAction(scheduleId);

            if (result.status === "error") {
              setError(result.message ?? "Schedule execution failed.");
              return;
            }

            setMessage(result.message ?? "Generated recurring task.");
            setEntityId(result.entityId ?? null);
            router.refresh();
          });
        }}
        disabled={isPending || !isActive}
        fullWidth={false}
      >
        {!isActive ? "Inactive schedule" : isPending ? "Generating..." : "Generate now"}
      </Button>
      {!isActive ? (
        <p className="text-sm text-ink/60">
          Activate the schedule before generating the next task.
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-800">
          {message}{" "}
          {entityId ? (
            <Link
              href={`/tasks/${entityId}` as Route}
              className="font-semibold text-accent hover:text-ink"
            >
              Open task
            </Link>
          ) : null}
        </p>
      ) : null}
      {error ? <p className="text-sm text-rose-800">{error}</p> : null}
    </div>
  );
}

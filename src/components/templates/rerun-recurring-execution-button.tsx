"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { rerunRecurringExecutionAction } from "@/app/actions/manager-actions";
import { Button } from "@/components/ui/button";

export function RerunRecurringExecutionButton({
  executionId
}: {
  executionId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        onClick={() => {
          setMessage(null);
          setEntityId(null);
          setError(null);
          startTransition(async () => {
            const result = await rerunRecurringExecutionAction(executionId);

            if (result.status === "error") {
              setError(result.message ?? "Failed execution rerun failed.");
              router.refresh();
              return;
            }

            setMessage(result.message ?? "Reran the failed execution.");
            setEntityId(result.entityId ?? null);
            router.refresh();
          });
        }}
        disabled={isPending}
      >
        {isPending ? "Rerunning..." : "Rerun failed slot"}
      </Button>
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

"use client";

import { type TaskStatus } from "@prisma/client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { taskStatusOptions } from "@/lib/constants";

type TaskStatusButtonsProps = {
  taskId: string;
  currentStatus: TaskStatus;
};

export function TaskStatusButtons({
  taskId,
  currentStatus
}: TaskStatusButtonsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {taskStatusOptions.map((option) => {
          const active = option.value === currentStatus;

          return (
            <Button
              key={option.value}
              variant={active ? "primary" : "secondary"}
              disabled={isPending || active}
              onClick={() => {
                setMessage(null);
                setError(null);
                startTransition(async () => {
                  const response = await fetch(`/api/tasks/${taskId}/status`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ status: option.value })
                  });

                  if (!response.ok) {
                    const data = (await response.json().catch(() => null)) as
                      | { error?: string }
                      | null;
                    setError(data?.error ?? "Status update failed.");
                    return;
                  }

                  setMessage(`Status changed to ${option.label}.`);
                  router.refresh();
                });
              }}
            >
              {isPending && active ? "Updating..." : option.label}
            </Button>
          );
        })}
      </div>
      {message ? (
        <p className="text-sm text-emerald-800">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-rose-800">{error}</p> : null}
    </div>
  );
}

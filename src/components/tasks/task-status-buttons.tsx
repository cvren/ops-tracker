"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { transitionTaskAction } from "@/app/actions/task-actions";
import { Button } from "@/components/ui/button";
import { type TaskTransitionIntent } from "@/lib/task-workflow";

type TaskStatusButtonsProps = {
  taskId: string;
  transitions: Array<{
    intent: TaskTransitionIntent;
    label: string;
    variant: "primary" | "secondary" | "danger";
  }>;
};

export function TaskStatusButtons({
  taskId,
  transitions
}: TaskStatusButtonsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const feedbackStorageKey = `ops-tracker:task-feedback:${taskId}`;

  useEffect(() => {
    const storedMessage = window.sessionStorage.getItem(feedbackStorageKey);

    if (storedMessage) {
      setMessage(storedMessage);
      window.sessionStorage.removeItem(feedbackStorageKey);
    }
  }, [feedbackStorageKey]);

  if (transitions.length === 0) {
    return (
      <p className="text-sm text-ink/70">
        No workflow actions are available for your current role on this task.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {transitions.map((transition) => (
          <Button
            key={transition.intent}
            variant={transition.variant}
            disabled={isPending}
            onClick={() => {
              window.sessionStorage.removeItem(feedbackStorageKey);
              setMessage(null);
              setError(null);
              startTransition(async () => {
                const result = await transitionTaskAction(
                  taskId,
                  transition.intent
                );

                if (result.status === "error") {
                  setError(result.message ?? "Workflow action failed.");
                  return;
                }

                const nextMessage = result.message ?? "Task updated.";
                setMessage(nextMessage);
                window.sessionStorage.setItem(
                  feedbackStorageKey,
                  nextMessage
                );
                router.refresh();
              });
            }}
          >
            {isPending ? "Working..." : transition.label}
          </Button>
        ))}
      </div>
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="text-sm text-rose-800">{error}</p> : null}
    </div>
  );
}

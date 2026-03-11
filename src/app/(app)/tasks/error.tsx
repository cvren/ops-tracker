"use client";

import { Button } from "@/components/ui/button";

export default function TasksError({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] border border-rose-200 bg-white/85 p-8 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-signal">
          Queue error
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-ink">
          The task queue could not load.
        </h1>
        <p className="mt-4 text-sm leading-6 text-ink/70">{error.message}</p>
        <div className="mt-6">
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export default function ExceptionsError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Exceptions"
        title="The exception ledger could not load."
        description="Try the page again. If the error persists, the last persisted queue state and response controls have not been refreshed."
      />
      <Panel className="space-y-4">
        <p className="text-sm text-ink/70">{error.message}</p>
        <Button onClick={reset} fullWidth={false}>
          Try again
        </Button>
      </Panel>
    </div>
  );
}

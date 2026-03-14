import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";

export default function ExceptionsLoading() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Exceptions"
        title="Loading the exception ledger..."
        description="Reconciling active commitment breaches into response-ready work objects for this workspace."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="min-h-36 animate-pulse bg-canvas/70" />
        <Panel className="min-h-36 animate-pulse bg-canvas/70" />
        <Panel className="min-h-36 animate-pulse bg-canvas/70" />
      </div>
      <Panel className="min-h-80 animate-pulse bg-canvas/70" />
    </div>
  );
}

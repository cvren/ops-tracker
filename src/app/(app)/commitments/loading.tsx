import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";

export default function CommitmentsLoading() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Commitments"
        title="Loading commitment policies..."
        description="Pulling the current workspace, project, template, and risk policy boundary."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="min-h-80 animate-pulse bg-canvas/70" />
        <Panel className="min-h-80 animate-pulse bg-canvas/70" />
      </div>
    </div>
  );
}

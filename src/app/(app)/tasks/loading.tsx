import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";

export default function TasksLoading() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tasks"
        title="Loading queue details."
        description="Preparing the drill-down list and saved-view filters."
      />

      <Panel className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-10 w-32 rounded-full bg-ink/10"
            />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.2fr_180px_180px_220px_220px_220px_auto]">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-11 rounded-3xl bg-ink/10" />
          ))}
        </div>
      </Panel>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Panel key={index} className="h-32 bg-ink/5" />
        ))}
      </div>
    </div>
  );
}

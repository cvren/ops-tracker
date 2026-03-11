import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";

export default function TemplatesLoading() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Templates"
        title="Loading repeat-work controls."
        description="Preparing templates, recurring schedules, and recent generation activity."
      />

      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Panel key={index} className="space-y-4">
            <div className="h-3 w-28 rounded-full bg-ink/10" />
            <div className="h-8 w-52 rounded-full bg-ink/10" />
            {Array.from({ length: 5 }).map((__, lineIndex) => (
              <div key={lineIndex} className="h-11 rounded-3xl bg-ink/10" />
            ))}
          </Panel>
        ))}
      </section>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Panel key={index} className="h-44 bg-ink/5" />
        ))}
      </div>
    </div>
  );
}

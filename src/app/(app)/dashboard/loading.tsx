import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Manager Console"
        title="Loading the morning risk sweep."
        description="Gathering overdue, blocked, stale review, and workload signals."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Panel key={index} className="space-y-3">
            <div className="h-3 w-24 rounded-full bg-ink/10" />
            <div className="h-12 w-20 rounded-full bg-ink/10" />
            <div className="h-3 w-full rounded-full bg-ink/10" />
          </Panel>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Panel key={index} className="space-y-4">
            <div className="h-3 w-24 rounded-full bg-ink/10" />
            <div className="h-8 w-40 rounded-full bg-ink/10" />
            {Array.from({ length: 3 }).map((__, cardIndex) => (
              <div
                key={cardIndex}
                className="h-24 rounded-[1.5rem] bg-ink/10"
              />
            ))}
          </Panel>
        ))}
      </section>
    </div>
  );
}

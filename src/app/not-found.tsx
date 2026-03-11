import Link from "next/link";

import { Panel } from "@/components/ui/panel";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <Panel className="w-full space-y-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Not found
        </p>
        <h1 className="text-3xl font-semibold text-ink">
          The requested record is no longer available.
        </h1>
        <p className="text-sm leading-6 text-ink/70">
          It may have been deleted or the URL may be stale.
        </p>
        <div>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2 text-sm font-semibold text-canvas transition hover:-translate-y-0.5"
          >
            Back to dashboard
          </Link>
        </div>
      </Panel>
    </main>
  );
}

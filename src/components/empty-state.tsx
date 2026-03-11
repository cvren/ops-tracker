import Link from "next/link";
import type { Route } from "next";

import { Panel } from "@/components/ui/panel";

type EmptyStateProps = {
  title: string;
  description: string;
  ctaHref?: Route;
  ctaLabel?: string;
};

export function EmptyState({
  title,
  description,
  ctaHref,
  ctaLabel
}: EmptyStateProps) {
  return (
    <Panel className="border-dashed border-black/15 bg-white/55 text-center">
      <div className="mx-auto max-w-xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Empty state
        </p>
        <h3 className="text-2xl font-semibold text-ink">{title}</h3>
        <p className="text-sm leading-6 text-ink/70">{description}</p>
        {ctaHref && ctaLabel ? (
          <div className="pt-2">
            <Link
              href={ctaHref}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2 text-sm font-semibold text-canvas transition hover:-translate-y-0.5"
            >
              {ctaLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

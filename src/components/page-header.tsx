import { type ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          {eyebrow}
        </p>
        <h1 className="text-4xl font-semibold text-ink sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-ink/70">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

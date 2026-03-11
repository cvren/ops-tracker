import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-4xl border border-black/10 bg-white/75 p-6 shadow-panel backdrop-blur",
        className
      )}
      {...props}
    />
  );
}

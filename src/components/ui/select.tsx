import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "min-h-11 w-full rounded-3xl border border-black/10 bg-white/85 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:bg-white",
        className
      )}
      {...props}
    />
  );
});

Select.displayName = "Select";

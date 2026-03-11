import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "min-h-11 w-full rounded-3xl border border-black/10 bg-white/85 px-4 py-3 text-sm text-ink outline-none ring-0 transition placeholder:text-ink/45 focus:border-accent focus:bg-white",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

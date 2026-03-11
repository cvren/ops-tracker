import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-32 w-full rounded-[1.5rem] border border-black/10 bg-white/85 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/45 focus:border-accent focus:bg-white",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

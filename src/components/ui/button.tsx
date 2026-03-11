import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  fullWidth?: boolean;
};

const buttonVariants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-ink text-canvas shadow-panel hover:-translate-y-0.5 hover:bg-black",
  secondary:
    "bg-white/80 text-ink ring-1 ring-black/10 hover:bg-white",
  ghost: "bg-transparent text-ink hover:bg-white/60",
  danger:
    "bg-signal text-white shadow-panel hover:-translate-y-0.5 hover:bg-[#d9673f]"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      fullWidth = false,
      type = "button",
      variant = "primary",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
          buttonVariants[variant],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

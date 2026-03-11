"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  fullWidth?: boolean;
};

export function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
  fullWidth = true
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      fullWidth={fullWidth}
    >
      {pending ? pendingLabel ?? "Working..." : label}
    </Button>
  );
}

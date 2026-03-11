"use client";

import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ConfirmActionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  hiddenInputs: Record<string, string>;
  message: string;
  label: string;
  variant?: "danger" | "secondary";
  children?: ReactNode;
};

export function ConfirmActionForm({
  action,
  children,
  hiddenInputs,
  label,
  message,
  variant = "danger"
}: ConfirmActionFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      className="space-y-3"
    >
      {Object.entries(hiddenInputs).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <Button type="submit" variant={variant}>
        {label}
      </Button>
    </form>
  );
}

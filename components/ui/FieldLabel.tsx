import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function FieldLabel({ className, required, children, ...props }: FieldLabelProps) {
  return (
    <label className={cn("mb-1.5 block text-xs font-semibold text-ink", className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-error">*</span>}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-error">{message}</p>;
}

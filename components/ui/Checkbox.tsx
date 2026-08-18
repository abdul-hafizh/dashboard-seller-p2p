import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = InputHTMLAttributes<HTMLInputElement>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "size-4.5 shrink-0 rounded-md border border-border accent-brand-purple",
          className,
        )}
        {...props}
      />
    );
  },
);
Checkbox.displayName = "Checkbox";

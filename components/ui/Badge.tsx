import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "info" | "error" | "warning" | "brand";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-muted text-ink-soft",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  error: "bg-error/10 text-error",
  warning: "bg-brand-orange/10 text-brand-orange-deep",
  brand: "bg-brand-purple/10 text-brand-purple-deep",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

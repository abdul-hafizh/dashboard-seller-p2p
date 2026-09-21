import type { ReactNode } from "react";
import { Box } from "lucide-react";
import { Footer } from "@/components/layout/Footer";

interface AuthCardProps {
  title: string;
  subtitle: string;
  error?: string | null;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthCard({ title, subtitle, error, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-xl shadow-ink/[0.04]">
        <div className="flex flex-col items-center text-center">
          <div className="brand-gradient flex size-16 items-center justify-center rounded-full shadow-lg shadow-brand-purple/25">
            <Box className="size-8 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-error/25 bg-error/10 px-3.5 py-3 text-xs font-semibold text-error">
            {error}
          </div>
        )}

        <div className="mt-6">{children}</div>
        <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>
      </div>
      </div>
      <Footer />
    </div>
  );
}

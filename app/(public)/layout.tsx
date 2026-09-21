import type { ReactNode } from "react";
import Link from "next/link";
import { Box } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { siteConfig } from "@/lib/site-config";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="brand-gradient flex size-9 items-center justify-center rounded-full">
              <Box className="size-5 text-white" strokeWidth={2.2} />
            </span>
            <span className="text-base font-extrabold text-ink">{siteConfig.appName}</span>
          </Link>
          <Link href="/login" className="text-sm font-bold text-brand-purple hover:underline">
            Masuk
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 py-10">
        <article className="mx-auto max-w-3xl rounded-3xl border border-border bg-surface p-6 md:p-10">
          {children}
        </article>
      </main>
      <Footer />
    </div>
  );
}

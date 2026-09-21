import type { ReactNode } from "react";

export function LegalTitle({ title, updated }: { title: string; updated?: string }) {
  return (
    <header className="mb-6 border-b border-border pb-5">
      <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
      {updated && <p className="mt-1.5 text-xs text-ink-soft">Terakhir diperbarui: {updated}</p>}
    </header>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-extrabold text-ink">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink/80 [&_a]:font-semibold [&_a]:text-brand-purple [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

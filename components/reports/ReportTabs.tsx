"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/finance", label: "Rekap Keuangan", hint: "Uang masuk, potongan, hak seller", icon: Wallet },
  { href: "/dashboard/sales", label: "Detail Penjualan", hint: "Per pesanan: item, harga, tanggal, Excel", icon: BarChart3 },
];

/** Menu "Laporan": the money summary and the per-order sales list, as two tabs. */
export function ReportTabs() {
  const pathname = usePathname();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
              active ? "border-brand-purple bg-brand-purple/5" : "border-border bg-surface hover:bg-surface-muted",
            )}
          >
            <t.icon className={cn("size-5 shrink-0", active ? "text-brand-purple" : "text-ink-faint")} />
            <span>
              <span className={cn("block text-sm font-bold", active ? "text-brand-purple" : "text-ink")}>{t.label}</span>
              <span className="block text-[11px] text-ink-faint">{t.hint}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

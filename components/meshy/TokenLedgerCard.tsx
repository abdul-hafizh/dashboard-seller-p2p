"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Coins, Search, ChevronLeft, ChevronRight, ArrowDownLeft, ArrowUpRight, Users, Receipt } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { periodQuery, type Period } from "@/components/ui/PeriodFilter";
import { formatCurrency, formatDateTime } from "@/lib/resources/format";

interface LedgerRow {
  Id: string;
  Type: "PURCHASE" | "USAGE" | "REFUND" | string;
  Amount: number;
  BalanceAfter: number | null;
  Description: string | null;
  CreatedAt: string;
  CustomerName: string | null;
  OrderNumber: string | null;
  PaidAmount: number | null;
  PaymentChannel: string | null;
  JobPrompt: string | null;
}

interface LedgerSummary {
  Transactions: number;
  TokensPurchased: number;
  TokensUsed: number;
  Purchases: number;
  PurchaseAmount: number;
  Customers: number;
}

const TYPE_TABS = [
  { key: "", label: "Semua" },
  { key: "PURCHASE", label: "Pembelian" },
  { key: "USAGE", label: "Pemakaian" },
] as const;

const TYPE_BADGE: Record<string, { label: string; tone: "success" | "info" | "warning" | "neutral" }> = {
  PURCHASE: { label: "Pembelian", tone: "success" },
  USAGE: { label: "Pemakaian", tone: "info" },
  REFUND: { label: "Pengembalian", tone: "warning" },
};

const channelLabel = (c: string | null) => (!c ? null : /google/i.test(c) ? "Google Play" : /doku/i.test(c) ? "DOKU" : c);

function Stat({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <Icon className="size-4 text-brand-purple" /> {label}
      </div>
      <p className="mt-1.5 text-lg font-extrabold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">{hint}</p>}
    </div>
  );
}

/** "Riwayat Token Customer" — every AI-token purchase and usage, for the chosen period. */
export function TokenLedgerCard({ period }: { period: Period }) {
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // A new period starts from the first page.
  const [lastPeriod, setLastPeriod] = useState(period);
  if (lastPeriod.from !== period.from || lastPeriod.to !== period.to) {
    setLastPeriod(period);
    setPage(1);
  }

  const { data, isLoading } = useSWR(
    ["token-ledger", period.from, period.to, type, search, page],
    () =>
      apiFetch<LedgerRow[]>("reports/token-ledger", {
        query: { ...periodQuery(period), type: type || undefined, search: search || undefined, page, limit: 20 },
      }),
    { keepPreviousData: true },
  );

  const summary = (data?.meta as { summary?: LedgerSummary } | undefined)?.summary;
  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const n = (v: number | undefined) => (v ?? 0).toLocaleString("id-ID");

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={ArrowDownLeft} label="Token Dibeli" value={n(summary?.TokensPurchased)} hint={`${n(summary?.Purchases)} transaksi pembelian`} />
        <Stat icon={Receipt} label="Nilai Pembelian" value={formatCurrency(summary?.PurchaseAmount ?? 0)} hint="Total dibayar customer untuk token" />
        <Stat icon={ArrowUpRight} label="Token Dipakai" value={n(summary?.TokensUsed)} hint="Untuk generate model 3D" />
        <Stat icon={Users} label="Customer" value={n(summary?.Customers)} hint="Yang membeli atau memakai token" />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Coins className="size-4" /> Riwayat Token Customer
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Customer atau no. pesanan"
                className="w-full pl-9 sm:w-56"
              />
            </div>
            {TYPE_TABS.map((t) => (
              <Button
                key={t.key}
                size="sm"
                type="button"
                variant={type === t.key ? "primary" : "outline"}
                onClick={() => {
                  setType(t.key);
                  setPage(1);
                }}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        {isLoading && rows.length === 0 ? (
          <CardBody className="flex justify-center py-10">
            <Spinner className="size-5" />
          </CardBody>
        ) : rows.length === 0 ? (
          <CardBody>
            <EmptyState icon={Coins} title="Belum ada transaksi token" description="Tidak ada pembelian atau pemakaian token di periode ini." />
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="whitespace-nowrap px-4 py-3">Waktu</th>
                  <th className="whitespace-nowrap px-4 py-3">Customer</th>
                  <th className="whitespace-nowrap px-4 py-3">Jenis</th>
                  <th className="min-w-64 px-4 py-3">Keterangan</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Token</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Saldo</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Dibayar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const badge = TYPE_BADGE[r.Type] ?? { label: r.Type, tone: "neutral" as const };
                  const channel = channelLabel(r.PaymentChannel);
                  return (
                    <tr key={r.Id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatDateTime(r.CreatedAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink">{r.CustomerName ?? "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="line-clamp-2 text-ink">{r.Description || r.JobPrompt || "-"}</span>
                        {(r.OrderNumber || channel) && (
                          <span className="mt-0.5 block text-xs text-ink-faint">
                            {[r.OrderNumber, channel].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 text-right font-bold ${r.Amount >= 0 ? "text-success" : "text-error"}`}>
                        {r.Amount >= 0 ? "+" : "−"}
                        {Math.abs(r.Amount).toLocaleString("id-ID")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-ink-soft">
                        {r.BalanceAfter === null ? "-" : r.BalanceAfter.toLocaleString("id-ID")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-ink">
                        {r.Type === "PURCHASE" && r.PaidAmount !== null ? formatCurrency(r.PaidAmount) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-ink-soft">
            <span>
              Halaman {pagination.currentPage} dari {pagination.totalPages} · {pagination.totalItems} transaksi
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button size="sm" variant="outline" type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

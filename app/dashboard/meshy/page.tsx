"use client";

import { useState } from "react";
import useSWR from "swr";
import { Sparkles, CheckCircle2, XCircle, Loader2, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner, Spinner } from "@/components/ui/Spinner";
import { ALL_TIME, PeriodFilter, periodQuery, type Period } from "@/components/ui/PeriodFilter";
import { MeshyBalanceCard } from "@/components/meshy/MeshyBalanceCard";
import { TokenLedgerCard } from "@/components/meshy/TokenLedgerCard";
import { ResourceTable } from "@/components/crud/ResourceTable";
import { ExportButton } from "@/components/ui/ExportButton";
import { modelFormatsConfig } from "@/lib/resources/model-formats.config";
import { formatDateTime } from "@/lib/resources/format";
import { cn } from "@/lib/utils";

interface MeshyJob {
  Id: string;
  Kind: "text-to-3d" | "image-to-3d";
  Prompt: string | null;
  Status: string;
  Progress: number | null;
  CustomerName: string | null;
  StoreName: string | null;
  CreatedAt: string;
  FinishedAt: string | null;
}

interface MeshySummary {
  Total: number;
  Succeeded: number;
  Failed: number;
  InProgress: number;
  TextTo3D: number;
  ImageTo3D: number;
  TokensUsed: number | null;
}

const STATUS_TABS = [
  { key: "", label: "Semua" },
  { key: "SUCCEEDED", label: "Berhasil" },
  { key: "IN_PROGRESS", label: "Diproses" },
  { key: "FAILED", label: "Gagal" },
] as const;

const STATUS_BADGE: Record<string, { label: string; tone: "success" | "info" | "error" | "neutral" | "warning" }> = {
  SUCCEEDED: { label: "Berhasil", tone: "success" },
  IN_PROGRESS: { label: "Diproses", tone: "info" },
  PENDING: { label: "Antre", tone: "warning" },
  FAILED: { label: "Gagal", tone: "error" },
  CANCELED: { label: "Dibatalkan", tone: "neutral" },
  EXPIRED: { label: "Kedaluwarsa", tone: "neutral" },
};

function Stat({ icon: Icon, label, value, hint, tone }: { icon: LucideIcon; label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <Icon className={cn("size-4 text-brand-purple", tone)} /> {label}
      </div>
      <p className="mt-1.5 text-lg font-extrabold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">{hint}</p>}
    </div>
  );
}

/** Aktivitas Meshy — the platform's Meshy credit balance and the 3D generations it runs (admin only). */
export default function MeshyActivityPage() {
  const { isAdmin, loading } = useAuth();
  const [period, setPeriod] = useState<Period>(ALL_TIME);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR(
    isAdmin ? ["meshy-activity", period.from, period.to, status, page] : null,
    () => apiFetch<MeshyJob[]>("reports/meshy-activity", { query: { ...periodQuery(period), status: status || undefined, page, limit: 20 } }),
    { keepPreviousData: true, refreshInterval: 60_000 },
  );

  if (loading) return <FullPageSpinner />;
  if (!isAdmin) {
    return <EmptyState icon={ShieldAlert} title="Akses terbatas" description="Halaman ini hanya bisa diakses oleh Super Admin." />;
  }

  const summary = (data?.meta as { summary?: MeshySummary } | undefined)?.summary;
  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const n = (v: number | null | undefined) => (v ?? 0).toLocaleString("id-ID");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Aktivitas Meshy AI</h1>
          <p className="mt-1 text-sm text-ink-soft">Saldo kredit akun Meshy Petope dan pembuatan model 3D AI oleh customer.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter
            label="Tanggal generate"
            value={period}
            onChange={(p) => {
              setPeriod(p);
              setPage(1);
            }}
          />
          <ExportButton path="reports/meshy-activity/export" query={{ ...periodQuery(period), status: status || undefined }} />
        </div>
      </div>

      <MeshyBalanceCard />

      <ResourceTable config={modelFormatsConfig} extraQuery={{ all: 1 }} hidePagination />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Sparkles} label="Total Generate" value={n(summary?.Total)} hint={`${n(summary?.TextTo3D)} dari teks · ${n(summary?.ImageTo3D)} dari foto`} />
        <Stat icon={CheckCircle2} label="Berhasil" value={n(summary?.Succeeded)} tone="text-success" />
        <Stat icon={Loader2} label="Sedang Diproses" value={n(summary?.InProgress)} />
        <Stat icon={XCircle} label="Gagal / Dibatalkan" value={n(summary?.Failed)} tone="text-error" />
      </div>
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Riwayat Generate</CardTitle>
          <div className="flex gap-1">
            {STATUS_TABS.map((t) => (
              <Button
                key={t.key}
                size="sm"
                type="button"
                variant={status === t.key ? "primary" : "outline"}
                onClick={() => {
                  setStatus(t.key);
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
            <EmptyState icon={Sparkles} title="Belum ada aktivitas" description="Tidak ada pembuatan model 3D di periode ini." />
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="whitespace-nowrap px-4 py-3">Waktu</th>
                  <th className="whitespace-nowrap px-4 py-3">Customer</th>
                  <th className="whitespace-nowrap px-4 py-3">Jenis</th>
                  <th className="min-w-64 px-4 py-3">Prompt</th>
                  <th className="whitespace-nowrap px-4 py-3">Toko</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-4 py-3">Selesai</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((j) => {
                  const badge = STATUS_BADGE[String(j.Status).toUpperCase()] ?? { label: j.Status, tone: "neutral" as const };
                  return (
                    <tr key={j.Id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatDateTime(j.CreatedAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink">{j.CustomerName ?? "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{j.Kind === "image-to-3d" ? "Foto" : "Teks"}</td>
                      <td className="px-4 py-3 text-ink">
                        <span className="line-clamp-2">{j.Prompt || "-"}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{j.StoreName ?? "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge tone={badge.tone}>
                          {badge.label}
                          {String(j.Status).toUpperCase() === "IN_PROGRESS" && j.Progress != null ? ` ${j.Progress}%` : ""}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{j.FinishedAt ? formatDateTime(j.FinishedAt) : "-"}</td>
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
              Halaman {pagination.currentPage} dari {pagination.totalPages} · {pagination.totalItems} generate
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

      <div className="mt-2">
        <h2 className="text-base font-extrabold text-ink">Pembelian & Pemakaian Token</h2>
        <p className="mt-0.5 text-xs text-ink-soft">Riwayat token AI Petope milik customer — dibeli (DOKU / Google Play) dan dipakai untuk generate.</p>
      </div>
      <TokenLedgerCard period={period} />
    </div>
  );
}

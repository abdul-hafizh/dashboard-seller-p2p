"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Sparkles, RefreshCw, AlertTriangle } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate, formatDateTime } from "@/lib/resources/format";

interface MeshyBalance {
  Balance: number;
  MonthlyCredits: number | null;
  PermanentCredits: number | null;
  MonthlyResetsAt: string | null;
  CheckedAt: string;
}

const LOW_MESHY_BALANCE = 300;

/** Sisa kredit akun Meshy milik Petope (bukan token customer). */
export function MeshyBalanceCard() {
  const [refreshing, setRefreshing] = useState(false);
  const { data, error, isLoading, mutate } = useSWR("meshy-balance", () => apiFetch<MeshyBalance>("reports/meshy-balance"), {
    refreshInterval: 5 * 60 * 1000,
  });
  const b = data?.data;
  const low = b ? b.Balance < LOW_MESHY_BALANCE : false;

  const refresh = async () => {
    setRefreshing(true);
    try {
      await mutate(await apiFetch<MeshyBalance>("reports/meshy-balance", { query: { refresh: 1 } }), { revalidate: false });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat saldo Meshy");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" /> Saldo Kredit Meshy AI
        </CardTitle>
        <Button variant="ghost" size="sm" type="button" onClick={refresh} loading={refreshing}>
          {!refreshing && <RefreshCw className="size-4" />} Perbarui
        </Button>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner className="size-5" />
          </div>
        ) : error || !b ? (
          <p className="text-sm text-error">{error instanceof Error ? error.message : "Saldo Meshy tidak tersedia"}</p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className={`text-3xl font-extrabold ${low ? "text-error" : "text-ink"}`}>
                {b.Balance.toLocaleString("id-ID")} <span className="text-base font-semibold text-ink-soft">kredit</span>
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Bulanan {b.MonthlyCredits?.toLocaleString("id-ID") ?? "-"} · Permanen {b.PermanentCredits?.toLocaleString("id-ID") ?? "-"}
                {b.MonthlyResetsAt && <> · Reset {formatDate(b.MonthlyResetsAt)}</>}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-faint">Dicek {formatDateTime(b.CheckedAt)}</p>
            </div>
            {low && (
              <div className="flex items-center gap-2 rounded-xl bg-error/10 px-3 py-2 text-xs font-semibold text-error">
                <AlertTriangle className="size-4" /> Saldo menipis — isi ulang di meshy.ai agar pembuatan model tidak gagal.
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

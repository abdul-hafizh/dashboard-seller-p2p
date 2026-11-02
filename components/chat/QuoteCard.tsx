"use client";

import Link from "next/link";
import useSWR from "swr";
import { Pencil, Receipt } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/resources/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type QuoteStatus = "SENT" | "ACCEPTED" | "REJECTED" | "ORDERED" | "CANCELLED";

interface LiveQuote {
  Id: string;
  Status: QuoteStatus;
  StatusLabel: string;
  Revision: number;
  RejectReason: string | null;
  OrderId: string | null;
}

const TONE: Record<QuoteStatus, "warning" | "success" | "error" | "neutral" | "info"> = {
  SENT: "warning",
  ACCEPTED: "info",
  REJECTED: "error",
  ORDERED: "success",
  CANCELLED: "neutral",
};

/** A CUSTOM_QUOTE card (penawaran from Pesanan Custom) as the store sees it in
 * the chat: what was offered, and the penawaran's live status — an older
 * revision says it was replaced. */
export function QuoteCard({
  quoteId,
  quoteNumber,
  revision,
  payableAmount,
  summary,
}: {
  quoteId: string;
  quoteNumber?: string;
  revision?: number;
  payableAmount?: number;
  summary?: string;
}) {
  const { data } = useSWR(["custom-quote", quoteId], () => apiFetch<LiveQuote>(`custom-quotes/${quoteId}`), { refreshInterval: 30000 });
  const q = data?.data;
  const outdated = q && revision != null && q.Revision !== revision;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-3 text-left">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange-deep">
          <Receipt className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-orange-deep">Penawaran harga</p>
          <p className="text-sm font-semibold text-ink">
            {quoteNumber}
            {revision && revision > 1 ? ` · revisi ${revision}` : ""}
          </p>
          {summary && <p className="text-xs text-ink-soft">{summary}</p>}
          <p className="mt-1 text-base font-extrabold text-ink">{formatCurrency(payableAmount ?? 0)}</p>
          <p className="text-[11px] text-ink-faint">Belum termasuk ongkir</p>
          <div className="mt-2">
            {!q ? null : outdated ? (
              <Badge tone="neutral">Diganti penawaran revisi {q.Revision}</Badge>
            ) : (
              <Badge tone={TONE[q.Status]}>{q.StatusLabel}</Badge>
            )}
            {q?.Status === "REJECTED" && !outdated && q.RejectReason && <p className="mt-1 text-xs text-ink-soft">“{q.RejectReason}”</p>}
          </div>
        </div>
      </div>
      {q && !outdated && (q.Status === "SENT" || q.Status === "REJECTED" || (q.Status === "ORDERED" && q.OrderId)) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {q.Status === "ORDERED" && q.OrderId ? (
            <Link href={`/dashboard/orders/${q.OrderId}`}>
              <Button type="button" size="sm" variant="outline">
                Lihat Pesanan
              </Button>
            </Link>
          ) : (
            <Link href={`/dashboard/custom-orders?quoteId=${encodeURIComponent(quoteId)}`}>
              <Button type="button" size="sm" variant={q.Status === "REJECTED" ? "primary" : "outline"}>
                <Pencil className="size-4" /> Ubah & Kirim Ulang
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

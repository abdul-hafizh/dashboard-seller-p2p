"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { Undo2, CheckCircle2, XCircle, Banknote, Search } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formatCurrency, formatDateTime } from "@/lib/resources/format";
import { ALL_TIME, PeriodFilter, periodQuery, type Period } from "@/components/ui/PeriodFilter";
import { ExportButton } from "@/components/ui/ExportButton";

// Pengembalian (retur): the customer asks from the app; the store (or an
// admin) approves or rejects; an admin transfers the money back and marks it
// "Dana Dikembalikan". See api-meshy OrderReturnController.

type ReturnStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "REFUNDED";

interface OrderReturn {
  Id: string;
  OrderId: string;
  Reason: string;
  Description: string;
  Status: ReturnStatus;
  StatusLabel: string;
  RefundAmount: number | string | null;
  MerchantNote: string | null;
  AdminNote: string | null;
  ProcessedAt: string | null;
  RefundedAt: string | null;
  CreatedAt: string;
  StoreName?: string;
  Order?: { Id: string; OrderNumber: string | null; TotalAmount: number | string | null };
  Customer?: { Id: string; FullName: string | null; Email: string | null; Phone: string | null };
  Images?: { Id: string; FileName: string | null; SortOrder: number }[];
}

const STATUS: Record<ReturnStatus, { label: string; tone: "warning" | "success" | "error" | "info" }> = {
  REQUESTED: { label: "Menunggu Persetujuan", tone: "warning" },
  APPROVED: { label: "Disetujui · Menunggu Refund", tone: "info" },
  REJECTED: { label: "Ditolak", tone: "error" },
  REFUNDED: { label: "Dana Dikembalikan", tone: "success" },
};

const FILTERS: { key: "" | ReturnStatus; label: string }[] = [
  { key: "", label: "Semua" },
  { key: "REQUESTED", label: "Menunggu Persetujuan" },
  { key: "APPROVED", label: "Menunggu Refund" },
  { key: "REFUNDED", label: "Dana Dikembalikan" },
  { key: "REJECTED", label: "Ditolak" },
];

const imageUrl = (r: OrderReturn, imageId: string) => `/api/backend/order-returns/${r.Id}/images/${imageId}`;

type Action = { kind: "approve" | "reject" | "refund"; row: OrderReturn };

export default function ReturnsPage() {
  const { isAdmin, isMerchant } = useAuth();
  const [status, setStatus] = useState<"" | ReturnStatus>("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>(ALL_TIME);
  const [action, setAction] = useState<Action | null>(null);

  const list = useSWR(isAdmin || isMerchant ? ["order-returns", status, search, period.from, period.to] : null, () =>
    apiFetch<OrderReturn[]>("order-returns", {
      query: { status: status || undefined, search: search.trim() || undefined, ...periodQuery(period) },
    }),
  );

  if (!isAdmin && !isMerchant) {
    return <EmptyState icon={Undo2} title="Tidak ada akses" description="Menu ini untuk seller dan admin." />;
  }

  const rows = list.data?.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Pengembalian</h1>
        <p className="text-sm text-ink-soft">
          {isAdmin
            ? "Pengajuan pengembalian dari customer. Setelah disetujui, transfer dana ke customer lalu tandai \"Dana Dikembalikan\"."
            : "Pengajuan pengembalian dari customer untuk pesanan tokomu. Setujui atau tolak dengan alasan yang jelas."}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Daftar Pengajuan</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
              <Input className="pl-9" placeholder="Cari no. pesanan" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <PeriodFilter value={period} onChange={setPeriod} label="Tanggal pengajuan" />
            <ExportButton
              path="order-returns/export"
              query={{ status: status || undefined, search: search.trim() || undefined, ...periodQuery(period) }}
            />
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button key={f.key} size="sm" type="button" variant={status === f.key ? "primary" : "outline"} onClick={() => setStatus(f.key)}>
                {f.label}
              </Button>
            ))}
          </div>

          {list.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState icon={Undo2} title="Belum ada pengajuan" description="Pengajuan pengembalian dari customer akan muncul di sini." />
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.Id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/dashboard/orders/${r.OrderId}`} className="font-bold text-brand-purple hover:underline">
                          {r.Order?.OrderNumber ?? r.OrderId}
                        </Link>
                        <Badge tone={STATUS[r.Status]?.tone ?? "info"}>{STATUS[r.Status]?.label ?? r.StatusLabel}</Badge>
                      </div>
                      <p className="text-xs text-ink-soft">
                        Diajukan {formatDateTime(r.CreatedAt)}
                        {r.Customer?.FullName ? ` · ${r.Customer.FullName}` : ""}
                        {r.Customer?.Phone ? ` · ${r.Customer.Phone}` : ""}
                        {isAdmin && r.StoreName ? ` · Toko: ${r.StoreName}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-ink-soft">Dana dikembalikan</p>
                      <p className="font-extrabold text-ink">{formatCurrency(Number(r.RefundAmount ?? 0))}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-surface-muted/60 p-3 text-sm">
                    <p className="font-semibold text-ink">{r.Reason}</p>
                    <p className="mt-0.5 whitespace-pre-line text-ink-soft">{r.Description}</p>
                  </div>

                  {!!r.Images?.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.Images.map((img) => (
                        <a key={img.Id} href={imageUrl(r, img.Id)} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageUrl(r, img.Id)} alt={img.FileName ?? "Foto pengembalian"} className="size-20 rounded-lg border border-border object-cover" />
                        </a>
                      ))}
                    </div>
                  )}

                  {(r.MerchantNote || r.AdminNote) && (
                    <div className="mt-3 space-y-0.5 text-xs text-ink-soft">
                      {r.MerchantNote && <p>Catatan toko: {r.MerchantNote}</p>}
                      {r.AdminNote && <p>Catatan admin: {r.AdminNote}</p>}
                      {r.RefundedAt && <p>Dana dikembalikan {formatDateTime(r.RefundedAt)}</p>}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {r.Status === "REQUESTED" && (
                      <>
                        <Button size="sm" type="button" onClick={() => setAction({ kind: "approve", row: r })}>
                          <CheckCircle2 className="size-4" /> Setujui
                        </Button>
                        <Button size="sm" type="button" variant="outline" onClick={() => setAction({ kind: "reject", row: r })}>
                          <XCircle className="size-4" /> Tolak
                        </Button>
                      </>
                    )}
                    {r.Status === "APPROVED" && isAdmin && (
                      <>
                        <Button size="sm" type="button" onClick={() => setAction({ kind: "refund", row: r })}>
                          <Banknote className="size-4" /> Dana Dikembalikan
                        </Button>
                        <Button size="sm" type="button" variant="outline" onClick={() => setAction({ kind: "reject", row: r })}>
                          <XCircle className="size-4" /> Tolak
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {action && <ActionModal action={action} onClose={() => setAction(null)} onDone={() => list.mutate()} />}
    </div>
  );
}

const ACTION_TEXT = {
  approve: {
    title: "Setujui Pengembalian",
    button: "Setujui",
    note: "Catatan untuk customer (opsional)",
    placeholder: "Contoh: mohon maaf atas ketidaknyamanannya",
    done: "Pengembalian disetujui. Admin akan mengirim dananya ke customer.",
    required: false,
  },
  reject: {
    title: "Tolak Pengembalian",
    button: "Tolak",
    note: "Alasan penolakan",
    placeholder: "Contoh: foto tidak menunjukkan kerusakan pada barang",
    done: "Pengembalian ditolak",
    required: true,
  },
  refund: {
    title: "Tandai Dana Dikembalikan",
    button: "Simpan",
    note: "Keterangan transfer (opsional)",
    placeholder: "Contoh: transfer BCA, ref. 1234567",
    done: "Dana pengembalian ditandai sudah dikirim",
    required: false,
  },
} as const;

function ActionModal({ action, onClose, onDone }: { action: Action; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const text = ACTION_TEXT[action.kind];
  const r = action.row;

  const submit = async () => {
    setSaving(true);
    try {
      await apiFetch(`order-returns/${r.Id}/${action.kind}`, { method: "POST", json: { Note: note.trim() || undefined } });
      toast.success(text.done);
      onDone();
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={text.title}
      description={`${r.Order?.OrderNumber ?? r.OrderId} · ${formatCurrency(Number(r.RefundAmount ?? 0))}`}
      size="sm"
    >
      <div className="space-y-3">
        {action.kind === "approve" && (
          <p className="rounded-xl bg-surface-muted/60 p-3 text-sm text-ink-soft">
            Dengan menyetujui, pesanan ini tidak masuk saldo penjualan toko dan dana dikembalikan ke customer oleh admin Petope.
          </p>
        )}
        {action.kind === "refund" && (
          <p className="rounded-xl bg-surface-muted/60 p-3 text-sm text-ink-soft">
            Pastikan dana {formatCurrency(Number(r.RefundAmount ?? 0))} sudah ditransfer ke {r.Customer?.FullName ?? "customer"}.
          </p>
        )}
        <div>
          <FieldLabel htmlFor="return-note" required={text.required}>
            {text.note}
          </FieldLabel>
          <Textarea id="return-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={text.placeholder} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            variant={action.kind === "reject" ? "danger" : "primary"}
            onClick={submit}
            loading={saving}
            disabled={text.required && note.trim().length < 5}
          >
            {text.button}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

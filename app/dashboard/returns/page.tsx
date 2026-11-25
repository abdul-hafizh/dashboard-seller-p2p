"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { Undo2, CheckCircle2, XCircle, Banknote, Search, PackageCheck, Settings2, Truck } from "lucide-react";
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
// admin) approves or rejects; the customer sends the item back (own courier,
// own cost) and enters the resi; the store confirms it arrived; an admin
// transfers the money back (paid without shipping, minus the Pengaturan Retur
// cuts) and marks it "Dana Dikembalikan". See api-meshy OrderReturnController.

type ReturnStatus = "REQUESTED" | "APPROVED" | "ITEM_SHIPPED" | "ITEM_RECEIVED" | "REJECTED" | "REFUNDED";

interface RefundBreakdown {
  PaidAmount: number;
  Deductions: { Code: string; Label: string; Amount: number }[];
  DeductionAmount: number;
  RefundAmount: number;
}

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
  ItemAmount?: number | string | null;
  DeductionAmount?: number | string | null;
  RefundBreakdown?: RefundBreakdown | null;
  ReturnShippingRequired?: boolean | null;
  ReturnCourier?: string | null;
  ReturnTrackingNumber?: string | null;
  ReturnShippedAt?: string | null;
  ItemReceivedAt?: string | null;
  CanRefund?: boolean;
  StoreName?: string;
  Order?: { Id: string; OrderNumber: string | null; TotalAmount: number | string | null };
  Customer?: { Id: string; FullName: string | null; Email: string | null; Phone: string | null };
  Images?: { Id: string; FileName: string | null; SortOrder: number }[];
}

const STATUS: Record<ReturnStatus, { label: string; tone: "warning" | "success" | "error" | "info" }> = {
  REQUESTED: { label: "Menunggu Persetujuan", tone: "warning" },
  APPROVED: { label: "Disetujui", tone: "info" },
  ITEM_SHIPPED: { label: "Barang Dikirim Balik", tone: "warning" },
  ITEM_RECEIVED: { label: "Barang Diterima · Menunggu Refund", tone: "info" },
  REJECTED: { label: "Ditolak", tone: "error" },
  REFUNDED: { label: "Dana Dikembalikan", tone: "success" },
};

/** Badge text — an approved return still waiting for the parcel back says so. */
const statusLabel = (r: OrderReturn) =>
  r.Status === "APPROVED"
    ? r.ReturnShippingRequired
      ? "Disetujui · Menunggu Barang Dikirim"
      : "Disetujui · Menunggu Refund"
    : (STATUS[r.Status]?.label ?? r.StatusLabel);

const FILTERS: { key: "" | ReturnStatus; label: string }[] = [
  { key: "", label: "Semua" },
  { key: "REQUESTED", label: "Menunggu Persetujuan" },
  { key: "APPROVED", label: "Disetujui" },
  { key: "ITEM_SHIPPED", label: "Barang Dikirim Balik" },
  { key: "ITEM_RECEIVED", label: "Menunggu Refund" },
  { key: "REFUNDED", label: "Dana Dikembalikan" },
  { key: "REJECTED", label: "Ditolak" },
];

const imageUrl = (r: OrderReturn, imageId: string) => `/api/backend/order-returns/${r.Id}/images/${imageId}`;

type Action = { kind: "approve" | "reject" | "refund" | "receive"; row: OrderReturn };

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Pengembalian</h1>
          <p className="text-sm text-ink-soft">
            {isAdmin
              ? "Pengajuan pengembalian dari customer. Setelah toko menerima barang retur (atau tidak ada barang yang perlu dikirim balik), transfer dana ke customer lalu tandai \"Dana Dikembalikan\"."
              : "Pengajuan pengembalian dari customer untuk pesanan tokomu. Setujui atau tolak dengan alasan yang jelas. Setelah disetujui, customer mengirim balik barang dengan ongkir sendiri — tekan \"Barang Diterima\" saat paketnya sampai."}
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/return-settings">
            <Button size="sm" variant="outline" type="button">
              <Settings2 className="size-4" /> Pengaturan Retur
            </Button>
          </Link>
        )}
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
                        <Badge tone={STATUS[r.Status]?.tone ?? "info"}>{statusLabel(r)}</Badge>
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

                  <RefundDetails r={r} />

                  {r.ReturnTrackingNumber && (
                    <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-ink">
                      <Truck className="size-4 text-ink-soft" />
                      Dikirim balik lewat <b>{r.ReturnCourier ?? "-"}</b> · resi <b className="font-mono">{r.ReturnTrackingNumber}</b>
                      {r.ReturnShippedAt && <span className="text-xs text-ink-soft">({formatDateTime(r.ReturnShippedAt)})</span>}
                      {r.ItemReceivedAt && <span className="text-xs text-success">· diterima {formatDateTime(r.ItemReceivedAt)}</span>}
                    </p>
                  )}

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
                    {r.Status === "ITEM_SHIPPED" && (
                      <Button size="sm" type="button" onClick={() => setAction({ kind: "receive", row: r })}>
                        <PackageCheck className="size-4" /> Barang Diterima
                      </Button>
                    )}
                    {isAdmin && r.CanRefund && (
                      <Button size="sm" type="button" onClick={() => setAction({ kind: "refund", row: r })}>
                        <Banknote className="size-4" /> Dana Dikembalikan
                      </Button>
                    )}
                    {isAdmin && ["APPROVED", "ITEM_SHIPPED", "ITEM_RECEIVED"].includes(r.Status) && (
                      <Button size="sm" type="button" variant="outline" onClick={() => setAction({ kind: "reject", row: r })}>
                        <XCircle className="size-4" /> Tolak
                      </Button>
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

/** Paid without shipping − cuts = money back (snapshotted when the customer asked). */
function RefundDetails({ r }: { r: OrderReturn }) {
  const b = r.RefundBreakdown;
  if (!b || !b.Deductions?.length) return null;
  return (
    <div className="mt-3 max-w-md space-y-0.5 text-xs">
      <div className="flex justify-between gap-3">
        <span className="text-ink-soft">Dibayar customer (tanpa ongkir)</span>
        <span className="font-semibold tabular-nums">{formatCurrency(b.PaidAmount)}</span>
      </div>
      {b.Deductions.map((d) => (
        <div key={d.Code} className="flex justify-between gap-3">
          <span className="text-ink-soft">{d.Label}</span>
          <span className="tabular-nums text-error">− {formatCurrency(d.Amount)}</span>
        </div>
      ))}
      <div className="flex justify-between gap-3 border-t border-border pt-0.5">
        <span className="font-semibold">Dana dikembalikan</span>
        <span className="font-bold tabular-nums">{formatCurrency(b.RefundAmount)}</span>
      </div>
      <p className="text-ink-faint">Ongkir pesanan tidak dikembalikan; ongkir kirim balik ditanggung customer.</p>
    </div>
  );
}

const ACTION_TEXT = {
  approve: {
    title: "Setujui Pengembalian",
    button: "Setujui",
    note: "Catatan untuk customer (opsional)",
    placeholder: "Contoh: mohon maaf atas ketidaknyamanannya",
    done: "Pengembalian disetujui.",
    required: false,
  },
  receive: {
    title: "Barang Retur Diterima",
    button: "Barang Diterima",
    note: "Catatan kondisi barang (opsional)",
    placeholder: "Contoh: barang diterima lengkap, kondisi sesuai foto",
    done: "Barang retur ditandai diterima. Admin akan mengirim dananya ke customer.",
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
            {r.ReturnShippingRequired
              ? "Customer akan diminta mengirim balik barang ke alamat tokomu dengan ongkir sendiri. Tekan \"Barang Diterima\" setelah paketnya sampai — baru setelah itu admin Petope mengembalikan dananya. Pesanan ini tidak masuk saldo penjualan toko."
              : "Barang tidak diterima customer, jadi tidak ada yang dikirim balik. Dana dikembalikan ke customer oleh admin Petope, dan pesanan ini tidak masuk saldo penjualan toko."}
          </p>
        )}
        {action.kind === "receive" && (
          <p className="rounded-xl bg-surface-muted/60 p-3 text-sm text-ink-soft">
            Pastikan paket resi {r.ReturnTrackingNumber ?? "-"} sudah sampai dan barangnya sesuai. Jika barang tidak sesuai, jangan tekan ini —
            hubungi admin Petope.
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

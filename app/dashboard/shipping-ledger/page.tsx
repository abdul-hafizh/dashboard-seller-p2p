"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Truck, Wallet, Plus, Trash2, Scale, Info } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formatCurrency, formatDateTime } from "@/lib/resources/format";

interface LedgerEntry {
  Id: string;
  EntryType: "CUSTOMER_PAYMENT" | "TOPUP" | "COURIER_CHARGE" | "ADJUSTMENT";
  Direction: "IN" | "OUT";
  Account: "PETOPE" | "BITESHIP";
  Amount: number;
  OrderId: string | null;
  Reference: string | null;
  Note: string | null;
  IsEstimate: boolean;
  EntryDate: string;
  Order?: { Id: string; OrderNumber: string | null } | null;
}

interface LedgerSummary {
  CustomerPayments: number;
  TopUps: number;
  CourierCharges: number;
  EstimatedCharges: number;
  PetopeShippingCash: number;
  BiteshipBalance: number;
  Margin: number;
}

const TYPE_LABEL: Record<LedgerEntry["EntryType"], { label: string; tone: "success" | "info" | "warning" | "neutral" }> = {
  CUSTOMER_PAYMENT: { label: "Ongkir dari customer", tone: "success" },
  TOPUP: { label: "Top-up Biteship", tone: "info" },
  COURIER_CHARGE: { label: "Biaya kurir Biteship", tone: "warning" },
  ADJUSTMENT: { label: "Penyesuaian", tone: "neutral" },
};

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function Stat({ icon: Icon, label, value, hint, tone }: { icon: typeof Wallet; label: string; value: string; hint?: string; tone?: "error" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <Icon className="size-4 text-brand-purple" /> {label}
      </div>
      <p className={`mt-1.5 text-lg font-extrabold ${tone === "error" ? "text-error" : "text-ink"}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">{hint}</p>}
    </div>
  );
}

/**
 * Keuangan Ongkir — shipping money in (paid by customers) and out (top-ups
 * to Biteship, courier charges). Customer payments and courier charges are
 * recorded automatically; top-ups and corrections are entered here.
 */
export default function ShippingLedgerPage() {
  const { isAdmin } = useAuth();
  const [from, setFrom] = useState(() => {
    const now = new Date();
    return toDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [to, setTo] = useState(() => toDateInput(new Date()));
  const [type, setType] = useState("");
  const [modal, setModal] = useState<"topup" | "adjust" | null>(null);

  const { data, isLoading, mutate } = useSWR(isAdmin ? ["shipping-ledger", from, to, type] : null, () =>
    apiFetch<LedgerEntry[]>("shipping-ledger", { query: { from, to, type: type || undefined } }),
  );

  if (!isAdmin) {
    return (
      <Card>
        <EmptyState icon={Truck} title="Khusus admin" description="Halaman ini hanya untuk admin." />
      </Card>
    );
  }

  const entries = data?.data ?? [];
  const period = data?.meta?.period as LedgerSummary | undefined;
  const allTime = data?.meta?.allTime as LedgerSummary | undefined;

  const remove = async (e: LedgerEntry) => {
    if (!window.confirm(`Hapus catatan ${TYPE_LABEL[e.EntryType].label} ${formatCurrency(e.Amount)}?`)) return;
    try {
      await apiFetch(`shipping-ledger/${e.Id}`, { method: "DELETE" });
      toast.success("Catatan dihapus");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menghapus");
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-base font-extrabold text-ink">Keuangan Ongkir</h1>
            <p className="mt-0.5 text-xs text-ink-soft">
              Ongkir masuk dari customer dan keluar ke Biteship (top-up saldo & biaya kurir per pengiriman).
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => setModal("topup")}>
              <Plus className="size-4" /> Catat Top-up Biteship
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setModal("adjust")}>
              <Scale className="size-4" /> Penyesuaian
            </Button>
          </div>
        </div>
      </Card>

      {allTime && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            icon={Wallet}
            label="Perkiraan Saldo Biteship"
            value={formatCurrency(allTime.BiteshipBalance)}
            tone={allTime.BiteshipBalance < 0 ? "error" : undefined}
            hint={
              allTime.BiteshipBalance < 0
                ? "Minus: catat saldo awal / top-up Biteship lewat tombol di atas, lalu cocokkan dengan dashboard Biteship."
                : "Total top-up − biaya kurir (sepanjang waktu). Cocokkan dengan dashboard Biteship."
            }
          />
          <Stat icon={ArrowDownLeft} label="Kas Ongkir Petope" value={formatCurrency(allTime.PetopeShippingCash)} hint="Ongkir diterima − top-up ke Biteship (sepanjang waktu)" />
          <Stat icon={Scale} label="Selisih Ongkir" value={formatCurrency(allTime.Margin)} hint="Ongkir dari customer − biaya kurir (sepanjang waktu)" />
        </div>
      )}

      <Card>
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="sl-from">Dari</FieldLabel>
              <Input id="sl-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="sl-to">Sampai</FieldLabel>
              <Input id="sl-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="sl-type">Jenis</FieldLabel>
              <Select id="sl-type" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Semua</option>
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {period && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat icon={ArrowDownLeft} label="Ongkir Masuk (periode)" value={formatCurrency(period.CustomerPayments)} />
              <Stat icon={ArrowUpRight} label="Top-up ke Biteship (periode)" value={formatCurrency(period.TopUps)} />
              <Stat
                icon={Truck}
                label="Biaya Kurir (periode)"
                value={formatCurrency(period.CourierCharges)}
                hint={period.EstimatedCharges > 0 ? `${formatCurrency(period.EstimatedCharges)} di antaranya perkiraan (data lama)` : undefined}
              />
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="size-6" />
            </div>
          ) : entries.length === 0 ? (
            <EmptyState icon={Truck} title="Belum ada catatan" description="Tidak ada transaksi ongkir pada periode ini." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                    <th className="whitespace-nowrap px-4 py-3">Tanggal</th>
                    <th className="whitespace-nowrap px-4 py-3">Jenis</th>
                    <th className="whitespace-nowrap px-4 py-3">Pesanan / Ref.</th>
                    <th className="px-4 py-3">Keterangan</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right">Masuk</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right">Keluar</th>
                    <th className="w-10 px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.Id} className="border-b border-border last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">{formatDateTime(e.EntryDate)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge tone={TYPE_LABEL[e.EntryType].tone}>{TYPE_LABEL[e.EntryType].label}</Badge>
                        {e.EntryType === "ADJUSTMENT" && (
                          <p className="mt-1 text-[11px] text-ink-faint">Saldo {e.Account === "BITESHIP" ? "Biteship" : "Petope"}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {e.Order ? (
                          <Link href={`/dashboard/orders/${e.Order.Id}`} className="font-semibold text-brand-purple">
                            {e.Order.OrderNumber}
                          </Link>
                        ) : null}
                        {e.Reference && <p className="text-ink-soft">{e.Reference}</p>}
                      </td>
                      <td className="max-w-72 px-4 py-3 text-xs text-ink-soft">
                        {e.Note}
                        {e.IsEstimate && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-brand-orange-deep">
                            <Info className="size-3" /> perkiraan
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-success">
                        {e.Direction === "IN" ? formatCurrency(e.Amount) : ""}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-error">
                        {e.Direction === "OUT" ? formatCurrency(e.Amount) : ""}
                      </td>
                      <td className="px-2 py-3">
                        {(e.EntryType === "TOPUP" || e.EntryType === "ADJUSTMENT") && (
                          <Button type="button" size="icon" variant="ghost" aria-label="Hapus catatan" onClick={() => remove(e)}>
                            <Trash2 className="size-4 text-error" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-ink-faint">
            Ongkir dari customer tercatat otomatis saat pesanan dibayar; biaya kurir tercatat otomatis saat pengiriman dipesan
            ke Biteship (sesuai tagihan Biteship). Top-up Biteship dicatat manual oleh admin.
          </p>
        </CardBody>
      </Card>

      {modal && <EntryModal kind={modal} onClose={() => setModal(null)} onDone={() => mutate()} />}
    </div>
  );
}

function EntryModal({ kind, onClose, onDone }: { kind: "topup" | "adjust"; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState(kind === "adjust" ? "Saldo awal Biteship" : "");
  const [account, setAccount] = useState<"BITESHIP" | "PETOPE">("BITESHIP");
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      if (kind === "topup") {
        await apiFetch("shipping-ledger/topups", {
          method: "POST",
          json: { Amount: Number(amount), EntryDate: date, Reference: reference || undefined, Note: note || undefined },
        });
      } else {
        await apiFetch("shipping-ledger/adjustments", {
          method: "POST",
          json: { Amount: Number(amount), EntryDate: date, Reference: reference || undefined, Note: note, Account: account, Direction: direction },
        });
      }
      toast.success("Tersimpan");
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
      title={kind === "topup" ? "Catat Top-up Biteship" : "Penyesuaian Saldo"}
      description={
        kind === "topup"
          ? "Uang yang ditransfer admin ke saldo Biteship."
          : "Untuk saldo awal, refund pengiriman batal dari Biteship, atau koreksi lain."
      }
      size="sm"
    >
      <div className="space-y-3">
        {kind === "adjust" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="adj-account">Saldo</FieldLabel>
              <Select id="adj-account" value={account} onChange={(e) => setAccount(e.target.value as "BITESHIP" | "PETOPE")}>
                <option value="BITESHIP">Biteship</option>
                <option value="PETOPE">Kas ongkir Petope</option>
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="adj-dir">Arah</FieldLabel>
              <Select id="adj-dir" value={direction} onChange={(e) => setDirection(e.target.value as "IN" | "OUT")}>
                <option value="IN">Bertambah</option>
                <option value="OUT">Berkurang</option>
              </Select>
            </div>
          </div>
        )}
        <div>
          <FieldLabel htmlFor="le-amount" required>Nominal (Rp)</FieldLabel>
          <Input id="le-amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="le-date">Tanggal</FieldLabel>
          <Input id="le-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="le-ref">Referensi (opsional)</FieldLabel>
          <Input id="le-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="No. transaksi top-up / referensi" />
        </div>
        <div>
          <FieldLabel htmlFor="le-note" required={kind === "adjust"}>Keterangan</FieldLabel>
          <Input id="le-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="button" onClick={submit} loading={saving} disabled={!(Number(amount) > 0) || (kind === "adjust" && !note.trim())}>
            Simpan
          </Button>
        </div>
      </div>
    </Modal>
  );
}

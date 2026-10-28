"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Truck, Wallet, Upload, Trash2, Scale, Info, History, FileSpreadsheet } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { ExportButton } from "@/components/ui/ExportButton";
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
  const [modal, setModal] = useState<"import" | "adjust" | null>(null);

  const { data, isLoading, mutate } = useSWR(isAdmin ? ["shipping-ledger", from, to, type] : null, () =>
    apiFetch<LedgerEntry[]>("shipping-ledger", { query: { from, to, type: type || undefined } }),
  );
  // Every top-up ever recorded, independent of the period filter below.
  const topUps = useSWR(isAdmin ? "shipping-ledger-topups" : null, () =>
    apiFetch<LedgerEntry[]>("shipping-ledger", { query: { type: "TOPUP" } }),
  );
  const refresh = () => {
    mutate();
    topUps.mutate();
  };

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
      refresh();
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
            <Button type="button" size="sm" onClick={() => setModal("import")}>
              <Upload className="size-4" /> Import Top-up Biteship
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setModal("adjust")}>
              <Scale className="size-4" /> Penyesuaian
            </Button>
          </div>
        </div>
      </Card>

      {allTime && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat icon={ArrowDownLeft} label="Kas Ongkir Petope" value={formatCurrency(allTime.PetopeShippingCash)} hint="Ongkir diterima − top-up ke Biteship (sepanjang waktu)" />
          <Stat
            icon={ArrowUpRight}
            label="Total Top-up Biteship"
            value={formatCurrency(allTime.TopUps)}
            hint={`${topUps.data?.data.length ?? 0} kali top-up (sepanjang waktu)`}
          />
        </div>
      )}

      <TopUpHistory entries={topUps.data?.data ?? []} loading={topUps.isLoading} onRemove={remove} />

      <Card>
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
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
            <div className="flex items-end">
              <ExportButton path="shipping-ledger/export" query={{ from, to, type: type || undefined }} />
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
            ke Biteship (sesuai tagihan Biteship). Top-up Biteship diimpor dari file export transaksi di dashboard Biteship.
          </p>
        </CardBody>
      </Card>

      {modal === "import" && <ImportTopUpModal onClose={() => setModal(null)} onDone={refresh} />}
      {modal === "adjust" && <AdjustmentModal onClose={() => setModal(null)} onDone={refresh} />}
    </div>
  );
}

/** All recorded Biteship top-ups, newest first (Biteship has no API for its top-up history — they're imported from its export). */
function TopUpHistory({
  entries,
  loading,
  onRemove,
}: {
  entries: LedgerEntry[];
  loading: boolean;
  onRemove: (e: LedgerEntry) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" /> Riwayat Top-up Biteship
        </CardTitle>
      </CardHeader>
      {loading ? (
        <CardBody className="flex justify-center py-8">
          <Spinner className="size-5" />
        </CardBody>
      ) : entries.length === 0 ? (
        <CardBody>
          <EmptyState
            icon={History}
            title="Belum ada top-up"
            description="Export riwayat transaksi dari dashboard Biteship, lalu unggah lewat tombol Import Top-up Biteship di atas."
          />
        </CardBody>
      ) : (
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0">
              <tr className="border-b border-border bg-surface-muted text-xs font-bold uppercase tracking-wide text-ink-soft">
                <th className="whitespace-nowrap px-4 py-3">Tanggal</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Nominal</th>
                <th className="whitespace-nowrap px-4 py-3">No. Transaksi / Ref.</th>
                <th className="px-4 py-3">Catatan</th>
                <th className="w-10 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.Id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">{formatDateTime(e.EntryDate)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-ink">{formatCurrency(e.Amount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">{e.Reference || "-"}</td>
                  <td className="max-w-72 px-4 py-3 text-xs text-ink-soft">{e.Note || "-"}</td>
                  <td className="px-2 py-3">
                    <Button type="button" size="icon" variant="ghost" aria-label="Hapus top-up" onClick={() => onRemove(e)}>
                      <Trash2 className="size-4 text-error" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

interface ImportResult {
  imported: number;
  importedAmount: number;
  duplicates: { line: number; reference: string }[];
  skipped: { line: number; reference: string; reason: string }[];
}

/** Import Top-up: the transaction export from the Biteship dashboard (.xlsx / .csv). */
function ImportTopUpModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const submit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch<ImportResult>("shipping-ledger/topups/import", { method: "POST", formData: fd });
      setResult(res.data);
      if (res.data.imported > 0) {
        toast.success(res.message || "Top-up diimpor");
        onDone();
      } else toast.info("Tidak ada top-up baru di file ini");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal mengimpor file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Import Top-up Biteship"
      description="Unggah file export transaksi dari dashboard Biteship. Hanya top-up berstatus succeeded yang dicatat."
      size="md"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-surface-muted/60 p-3 text-xs text-ink-soft">
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            <FileSpreadsheet className="size-4 text-brand-purple" /> Format kolom (.xlsx atau .csv)
          </p>
          <p className="mt-1 font-mono text-[11px] leading-relaxed">
            no, reference_id, amount, currency, description, payment_category, payment_method, type, status, created_at,
            created_date, created_time
          </p>
          <p className="mt-1.5">
            Baris yang statusnya bukan <b>succeeded</b> (mis. failed) dilewati. reference_id yang sudah pernah diimpor tidak
            dicatat dua kali, jadi file yang sama aman diunggah ulang.
          </p>
        </div>
        <div>
          <FieldLabel htmlFor="topup-file" required>File export Biteship</FieldLabel>
          <Input
            id="topup-file"
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
          />
        </div>

        {result && (
          <div className="space-y-2 rounded-xl border border-border p-3 text-sm">
            <p className="font-semibold text-ink">
              {result.imported} top-up baru dicatat{result.imported > 0 ? ` (${formatCurrency(result.importedAmount)})` : ""}
            </p>
            {result.duplicates.length > 0 && (
              <p className="text-xs text-ink-soft">{result.duplicates.length} sudah pernah diimpor — dilewati.</p>
            )}
            {result.skipped.length > 0 && (
              <div className="text-xs text-ink-soft">
                <p>{result.skipped.length} baris dilewati:</p>
                <ul className="mt-1 max-h-32 list-disc space-y-0.5 overflow-auto pl-5">
                  {result.skipped.map((row) => (
                    <li key={`${row.line}-${row.reference}`}>
                      Baris {row.line}
                      {row.reference ? ` (${row.reference})` : ""}: {row.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {result ? "Tutup" : "Batal"}
          </Button>
          <Button type="button" onClick={submit} loading={uploading} disabled={!file}>
            <Upload className="size-4" /> Import
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AdjustmentModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("Saldo awal Biteship");
  const [account, setAccount] = useState<"BITESHIP" | "PETOPE">("BITESHIP");
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await apiFetch("shipping-ledger/adjustments", {
        method: "POST",
        json: { Amount: Number(amount), EntryDate: date, Reference: reference || undefined, Note: note, Account: account, Direction: direction },
      });
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
      title="Penyesuaian Saldo"
      description="Untuk saldo awal, refund pengiriman batal dari Biteship, atau koreksi lain."
      size="sm"
    >
      <div className="space-y-3">
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
          <Input id="le-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="No. transaksi / referensi" />
        </div>
        <div>
          <FieldLabel htmlFor="le-note" required>Keterangan</FieldLabel>
          <Input id="le-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="button" onClick={submit} loading={saving} disabled={!(Number(amount) > 0) || !note.trim()}>
            Simpan
          </Button>
        </div>
      </div>
    </Modal>
  );
}

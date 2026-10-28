"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Banknote, Wallet, Clock, CheckCircle2, XCircle, FileText, Send, Store } from "lucide-react";
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
import { BankAccountCard, type BankAccount } from "@/components/merchants/BankAccountCard";
import { ALL_TIME, PeriodFilter, periodQuery, type Period } from "@/components/ui/PeriodFilter";
import { ExportButton } from "@/components/ui/ExportButton";

interface Balance {
  CompletedOrders: number;
  BaseSales: number;
  Tax: number;
  SellerFee: number;
  ServiceFee?: number;
  MerchantTax?: number;
  Earned: number;
  InProgressOrders: number;
  InProgress: number;
  PaidOut: number;
  Pending: number;
  Available: number;
  MinPayout?: number;
  SellerFeeAmount?: number;
  ServiceFeePercent?: number;
  TaxPercent?: number;
}


interface Payout {
  Id: string;
  PayoutNumber: string;
  MerchantId: string;
  StoreName?: string;
  Amount: number;
  Status: "REQUESTED" | "PAID" | "REJECTED" | "CANCELLED";
  BankName: string;
  AccountNumber: string;
  AccountName: string;
  MerchantNote: string | null;
  AdminNote: string | null;
  TransferReference: string | null;
  HasProof: boolean;
  RequestedAt: string;
  ProcessedAt: string | null;
}

interface SellerBalanceRow extends Balance {
  MerchantId: string;
  StoreName: string;
  Email: string | null;
  Bank: BankAccount | null;
}

const STATUS: Record<Payout["Status"], { label: string; tone: "warning" | "success" | "error" | "neutral" }> = {
  REQUESTED: { label: "Menunggu Transfer", tone: "warning" },
  PAID: { label: "Sudah Ditransfer", tone: "success" },
  REJECTED: { label: "Ditolak", tone: "error" },
  CANCELLED: { label: "Dibatalkan", tone: "neutral" },
};

const proofUrl = (id: string) => `/api/backend/payouts/${id}/proof`;

function Stat({ icon: Icon, label, value, hint, emphasis }: { icon: typeof Wallet; label: string; value: string; hint?: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasis ? "border-brand-purple/30 bg-brand-purple/5" : "border-border bg-surface"}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <Icon className="size-4 text-brand-purple" /> {label}
      </div>
      <p className="mt-1.5 text-lg font-extrabold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">{hint}</p>}
    </div>
  );
}

function PayoutTable({ rows, admin, onPay, onReject, onCancel }: {
  rows: Payout[];
  admin: boolean;
  onPay?: (p: Payout) => void;
  onReject?: (p: Payout) => void;
  onCancel?: (p: Payout) => void;
}) {
  if (rows.length === 0) return <EmptyState icon={Banknote} title="Belum ada pencairan" description="Riwayat pencairan dana akan muncul di sini." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
            <th className="whitespace-nowrap px-4 py-3">No. Pencairan</th>
            {admin && <th className="whitespace-nowrap px-4 py-3">Seller</th>}
            <th className="whitespace-nowrap px-4 py-3 text-right">Nominal</th>
            <th className="whitespace-nowrap px-4 py-3">Rekening Tujuan</th>
            <th className="whitespace-nowrap px-4 py-3">Status</th>
            <th className="whitespace-nowrap px-4 py-3">Diajukan</th>
            <th className="px-4 py-3">Keterangan</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.Id} className="border-b border-border align-top last:border-0">
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">{p.PayoutNumber}</td>
              {admin && <td className="whitespace-nowrap px-4 py-3 text-ink">{p.StoreName ?? "-"}</td>}
              <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-ink">{formatCurrency(p.Amount)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <p className="text-ink">
                  {p.BankName} · {p.AccountNumber}
                </p>
                <p className="text-xs text-ink-soft">a.n. {p.AccountName}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge tone={STATUS[p.Status].tone}>{STATUS[p.Status].label}</Badge>
                {p.ProcessedAt && <p className="mt-1 text-[11px] text-ink-faint">{formatDateTime(p.ProcessedAt)}</p>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">{formatDateTime(p.RequestedAt)}</td>
              <td className="max-w-64 px-4 py-3 text-xs text-ink-soft">
                {p.MerchantNote && <p>Catatan seller: {p.MerchantNote}</p>}
                {p.TransferReference && <p>Ref. transfer: {p.TransferReference}</p>}
                {p.AdminNote && <p>Admin: {p.AdminNote}</p>}
                {p.HasProof && (
                  <a href={proofUrl(p.Id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-purple">
                    <FileText className="size-3.5" /> Bukti transfer
                  </a>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                {p.Status === "REQUESTED" && admin && (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" type="button" onClick={() => onPay?.(p)}>
                      <CheckCircle2 className="size-4" /> Sudah Ditransfer
                    </Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => onReject?.(p)}>
                      <XCircle className="size-4" /> Tolak
                    </Button>
                  </div>
                )}
                {p.Status === "REQUESTED" && !admin && (
                  <Button size="sm" type="button" variant="outline" onClick={() => onCancel?.(p)}>
                    Batalkan
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PayoutsPage() {
  const { isAdmin, isMerchant } = useAuth();
  if (isAdmin) return <AdminPayouts />;
  if (isMerchant) return <MerchantPayouts />;
  return null;
}

// ---------------- Merchant ----------------

function MerchantPayouts() {
  const balance = useSWR("payout-balance", () => apiFetch<Balance>("payouts/balance"));
  const bank = useSWR("payout-bank", () => apiFetch<BankAccount>("payouts/bank-account"));
  const [period, setPeriod] = useState<Period>(ALL_TIME);
  const history = useSWR(["payout-history", period.from, period.to], () => apiFetch<Payout[]>("payouts", { query: periodQuery(period) }));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const b = balance.data?.data;
  const refresh = () => Promise.all([balance.mutate(), history.mutate()]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await apiFetch("payouts", { method: "POST", json: { Amount: Number(amount), Note: note || undefined } });
      toast.success("Permintaan pencairan dikirim ke admin");
      setAmount("");
      setNote("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal mengajukan pencairan");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (p: Payout) => {
    try {
      await apiFetch(`payouts/${p.Id}/cancel`, { method: "POST" });
      toast.success("Permintaan dibatalkan");
      await refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal membatalkan");
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="p-4">
          <h1 className="text-base font-extrabold text-ink">Saldo & Pencairan Dana</h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            Saldo dari pesanan yang sudah selesai (diterima customer) bisa kamu tarik ke rekeningmu. Admin Petope akan
            mentransfer dan mengunggah bukti transfernya.
          </p>
        </div>
      </Card>

      {!b ? (
        <div className="flex justify-center py-10">
          <Spinner className="size-6" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={Wallet} label="Saldo Bisa Dicairkan" value={formatCurrency(b.Available)} emphasis hint={`Minimal pencairan ${formatCurrency(b.MinPayout ?? 0)}`} />
          <Stat icon={Clock} label="Masih Diproses" value={formatCurrency(b.InProgress)} hint={`${b.InProgressOrders} pesanan dibayar, belum diterima customer`} />
          <Stat icon={Send} label="Menunggu Transfer" value={formatCurrency(b.Pending)} hint="Pencairan yang sedang diproses admin" />
          <Stat icon={CheckCircle2} label="Sudah Dicairkan" value={formatCurrency(b.PaidOut)} />
        </div>
      )}

      {b && (
        <Card>
          <CardBody className="text-sm">
            <p className="mb-2 font-bold text-ink">Rincian Hasil Jualan ({b.CompletedOrders} pesanan selesai)</p>
            <dl className="grid gap-1.5 sm:max-w-md">
              <div className="flex justify-between"><dt className="text-ink-soft">Penjualan (setelah diskon)</dt><dd className="text-ink">{formatCurrency(b.BaseSales)}</dd></div>
              {b.Tax > 0 && (
                <div className="flex justify-between"><dt className="text-ink-soft">PPN dibayar customer (pesanan lama)</dt><dd className="text-ink">{formatCurrency(b.Tax)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-ink-soft">Fee transaksi Petope{b.SellerFeeAmount ? ` (saat ini ${formatCurrency(b.SellerFeeAmount)}/pesanan)` : ""}</dt><dd className="text-error">− {formatCurrency(b.SellerFee)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Biaya layanan{b.ServiceFeePercent ? ` (saat ini ${b.ServiceFeePercent}%)` : ""}</dt><dd className="text-error">− {formatCurrency(b.ServiceFee ?? 0)}</dd></div>
              {((b.MerchantTax ?? 0) > 0 || (b.TaxPercent ?? 0) > 0) && (
                <div className="flex justify-between"><dt className="text-ink-soft">PPN (seller PKP{b.TaxPercent ? `, saat ini ${b.TaxPercent}%` : ""})</dt><dd className="text-error">− {formatCurrency(b.MerchantTax ?? 0)}</dd></div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 font-bold"><dt className="text-ink">Total hasil jualan</dt><dd className="text-ink">{formatCurrency(b.Earned)}</dd></div>
            </dl>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <BankAccountCard />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="size-4" /> Tarik Dana
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {!bank.data?.data.Complete && <p className="text-xs font-semibold text-brand-orange-deep">Isi rekening pencairan terlebih dahulu.</p>}
            <div>
              <FieldLabel htmlFor="wd-amount">Nominal (Rp)</FieldLabel>
              <div className="flex gap-2">
                <Input id="wd-amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100000" />
                <Button type="button" variant="outline" onClick={() => setAmount(String(b?.Available ?? 0))}>
                  Semua
                </Button>
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="wd-note">Catatan (opsional)</FieldLabel>
              <Textarea id="wd-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>
            <Button
              type="button"
              onClick={submit}
              loading={submitting}
              disabled={!bank.data?.data.Complete || !(Number(amount) > 0) || Number(amount) > (b?.Available ?? 0)}
            >
              Ajukan Pencairan
            </Button>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Riwayat Pencairan</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter label="Tanggal pengajuan" value={period} onChange={setPeriod} />
            <ExportButton path="payouts/export" query={periodQuery(period)} />
          </div>
        </CardHeader>
        <CardBody>
          {history.isLoading ? <Spinner className="size-5" /> : <PayoutTable rows={history.data?.data ?? []} admin={false} onCancel={cancel} />}
        </CardBody>
      </Card>
    </div>
  );
}

// ---------------- Admin ----------------

function AdminPayouts() {
  const [tab, setTab] = useState<"REQUESTED" | "ALL">("REQUESTED");
  const [period, setPeriod] = useState<Period>(ALL_TIME);
  const payouts = useSWR(["payouts", tab, period.from, period.to], () =>
    apiFetch<Payout[]>("payouts", { query: { status: tab === "ALL" ? undefined : tab, ...periodQuery(period) } }),
  );
  const balances = useSWR("payout-balances", () => apiFetch<SellerBalanceRow[]>("payouts/balances"));
  const [paying, setPaying] = useState<Payout | null>(null);
  const [rejecting, setRejecting] = useState<Payout | null>(null);

  const refresh = () => Promise.all([payouts.mutate(), balances.mutate()]);
  const rows = balances.data?.data ?? [];
  const totals = rows.reduce((t, r) => ({ available: t.available + r.Available, pending: t.pending + r.Pending, paid: t.paid + r.PaidOut }), { available: 0, pending: 0, paid: 0 });

  return (
    <div className="space-y-5">
      <Card>
        <div className="p-4">
          <h1 className="text-base font-extrabold text-ink">Pencairan Dana Seller</h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            Transfer permintaan pencairan ke rekening seller, lalu tandai sudah ditransfer beserta nomor referensi dan bukti
            transfernya.
          </p>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Send} label="Menunggu Ditransfer" value={formatCurrency(totals.pending)} emphasis />
        <Stat icon={Wallet} label="Saldo Seller (belum diajukan)" value={formatCurrency(totals.available)} />
        <Stat icon={CheckCircle2} label="Sudah Dicairkan" value={formatCurrency(totals.paid)} />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Permintaan Pencairan</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter label="Tanggal pengajuan" value={period} onChange={setPeriod} />
            <ExportButton path="payouts/export" query={{ status: tab === "ALL" ? undefined : tab, ...periodQuery(period) }} />
            <Button size="sm" type="button" variant={tab === "REQUESTED" ? "primary" : "outline"} onClick={() => setTab("REQUESTED")}>
              Menunggu Transfer
            </Button>
            <Button size="sm" type="button" variant={tab === "ALL" ? "primary" : "outline"} onClick={() => setTab("ALL")}>
              Semua
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {payouts.isLoading ? (
            <Spinner className="size-5" />
          ) : (
            <PayoutTable rows={payouts.data?.data ?? []} admin onPay={setPaying} onReject={setRejecting} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="size-4" /> Saldo Semua Seller
          </CardTitle>
        </CardHeader>
        <CardBody>
          {rows.length === 0 ? (
            <EmptyState icon={Store} title="Belum ada saldo" description="Saldo muncul setelah ada pesanan seller yang selesai." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3 text-right">Hasil Jualan</th>
                    <th className="px-4 py-3 text-right">Fee Petope</th>
                    <th className="px-4 py-3 text-right">Dicairkan</th>
                    <th className="px-4 py-3 text-right">Menunggu</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                    <th className="px-4 py-3 text-right">Masih Diproses</th>
                    <th className="px-4 py-3">Rekening</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.MerchantId} className="border-b border-border last:border-0">
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-semibold text-ink">{r.StoreName}</p>
                        {r.Email && <p className="text-xs text-ink-soft">{r.Email}</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-ink">{formatCurrency(r.Earned)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-ink-soft">{formatCurrency(r.SellerFee)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-ink-soft">{formatCurrency(r.PaidOut)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-brand-orange-deep">{formatCurrency(r.Pending)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-ink">{formatCurrency(r.Available)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-ink-soft">{formatCurrency(r.InProgress)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">
                        {r.Bank?.Complete ? `${r.Bank.BankName} · ${r.Bank.AccountNumber} (${r.Bank.AccountName})` : <span className="text-brand-orange-deep">Belum diisi</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {paying && <PayModal payout={paying} onClose={() => setPaying(null)} onDone={refresh} />}
      {rejecting && <RejectModal payout={rejecting} onClose={() => setRejecting(null)} onDone={refresh} />}
    </div>
  );
}

function PayModal({ payout, onClose, onDone }: { payout: Payout; onClose: () => void; onDone: () => void }) {
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("TransferReference", reference);
      if (note) fd.append("AdminNote", note);
      if (file) fd.append("proof", file);
      await apiFetch(`payouts/${payout.Id}/pay`, { method: "POST", formData: fd });
      toast.success("Pencairan ditandai sudah ditransfer");
      onDone();
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Tandai Sudah Ditransfer" description={`${payout.PayoutNumber} · ${formatCurrency(payout.Amount)}`}>
      <div className="space-y-3">
        <div className="rounded-xl bg-surface-muted/60 p-3 text-sm">
          <p className="font-semibold text-ink">Transfer ke: {payout.BankName} {payout.AccountNumber}</p>
          <p className="text-ink-soft">a.n. {payout.AccountName}{payout.StoreName ? ` · ${payout.StoreName}` : ""}</p>
        </div>
        <div>
          <FieldLabel htmlFor="pay-ref" required>Nomor Referensi Transfer</FieldLabel>
          <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Contoh: nomor referensi dari m-banking" />
        </div>
        <div>
          <FieldLabel htmlFor="pay-proof">Bukti Transfer (PDF/JPG/PNG/WEBP, maks. 10 MB)</FieldLabel>
          <Input id="pay-proof" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <FieldLabel htmlFor="pay-note">Catatan (opsional)</FieldLabel>
          <Textarea id="pay-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="button" onClick={submit} loading={saving} disabled={!reference.trim()}>Simpan</Button>
        </div>
      </div>
    </Modal>
  );
}

function RejectModal({ payout, onClose, onDone }: { payout: Payout; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await apiFetch(`payouts/${payout.Id}/reject`, { method: "POST", json: { AdminNote: note } });
      toast.success("Pencairan ditolak — saldo kembali ke seller");
      onDone();
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menolak");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Tolak Pencairan" description={`${payout.PayoutNumber} · ${formatCurrency(payout.Amount)}`} size="sm">
      <div className="space-y-3">
        <div>
          <FieldLabel htmlFor="reject-note" required>Alasan</FieldLabel>
          <Textarea id="reject-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: nama rekening tidak sesuai dengan nama toko" />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="button" variant="danger" onClick={submit} loading={saving} disabled={!note.trim()}>Tolak</Button>
        </div>
      </div>
    </Modal>
  );
}

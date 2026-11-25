"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { ShieldAlert, Undo2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner, Spinner } from "@/components/ui/Spinner";
import { formatCurrency } from "@/lib/resources/format";

/** Backend utils/returnSettings.js (SystemSettings RETURN_SETTINGS). */
interface ReturnSettings {
  WindowDays: number;
  ShipBackDays: number;
  DeductAppFee: boolean;
  DeductTax: boolean;
  DeductionPercent: number;
  DeductionFixed: number;
}

type Form = { WindowDays: string; ShipBackDays: string; DeductionPercent: string; DeductionFixed: string; DeductAppFee: boolean; DeductTax: boolean };

const ENDPOINT = "order-returns/settings";

const toForm = (s: ReturnSettings): Form => ({
  WindowDays: String(s.WindowDays),
  ShipBackDays: String(s.ShipBackDays),
  DeductionPercent: String(s.DeductionPercent).replace(".", ","),
  DeductionFixed: String(s.DeductionFixed),
  DeductAppFee: s.DeductAppFee,
  DeductTax: s.DeductTax,
});
const parse = (v: string) => Number(String(v).replace(/\./g, "").replace(",", "."));
const parsePercent = (v: string) => Number(String(v).replace(",", "."));

/** Admin › Pengaturan Retur: what is cut from a return's refund, and the time limits. */
export default function ReturnSettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { data, isLoading, mutate } = useSWR(isAdmin ? ENDPOINT : null, () => apiFetch<ReturnSettings>(ENDPOINT));
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const settings = data?.data;
  const [synced, setSynced] = useState<ReturnSettings | undefined>(undefined);
  if (settings && settings !== synced) {
    setSynced(settings);
    setForm(toForm(settings));
  }

  if (authLoading) return <FullPageSpinner />;
  if (!isAdmin) {
    return <EmptyState icon={ShieldAlert} title="Akses terbatas" description="Halaman ini hanya bisa diakses oleh Super Admin." />;
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  // Worked example: goods Rp 100.000, pajak 11%, biaya layanan Rp 2.000, ongkir Rp 15.000.
  const example = (() => {
    if (!form) return null;
    const goods = 100000;
    const tax = 11000;
    const appFee = 2000;
    const paid = goods + tax + appFee;
    const cuts: [string, number][] = [];
    if (form.DeductAppFee) cuts.push(["Biaya layanan aplikasi", appFee]);
    if (form.DeductTax) cuts.push(["Pajak", tax]);
    const pct = parsePercent(form.DeductionPercent) || 0;
    if (pct > 0) cuts.push([`Biaya penanganan retur (${form.DeductionPercent}%)`, Math.round((goods * pct) / 100)]);
    const fixed = parse(form.DeductionFixed) || 0;
    if (fixed > 0) cuts.push(["Biaya administrasi retur", fixed]);
    const refund = Math.max(0, paid - cuts.reduce((s, [, v]) => s + v, 0));
    return { goods, tax, appFee, paid, cuts, refund };
  })();

  const save = async () => {
    if (!form) return;
    const windowDays = Number(form.WindowDays);
    const shipBackDays = Number(form.ShipBackDays);
    const percent = parsePercent(form.DeductionPercent);
    const fixed = parse(form.DeductionFixed);
    if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 60) return toast.error("Batas pengajuan harus 1–60 hari.");
    if (!Number.isInteger(shipBackDays) || shipBackDays < 1 || shipBackDays > 30) return toast.error("Batas kirim balik harus 1–30 hari.");
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return toast.error("Potongan persen harus 0–100.");
    if (!Number.isFinite(fixed) || fixed < 0) return toast.error("Potongan tetap tidak valid.");
    setSaving(true);
    try {
      const res = await apiFetch<ReturnSettings>(ENDPOINT, {
        method: "PUT",
        json: { WindowDays: windowDays, ShipBackDays: shipBackDays, DeductionPercent: percent, DeductionFixed: Math.round(fixed), DeductAppFee: form.DeductAppFee, DeductTax: form.DeductTax },
      });
      toast.success(res.message || "Pengaturan retur disimpan.");
      mutate(res, { revalidate: false });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan pengaturan retur.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Pengaturan Retur</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Dana yang kembali ke customer = yang dibayar customer <b>tanpa ongkir</b>, dikurangi potongan di bawah. Ongkir pesanan tidak dikembalikan, dan
          ongkir kirim balik barang ditanggung customer. Lihat pengajuan di menu{" "}
          <Link href="/dashboard/returns" className="font-semibold text-brand-purple hover:underline">
            Pengembalian
          </Link>
          .
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Undo2 className="size-4" /> Potongan & Batas Waktu
          </CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          {(isLoading && !data) || !form ? (
            <div className="flex justify-center py-6">
              <Spinner className="size-6" />
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <FieldLabel>Biaya yang tidak dikembalikan</FieldLabel>
                  <label className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5">
                    <Checkbox checked={form.DeductAppFee} onChange={(e) => set("DeductAppFee", e.target.checked)} />
                    <span className="text-sm font-medium text-ink">Biaya layanan aplikasi</span>
                  </label>
                  <label className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5">
                    <Checkbox checked={form.DeductTax} onChange={(e) => set("DeductTax", e.target.checked)} />
                    <span className="text-sm font-medium text-ink">Pajak</span>
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>Potongan tambahan</FieldLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-ink-soft">Persen dari harga barang (%)</span>
                      <Input inputMode="decimal" value={form.DeductionPercent} onChange={(e) => set("DeductionPercent", e.target.value)} placeholder="0" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-ink-soft">Potongan tetap (Rp)</span>
                      <Input inputMode="numeric" value={form.DeductionFixed} onChange={(e) => set("DeductionFixed", e.target.value)} placeholder="0" />
                    </div>
                  </div>
                  <p className="text-xs text-ink-soft">Misalnya biaya penanganan retur 10% dan/atau biaya administrasi Rp 5.000. Isi 0 bila tidak dipakai.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel required>Batas pengajuan retur (hari)</FieldLabel>
                  <Input type="number" min={1} max={60} value={form.WindowDays} onChange={(e) => set("WindowDays", e.target.value)} />
                  <p className="text-xs text-ink-soft">Sejak pesanan selesai. 1–60 hari.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel required>Batas kirim balik barang (hari)</FieldLabel>
                  <Input type="number" min={1} max={30} value={form.ShipBackDays} onChange={(e) => set("ShipBackDays", e.target.value)} />
                  <p className="text-xs text-ink-soft">Sejak toko menyetujui. Ditampilkan ke customer sebagai batas waktu. 1–30 hari.</p>
                </div>
              </div>

              {example && (
                <div className="max-w-md rounded-xl border border-border bg-surface-muted/60 p-3 text-xs">
                  <p className="mb-1 font-semibold text-ink">Contoh perhitungan</p>
                  <div className="flex justify-between gap-3">
                    <span className="text-ink-soft">
                      Harga barang {formatCurrency(example.goods)} + pajak {formatCurrency(example.tax)} + biaya layanan {formatCurrency(example.appFee)}
                    </span>
                    <span className="font-semibold tabular-nums">{formatCurrency(example.paid)}</span>
                  </div>
                  {example.cuts.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <span className="text-ink-soft">{label}</span>
                      <span className="tabular-nums text-error">− {formatCurrency(value)}</span>
                    </div>
                  ))}
                  <div className="mt-0.5 flex justify-between gap-3 border-t border-border pt-0.5">
                    <span className="font-semibold">Dana kembali ke customer</span>
                    <span className="font-bold tabular-nums">{formatCurrency(example.refund)}</span>
                  </div>
                  <p className="mt-1 text-ink-faint">Ongkir pesanan (misalnya Rp 15.000) tidak dikembalikan.</p>
                </div>
              )}

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Perubahan berlaku untuk <b>pengajuan baru</b>. Pengajuan yang sudah masuk tetap memakai rincian saat diajukan.
              </div>

              <div>
                <Button loading={saving} onClick={save}>
                  Simpan Pengaturan Retur
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

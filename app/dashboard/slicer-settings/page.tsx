"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Lock, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner, Spinner } from "@/components/ui/Spinner";

/** Backend utils/slicerSettings.js (SystemSettings SLICER_SETTINGS). */
interface SlicerSettings {
  DefaultInfillPercent: number;
  SupportEnabled: boolean;
  SupportPercent: number;
  PrinterProfile: string;
  MaterialName: string;
  MaterialDensity: number;
  ProcessName: string;
  SupportType: string;
  Notes: string;
  // Fixed by the layer-slicing engine (shown, not editable).
  LayerHeightMm: number;
  Walls: number;
  TopShellLayers: number;
  BottomShellLayers: number;
  InfillPattern: string;
}

interface PrinterProfileOption {
  Key: string;
  Printer: string;
  Flush: string;
  PurgePerSwapGrams: number;
}

const ENDPOINT = "slicer-settings";

type Form = Record<"DefaultInfillPercent" | "SupportPercent" | "MaterialDensity" | "MaterialName" | "ProcessName" | "SupportType" | "Notes" | "PrinterProfile", string> & {
  SupportEnabled: boolean;
};

const toForm = (s: SlicerSettings): Form => ({
  DefaultInfillPercent: String(s.DefaultInfillPercent),
  SupportEnabled: s.SupportEnabled,
  SupportPercent: String(s.SupportPercent),
  PrinterProfile: s.PrinterProfile,
  MaterialName: s.MaterialName,
  MaterialDensity: String(s.MaterialDensity),
  ProcessName: s.ProcessName,
  SupportType: s.SupportType,
  Notes: s.Notes ?? "",
});

const decimal = (v: number) => String(v).replace(".", ",");
const parseDecimal = (v: string) => Number(String(v).replace(",", "."));

/** Admin › Setting Slicer: the slicer set-up the AI design weight estimate assumes. */
export default function SlicerSettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { data, isLoading, mutate } = useSWR(isAdmin ? ENDPOINT : null, () => apiFetch<SlicerSettings>(ENDPOINT));
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  // Load the saved values into the form whenever they come back from the API.
  const settings = data?.data;
  const [synced, setSynced] = useState<SlicerSettings | undefined>(undefined);
  if (settings && settings !== synced) {
    setSynced(settings);
    setForm(toForm(settings));
  }

  if (authLoading) return <FullPageSpinner />;
  if (!isAdmin) {
    return <EmptyState icon={ShieldAlert} title="Akses terbatas" description="Halaman ini hanya bisa diakses oleh Super Admin." />;
  }

  const profiles = ((data?.meta as { profiles?: PrinterProfileOption[] } | undefined)?.profiles ?? []) as PrinterProfileOption[];
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    if (!form) return;
    const infill = Number(form.DefaultInfillPercent);
    const support = parseDecimal(form.SupportPercent);
    const density = parseDecimal(form.MaterialDensity);
    if (!Number.isInteger(infill) || infill < 5 || infill > 100) return toast.error("Infill harus bilangan bulat 5–100%.");
    if (!Number.isFinite(support) || support < 0 || support > 100) return toast.error("Persentase support harus 0–100%.");
    if (!Number.isFinite(density) || density < 0.5 || density > 3) return toast.error("Densitas bahan harus 0,5–3 g/cm³.");
    setSaving(true);
    try {
      const res = await apiFetch<SlicerSettings>(ENDPOINT, {
        method: "PUT",
        json: {
          DefaultInfillPercent: infill,
          SupportEnabled: form.SupportEnabled,
          SupportPercent: support,
          PrinterProfile: form.PrinterProfile,
          MaterialName: form.MaterialName,
          MaterialDensity: density,
          ProcessName: form.ProcessName,
          SupportType: form.SupportType,
          Notes: form.Notes,
        },
      });
      toast.success(res.message || "Setting slicer disimpan.");
      mutate(res, { revalidate: false });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan setting slicer.");
    } finally {
      setSaving(false);
    }
  };

  const fixed: [string, string][] = settings
    ? [
        ["Tinggi layer", `${decimal(settings.LayerHeightMm)} mm`],
        ["Dinding (walls)", `${settings.Walls}`],
        ["Top / bottom shell", `${settings.TopShellLayers} / ${settings.BottomShellLayers} layer`],
        ["Pola infill", settings.InfillPattern],
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Setting Slicer</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Setelan slicer yang dipakai sistem untuk <b>menghitung estimasi berat desain AI</b> (produk via prompt / foto). Berat ini menentukan harga
          di keranjang dan ditampilkan ke seller di detail pesanan, supaya seller bisa memakai setelan yang sama di Anycubic Slicer Next.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" /> Pengaturan Perhitungan
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
                  <FieldLabel required>Infill default (%)</FieldLabel>
                  <Input type="number" min={5} max={100} step="1" value={form.DefaultInfillPercent} onChange={(e) => set("DefaultInfillPercent", e.target.value)} />
                  <p className="text-xs text-ink-soft">
                    Dipakai untuk desain AI <b>baru</b>. Desain yang sudah dibuat tetap memakai infill saat dibuat. 5–100%.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel required>Profil printer</FieldLabel>
                  <Select value={form.PrinterProfile} onChange={(e) => set("PrinterProfile", e.target.value)}>
                    {profiles.map((p) => (
                      <option key={p.Key} value={p.Key}>
                        {p.Printer} — {p.Flush}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-ink-soft">
                    Menentukan limbah bilas per ganti warna (multicolor):{" "}
                    {profiles.map((p) => `${p.Printer.replace(/ 0\.4 nozzle$/, "")} ${decimal(p.PurgePerSwapGrams)} g`).join(" · ")}.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>Support</FieldLabel>
                  <label className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5">
                    <Checkbox checked={form.SupportEnabled} onChange={(e) => set("SupportEnabled", e.target.checked)} />
                    <span className="text-sm font-medium text-ink">Hitung dengan support (default)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-ink-soft">Berat support (% dari model)</span>
                      <Input inputMode="decimal" value={form.SupportPercent} onChange={(e) => set("SupportPercent", e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-ink-soft">Jenis support</span>
                      <Input value={form.SupportType} onChange={(e) => set("SupportType", e.target.value)} placeholder="Tree(auto)" />
                    </div>
                  </div>
                  <p className="text-xs text-ink-soft">
                    Saat support aktif, beratnya diperkirakan sebagai persentase dari berat model. Seller tetap melihat angka &quot;jika pakai
                    support&quot; / &quot;tanpa support&quot; di detail pesanan.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel required>Bahan</FieldLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-ink-soft">Nama bahan</span>
                      <Input value={form.MaterialName} onChange={(e) => set("MaterialName", e.target.value)} placeholder="Anycubic PLA" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-ink-soft">Densitas (g/cm³)</span>
                      <Input inputMode="decimal" value={form.MaterialDensity} onChange={(e) => set("MaterialDensity", e.target.value)} placeholder="1.24" />
                    </div>
                  </div>
                  <p className="text-xs text-ink-soft">PLA ± 1,24 · PETG ± 1,27 · ABS ± 1,04 · TPU ± 1,21 g/cm³. Dipakai untuk berat dan panjang filamen (1,75 mm).</p>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>Nama proses (ditampilkan ke seller)</FieldLabel>
                  <Input value={form.ProcessName} onChange={(e) => set("ProcessName", e.target.value)} placeholder="0.20mm Standard @AC KX" />
                  <p className="text-xs text-ink-soft">Nama preset proses di Anycubic Slicer Next yang sebaiknya dipilih seller.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>Catatan</FieldLabel>
                  <Textarea rows={3} value={form.Notes} onChange={(e) => set("Notes", e.target.value)} placeholder="Catatan internal (opsional)" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface-muted/60 p-3">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <Lock className="size-3.5 text-ink-soft" /> Setelan tetap (dikunci mesin hitung)
                </p>
                <div className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                  {fixed.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <span className="text-ink-soft">{k}</span>
                      <b className="text-ink">{v}</b>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-faint">
                  Mesin pengiris layer sudah dikalibrasi dengan setelan ini. Mengubahnya butuh kalibrasi ulang di backend, jadi belum bisa diatur dari sini.
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Perubahan berlaku untuk <b>desain AI baru</b> dan <b>rincian berat</b> yang dihitung ulang (detail pesanan seller). Berat yang sudah
                tersimpan untuk desain lama — dan harga pesanan yang sudah dibuat — tidak ikut berubah.
              </div>

              <div>
                <Button loading={saving} onClick={save}>
                  Simpan Setting Slicer
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

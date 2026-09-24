"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Percent } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner } from "@/components/ui/Spinner";

interface TaxAndFees {
  taxPercent: number;
  serviceFeePercent: number;
}

export default function TaxFeeSettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [taxPercentDraft, setTaxPercentDraft] = useState("");
  const [serviceFeePercentDraft, setServiceFeePercentDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<TaxAndFees>("system-settings/tax-and-fees");
      setTaxPercentDraft(String(res.data.taxPercent));
      setServiceFeePercentDraft(String(res.data.serviceFeePercent));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal memuat pengaturan pajak & biaya layanan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleSave = async () => {
    const taxPercent = Number(taxPercentDraft);
    const serviceFeePercent = Number(serviceFeePercentDraft);

    if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
      toast.error("Persentase pajak harus antara 0 - 100.");
      return;
    }
    if (!Number.isFinite(serviceFeePercent) || serviceFeePercent < 0 || serviceFeePercent > 100) {
      toast.error("Persentase biaya layanan harus antara 0 - 100.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("system-settings/tax-and-fees", { method: "PUT", json: { taxPercent, serviceFeePercent } });
      toast.success("Pengaturan pajak & biaya layanan berhasil disimpan.");
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal menyimpan pengaturan pajak & biaya layanan.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <FullPageSpinner />;

  if (!isAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Akses terbatas"
        description="Halaman ini hanya bisa diakses oleh Super Admin."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Pajak & Biaya Layanan</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Nilai ini dipakai untuk menghitung harga setiap pesanan di seluruh aplikasi — perubahan berlaku langsung
          tanpa deploy ulang backend.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="size-4" /> Pajak PPN & Biaya Layanan Aplikasi
          </CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          {loading ? (
            <FullPageSpinner />
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <FieldLabel>Persentase Biaya Layanan (%)</FieldLabel>
                <p className="text-xs text-ink-soft">
                  Dihitung dari Harga Dasar, berlaku untuk semua merchant (PKP maupun Non-PKP). Contoh: harga dasar Rp
                  300.000 dan biaya layanan 1,5% = Rp 4.500.
                </p>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={serviceFeePercentDraft}
                  onChange={(e) => setServiceFeePercentDraft(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel>Persentase Pajak PPN (%)</FieldLabel>
                <p className="text-xs text-ink-soft">
                  Hanya diterapkan ke pesanan merchant PKP — merchant Non-PKP otomatis 0% tanpa mengubah angka ini.
                  Dihitung dari (Harga Dasar + Biaya Layanan), bukan Harga Dasar saja.
                </p>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={taxPercentDraft}
                  onChange={(e) => setTaxPercentDraft(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <div>
                <Button loading={saving} onClick={handleSave}>
                  Simpan Pengaturan
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

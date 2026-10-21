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
  sellerFeePercent: number;
  minPayoutAmount: number;
}

export default function TaxFeeSettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [taxPercentDraft, setTaxPercentDraft] = useState("");
  const [serviceFeePercentDraft, setServiceFeePercentDraft] = useState("");
  const [sellerFeePercentDraft, setSellerFeePercentDraft] = useState("");
  const [minPayoutDraft, setMinPayoutDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<TaxAndFees>("system-settings/tax-and-fees");
      setTaxPercentDraft(String(res.data.taxPercent));
      setServiceFeePercentDraft(String(res.data.serviceFeePercent));
      setSellerFeePercentDraft(String(res.data.sellerFeePercent ?? 0));
      setMinPayoutDraft(String(res.data.minPayoutAmount ?? 50000));
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
    const sellerFeePercent = Number(sellerFeePercentDraft);
    if (!Number.isFinite(sellerFeePercent) || sellerFeePercent < 0 || sellerFeePercent > 100) {
      toast.error("Fee transaksi seller harus antara 0 - 100.");
      return;
    }
    const minPayoutAmount = Number(minPayoutDraft);
    if (!Number.isFinite(minPayoutAmount) || minPayoutAmount < 0) {
      toast.error("Minimal pencairan tidak valid.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("system-settings/tax-and-fees", { method: "PUT", json: { taxPercent, serviceFeePercent, sellerFeePercent, minPayoutAmount } });
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
          Semua biaya di halaman ini <b>dibayar merchant kepada Petope</b> dan dipotong dari hasil jualan merchant.
          Customer hanya membayar harga dari Master Harga (dikurangi diskon tier) ditambah ongkir — tanpa PPN atau biaya
          layanan. Perubahan berlaku untuk pesanan baru; pesanan lama memakai tarif saat dibuat.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="size-4" /> Potongan Merchant
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
                  Dibayar merchant, dihitung dari Harga Dasar, berlaku untuk semua merchant (PKP maupun Non-PKP). Contoh:
                  harga dasar Rp 300.000 dan biaya layanan 1,5% = Rp 4.500 dipotong dari hasil jualan merchant.
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
                  Dibayar merchant PKP saja — merchant Non-PKP otomatis 0% tanpa mengubah angka ini. Dihitung dari Harga
                  Dasar dan dipotong dari hasil jualan merchant; tidak ditagihkan ke customer.
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
              <div className="flex flex-col gap-2 border-t border-border pt-5">
                <FieldLabel>Fee Transaksi Seller (%)</FieldLabel>
                <p className="text-xs text-ink-soft">
                  Dibayar <b>seller kepada Petope</b> dari setiap penjualan, di luar biaya layanan dan PPN. Dihitung dari Harga
                  Dasar dan dipotong dari saldo hasil jualan seller. Contoh: harga dasar Rp 300.000 dan fee 5% = Rp 15.000.
                </p>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={sellerFeePercentDraft}
                  onChange={(e) => setSellerFeePercentDraft(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel>Minimal Pencairan Dana Seller (Rp)</FieldLabel>
                <p className="text-xs text-ink-soft">Nominal terkecil yang bisa diajukan seller saat menarik saldo.</p>
                <Input
                  type="number"
                  min={0}
                  step="1000"
                  value={minPayoutDraft}
                  onChange={(e) => setMinPayoutDraft(e.target.value)}
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

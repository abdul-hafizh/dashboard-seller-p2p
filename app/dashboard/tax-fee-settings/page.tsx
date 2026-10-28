"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Percent, Smartphone } from "lucide-react";
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
  sellerFeeAmount: number;
  minPayoutAmount: number;
  customerAppFeeAmount: number;
}

export default function TaxFeeSettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [taxPercentDraft, setTaxPercentDraft] = useState("");
  const [serviceFeePercentDraft, setServiceFeePercentDraft] = useState("");
  const [sellerFeeAmountDraft, setSellerFeeAmountDraft] = useState("");
  const [minPayoutDraft, setMinPayoutDraft] = useState("");
  const [appFeeDraft, setAppFeeDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<TaxAndFees>("system-settings/tax-and-fees");
      setTaxPercentDraft(String(res.data.taxPercent));
      setServiceFeePercentDraft(String(res.data.serviceFeePercent));
      setSellerFeeAmountDraft(String(res.data.sellerFeeAmount ?? 0));
      setMinPayoutDraft(String(res.data.minPayoutAmount ?? 50000));
      setAppFeeDraft(String(res.data.customerAppFeeAmount ?? 0));
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
      toast.error("Admin fee harus antara 0 - 100%.");
      return;
    }
    const sellerFeeAmount = Math.round(Number(sellerFeeAmountDraft));
    if (!Number.isFinite(sellerFeeAmount) || sellerFeeAmount < 0) {
      toast.error("Fee transaksi seller harus berupa nominal Rupiah (0 atau lebih).");
      return;
    }
    const customerAppFeeAmount = Math.round(Number(appFeeDraft));
    if (!Number.isFinite(customerAppFeeAmount) || customerAppFeeAmount < 0) {
      toast.error("Biaya jasa aplikasi harus berupa nominal Rupiah (0 atau lebih).");
      return;
    }
    const minPayoutAmount = Number(minPayoutDraft);
    if (!Number.isFinite(minPayoutAmount) || minPayoutAmount < 0) {
      toast.error("Minimal pencairan tidak valid.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("system-settings/tax-and-fees", { method: "PUT", json: { taxPercent, serviceFeePercent, sellerFeeAmount, minPayoutAmount, customerAppFeeAmount } });
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
          <b>Admin fee</b> dan <b>fee transaksi</b> dibayar seller kepada Petope (dipotong dari hasil jualan seller).
          <b> PPN</b> dan <b>biaya jasa aplikasi</b> dibayar customer: PPN di atas harga dari Master Harga (semua pesanan kecuali
          pembelian token, disetor oleh Petope), biaya jasa aplikasi sekali per pembayaran. Perubahan berlaku untuk pesanan
          baru; pesanan lama memakai tarif saat dibuat.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="size-4" /> Potongan Seller
          </CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          {loading ? (
            <FullPageSpinner />
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <FieldLabel>Admin Fee (%)</FieldLabel>
                <p className="text-xs text-ink-soft">
                  Dibayar seller, dihitung dari Harga Dasar, berlaku untuk semua seller (PKP maupun Non-PKP). Contoh:
                  harga dasar Rp 300.000 dan admin fee 1,5% = Rp 4.500 dipotong dari hasil jualan seller.
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
                  Ditagihkan ke <b>customer</b> di setiap pesanan (produk, desain AI, pesanan custom) — kecuali pembelian
                  token AI. Dihitung dari Harga Dasar (setelah diskon membership, tanpa ongkir) dan disetor oleh Petope. Di aplikasi
                  dan invoice customer, harga sudah termasuk PPN (tanpa baris PPN terpisah). Contoh: harga Rp 100.000 dan PPN 11% →
                  customer melihat dan membayar Rp 111.000 + ongkir.
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
                <FieldLabel>Fee Transaksi Seller (Rp)</FieldLabel>
                <p className="text-xs text-ink-soft">
                  Nominal tetap yang dibayar <b>seller kepada Petope</b> untuk setiap pesanan (transaksi), di luar admin fee
                  — berapa pun harga pesanannya. Dipotong dari saldo hasil jualan seller. Contoh: fee Rp 2.000 → setiap
                  pesanan selesai memotong Rp 2.000 dari hasil jualan.
                </p>
                <Input
                  type="number"
                  min={0}
                  step="500"
                  value={sellerFeeAmountDraft}
                  onChange={(e) => setSellerFeeAmountDraft(e.target.value)}
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
              <div className="flex flex-col gap-2 border-t border-border pt-5">
                <FieldLabel className="flex items-center gap-1.5">
                  <Smartphone className="size-4" /> Biaya Jasa Aplikasi Customer (Rp)
                </FieldLabel>
                <p className="text-xs text-ink-soft">
                  Nominal tetap yang dibayar <b>customer kepada Petope</b> sekali per pembayaran — checkout keranjang dari beberapa
                  toko tetap dikenakan sekali. Tidak dikenakan PPN, tidak berlaku untuk pembelian token AI, dan bukan bagian hak
                  seller. Tampil di checkout aplikasi, halaman pembayaran, dan invoice. Isi 0 untuk menonaktifkan. Contoh: Rp 1.000 →
                  customer membayar harga barang + ongkir + Rp 1.000.
                </p>
                <Input
                  type="number"
                  min={0}
                  step="500"
                  value={appFeeDraft}
                  onChange={(e) => setAppFeeDraft(e.target.value)}
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

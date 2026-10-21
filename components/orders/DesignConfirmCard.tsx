"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Scale } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/resources/format";
import { MasterPriceFields, quoteFromMaster, usePriceMaster } from "@/components/pricing/MasterPriceFields";

export interface DesignLine {
  Id: string;
  Quantity: number | null;
  WeightGrams?: number | null;
  ProductId?: string | null;
  UnitPrice?: number | null;
  Material?: { Name: string | null } | null;
  AIModel?: { ModelName: string | null } | null;
}

/**
 * "Konfirmasi Berat & Harga" — an AI-design order from the cart waits here
 * until the store checks each design's print weight (the app's figure is an
 * estimate from the customer's size). Price = Master Harga; the customer can
 * pay once confirmed.
 */
export function DesignConfirmCard({ orderId, items, onConfirmed }: { orderId: string; items: DesignLine[]; onConfirmed: () => void }) {
  const designs = items.filter((i) => !i.ProductId);
  const products = items.filter((i) => i.ProductId);
  const [values, setValues] = useState<Record<string, { material: string; weight: string }>>(() =>
    Object.fromEntries(
      designs.map((d) => [d.Id, { material: d.Material?.Name ?? "", weight: d.WeightGrams ? String(Math.round(Number(d.WeightGrams))) : "" }]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const { data } = usePriceMaster();
  const master = data?.data;

  const set = (id: string, patch: Partial<{ material: string; weight: string }>) =>
    setValues((v) => ({ ...v, [id]: { ...v[id], ...patch } }));

  const designTotal = designs.reduce((sum, d) => {
    const q = quoteFromMaster(master, values[d.Id]?.material ?? "", Number(values[d.Id]?.weight));
    return q && sum !== null ? sum + q.unitPrice * Math.max(1, d.Quantity ?? 1) : null;
  }, 0 as number | null);
  const productTotal = products.reduce((sum, p) => sum + Number(p.UnitPrice ?? 0) * Math.max(1, p.Quantity ?? 1), 0);
  const ready = designs.every((d) => values[d.Id]?.material && Number(values[d.Id]?.weight) > 0);

  const confirm = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`orders/${orderId}/confirm-design`, {
        method: "POST",
        json: {
          Items: designs.map((d) => ({
            Id: d.Id,
            WeightGrams: Number(values[d.Id].weight),
            MaterialName: values[d.Id].material,
          })),
        },
      });
      toast.success(res.message || "Berat & harga dikonfirmasi");
      onConfirmed();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal mengonfirmasi pesanan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-brand-orange/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="size-4" /> Konfirmasi Berat & Harga
        </CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <p className="rounded-xl bg-brand-orange/10 px-3.5 py-2.5 text-xs text-brand-orange-deep">
          Customer menunggu konfirmasi Anda sebelum bisa membayar. Berat dari aplikasi hanya <b>perkiraan</b> dari ukuran
          desain — cek file 3D-nya, sesuaikan berat cetak dan bahan, lalu konfirmasi. Harga mengikuti Master Harga.
        </p>
        {designs.map((d, i) => (
          <div key={d.Id} className="space-y-2 rounded-xl border border-border p-3">
            <p className="text-sm font-bold text-ink">
              {d.AIModel?.ModelName || `Desain AI ${i + 1}`}
              <span className="font-normal text-ink-soft"> · {Math.max(1, d.Quantity ?? 1)} pcs</span>
            </p>
            <MasterPriceFields
              idPrefix={`confirm-${d.Id}`}
              material={values[d.Id]?.material ?? ""}
              onMaterial={(material) => set(d.Id, { material })}
              weight={values[d.Id]?.weight ?? ""}
              onWeight={(weight) => set(d.Id, { weight })}
              quantity={Math.max(1, d.Quantity ?? 1)}
            />
          </div>
        ))}
        <dl className="space-y-1 text-sm">
          {products.length > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-soft">Produk lain di pesanan ini</dt>
              <dd className="text-ink">{formatCurrency(productTotal)}</dd>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <dt className="text-ink">Total sebelum diskon & ongkir</dt>
            <dd className="text-ink">{designTotal === null ? "-" : formatCurrency(designTotal + productTotal)}</dd>
          </div>
        </dl>
        <p className="text-xs text-ink-soft">
          Diskon tier pelanggan dipotong otomatis dan ongkir dihitung ulang untuk berat baru. Fee transaksi, biaya layanan, dan
          PPN dipotong dari hasil jualan Anda.
        </p>
        <Button onClick={confirm} loading={saving} disabled={!ready || designTotal === null}>
          Konfirmasi & Kirim Harga ke Customer
        </Button>
      </CardBody>
    </Card>
  );
}

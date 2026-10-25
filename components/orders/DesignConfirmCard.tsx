"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Scale } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/resources/format";
import { ITEM_CATEGORIES } from "@/lib/item-category";
import { MasterPriceFields, quoteFromMaster, usePriceMaster } from "@/components/pricing/MasterPriceFields";
import { ColorTypeSelect } from "./ColorTypeSelect";
import { DesignSpecs, type DesignJobSpecs } from "./DesignSpecs";

export interface DesignLine {
  Id: string;
  Quantity: number | null;
  WeightGrams?: number | null;
  ProductId?: string | null;
  UnitPrice?: number | null;
  Notes?: string | null;
  ColorType?: string | null;
  Material?: { Name: string | null } | null;
  AIModel?: { ModelName: string | null; Job?: DesignJobSpecs | null } | null;
}

interface Line {
  material: string;
  weight: string;
  colorType: string;
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
  const [values, setValues] = useState<Record<string, Line>>(() =>
    Object.fromEntries(
      designs.map((d) => [
        d.Id,
        {
          material: d.Material?.Name ?? "",
          weight: d.WeightGrams ? String(Math.round(Number(d.WeightGrams))) : "",
          // The customer's wish (if any) as a starting point — the store decides.
          colorType: d.ColorType ?? d.AIModel?.Job?.ColorPreference ?? "",
        },
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const { data } = usePriceMaster();
  const master = data?.data;

  const set = (id: string, patch: Partial<Line>) =>
    setValues((v) => ({ ...v, [id]: { ...v[id], ...patch } }));

  const designTotal = designs.reduce((sum, d) => {
    const q = quoteFromMaster(master, values[d.Id]?.material ?? "", Number(values[d.Id]?.weight));
    return q && sum !== null ? sum + q.unitPrice * Math.max(1, d.Quantity ?? 1) : null;
  }, 0 as number | null);
  const productTotal = products.reduce((sum, p) => sum + Number(p.UnitPrice ?? 0) * Math.max(1, p.Quantity ?? 1), 0);
  const ready = designs.every((d) => values[d.Id]?.material && Number(values[d.Id]?.weight) > 0 && values[d.Id]?.colorType);

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
            ColorType: values[d.Id].colorType,
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
          desain — cek file 3D-nya, sesuaikan berat cetak dan bahan, tentukan jenis warna, lalu konfirmasi. Harga mengikuti
          Master Harga.
        </p>
        {designs.map((d, i) => (
          <div key={d.Id} className="space-y-2 rounded-xl border border-border p-3">
            <p className="text-sm font-bold text-ink">
              {ITEM_CATEGORIES.PROMPT}
              {designs.length > 1 && ` #${i + 1}`}
              <span className="font-normal text-ink-soft"> · {Math.max(1, d.Quantity ?? 1)} pcs</span>
            </p>
            <DesignSpecs job={d.AIModel?.Job} />
            {d.Notes && (
              <p className="whitespace-pre-line rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs text-ink-soft">
                <span className="font-semibold text-ink">Deskripsi customer:</span> {d.Notes}
              </p>
            )}
            <MasterPriceFields
              idPrefix={`confirm-${d.Id}`}
              material={values[d.Id]?.material ?? ""}
              onMaterial={(material) => set(d.Id, { material })}
              weight={values[d.Id]?.weight ?? ""}
              onWeight={(weight) => set(d.Id, { weight })}
              quantity={Math.max(1, d.Quantity ?? 1)}
            />
            <ColorTypeSelect
              id={`confirm-color-${d.Id}`}
              value={values[d.Id]?.colorType ?? ""}
              onChange={(colorType) => set(d.Id, { colorType })}
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
          Diskon tier pelanggan dipotong otomatis, PPN ditambahkan ke tagihan customer, dan ongkir dihitung ulang untuk berat
          baru. Fee transaksi dan admin fee dipotong dari hasil jualan Anda.
        </p>
        <Button onClick={confirm} loading={saving} disabled={!ready || designTotal === null}>
          Konfirmasi & Kirim Harga ke Customer
        </Button>
      </CardBody>
    </Card>
  );
}

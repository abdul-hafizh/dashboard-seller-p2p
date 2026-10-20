"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formatCurrency } from "@/lib/resources/format";

export interface PriceMaster {
  Materials: string[];
  Tiers: { MinGrams: number; MaxGrams: number | null }[];
  Prices: Record<string, (number | null)[]>;
}

export function usePriceMaster() {
  return useSWR("price-master", () => apiFetch<PriceMaster>("price-master"));
}

/** Same rule as the backend (utils/priceMaster.js quoteFromMaster). */
export function quoteFromMaster(master: PriceMaster | undefined, material: string, weightGrams: number) {
  if (!master || !material || !(weightGrams > 0)) return null;
  const name = master.Materials.find((m) => m.trim().toUpperCase() === material.trim().toUpperCase());
  if (!name) return null;
  const grams = Math.max(1, Math.ceil(weightGrams));
  const index = master.Tiers.findIndex((t) => grams >= t.MinGrams && (t.MaxGrams === null || grams <= t.MaxGrams));
  if (index < 0) return null;
  const perGram = master.Prices[name]?.[index];
  if (perGram === null || perGram === undefined) return null;
  return { perGram, unitPrice: Math.round(perGram * weightGrams), tier: master.Tiers[index] };
}

/**
 * Material + print weight per item → price from the admin's Master Harga.
 * Merchants never type prices; this shows what the price will be.
 */
export function MasterPriceFields({
  material,
  onMaterial,
  weight,
  onWeight,
  quantity = 1,
  idPrefix = "mp",
}: {
  material: string;
  onMaterial: (v: string) => void;
  weight: string;
  onWeight: (v: string) => void;
  quantity?: number;
  idPrefix?: string;
}) {
  const { data } = usePriceMaster();
  const master = data?.data;
  const quote = quoteFromMaster(master, material, Number(weight));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor={`${idPrefix}-material`} required>
            Bahan
          </FieldLabel>
          <Select id={`${idPrefix}-material`} value={material} onChange={(e) => onMaterial(e.target.value)}>
            <option value="">Pilih bahan...</option>
            {(master?.Materials ?? []).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor={`${idPrefix}-weight`} required>
            Berat cetak per item (gram)
          </FieldLabel>
          <Input
            id={`${idPrefix}-weight`}
            type="number"
            min={1}
            value={weight}
            onChange={(e) => onWeight(e.target.value)}
            placeholder="Contoh: 80"
          />
        </div>
      </div>
      <div className="rounded-xl bg-surface-muted/60 px-3 py-2.5 text-sm">
        {!material || !(Number(weight) > 0) ? (
          <span className="text-ink-faint">Pilih bahan dan isi berat untuk melihat harga.</span>
        ) : quote ? (
          <>
            <span className="font-bold text-ink">{formatCurrency(quote.unitPrice)}</span>
            <span className="text-ink-soft"> / item</span>
            {quantity > 1 && <span className="text-ink-soft"> · total {formatCurrency(quote.unitPrice * quantity)}</span>}
            <p className="text-[11px] text-ink-faint">
              {formatCurrency(quote.perGram)}/gram (rentang {quote.tier.MinGrams}–{quote.tier.MaxGrams ?? "ke atas"} g) · dari Master
              Harga admin
            </p>
          </>
        ) : (
          <span className="text-brand-orange-deep">
            Harga {material} untuk berat ini belum diatur admin di Master Harga.
          </span>
        )}
      </div>
    </div>
  );
}

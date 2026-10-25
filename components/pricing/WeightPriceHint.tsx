"use client";

import { Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/resources/format";
import { quoteFromMaster, usePriceMaster } from "./MasterPriceFields";

const tierLabel = (t: { MinGrams: number; MaxGrams: number | null }) =>
  t.MaxGrams === null ? `≥ ${t.MinGrams.toLocaleString("id-ID")} g` : `${t.MinGrams.toLocaleString("id-ID")}–${t.MaxGrams.toLocaleString("id-ID")} g`;

/**
 * Live price under a product's weight field: the material's per-gram price
 * from the admin's Master Harga and, once grams are typed, the price.
 */
export function WeightPriceHint({ material, weight }: { material: unknown; weight: unknown }) {
  const { data, isLoading } = usePriceMaster();
  const master = data?.data;
  const name = typeof material === "string" ? material : "";
  const grams = Number(weight);

  const box = (children: React.ReactNode) => (
    <div className="mt-2 rounded-xl border border-brand-purple/20 bg-brand-purple/5 px-3.5 py-2.5 text-xs text-ink-soft">{children}</div>
  );

  if (isLoading || !master) return null;
  if (!name) return box("Pilih bahan di atas untuk melihat harga per gram.");

  const key = master.Materials.find((m) => m.trim().toUpperCase() === name.trim().toUpperCase());
  const prices = key ? master.Prices[key] ?? [] : [];

  if (!(grams > 0)) {
    const listed = master.Tiers.map((t, i) => ({ t, p: prices[i] })).filter((x) => x.p !== null && x.p !== undefined);
    if (!listed.length) return box(`Harga bahan ${name} belum diatur admin di Master Harga.`);
    return box(
      <>
        <p className="font-semibold text-ink">Harga {name} per gram:</p>
        <p className="mt-0.5">{listed.map(({ t, p }) => `${tierLabel(t)}: ${formatCurrency(p)}/g`).join(" · ")}</p>
      </>,
    );
  }

  const quote = quoteFromMaster(master, name, grams);
  if (!quote) return box(`Harga ${name} untuk berat ${grams.toLocaleString("id-ID")} gram belum diatur admin di Master Harga.`);
  return box(
    <div className="flex items-start gap-2">
      <Calculator className="mt-0.5 size-4 shrink-0 text-brand-purple" />
      <div>
        <p>
          {grams.toLocaleString("id-ID")} g × {formatCurrency(quote.perGram)}/gram{" "}
          <span className="text-ink-faint">(rentang {tierLabel(quote.tier)})</span>
        </p>
        <p className="mt-0.5 text-sm font-extrabold text-ink">Harga jual: {formatCurrency(quote.unitPrice)} / item</p>
      </div>
    </div>,
  );
}

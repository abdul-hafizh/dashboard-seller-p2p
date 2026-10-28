/** Same rules as the backend's utils/orderWeight.js — grams. */
interface WeighableItem {
  /** One unit when ordered. */
  WeightGrams?: number | null;
  Quantity?: number | null;
  /** Backs up older lines that didn't record their own weight. */
  Product?: { Weight?: number | null } | null;
}

const qtyOf = (item: WeighableItem) => Math.max(1, Number(item.Quantity) || 1);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Grams of one unit, or null when unknown. */
export function unitGrams(item: WeighableItem): number | null {
  const own = Number(item.WeightGrams);
  if (Number.isFinite(own) && own > 0) return round2(own);
  const product = Number(item.Product?.Weight);
  return Number.isFinite(product) && product > 0 ? product : null;
}

/** Grams of the whole line — unit × quantity (2 × 30 g = 60 g). */
export function lineGrams(item: WeighableItem): number | null {
  const unit = unitGrams(item);
  return unit === null ? null : round2(unit * qtyOf(item));
}

/** Grams of all lines, or null when none has a weight. */
export function orderGrams(items: WeighableItem[] | null | undefined): number | null {
  const known = (items ?? []).map(lineGrams).filter((g): g is number => g !== null);
  return known.length ? round2(known.reduce((sum, g) => sum + g, 0)) : null;
}

/** "60 g" / "1.250 g" — "-" when unknown. */
export function formatGrams(grams: number | null | undefined): string {
  if (grams === null || grams === undefined || !Number.isFinite(Number(grams))) return "-";
  return `${Number(grams).toLocaleString("id-ID", { maximumFractionDigits: 2 })} g`;
}

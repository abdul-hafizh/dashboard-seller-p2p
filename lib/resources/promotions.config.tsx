import { ImageOff } from "lucide-react";
import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDateTime, toPublicAssetUrl } from "./format";
import { ITEM_CATEGORIES } from "@/lib/item-category";

// Must match the backend's promotionDiscount.service CATEGORY_CODES.
const CATEGORY_OPTIONS = [
  { value: "READY", label: ITEM_CATEGORIES.READY },
  { value: "PROMPT", label: ITEM_CATEGORIES.PROMPT },
  { value: "PRINT_FILE", label: ITEM_CATEGORIES.PRINT_FILE },
];
const categoryLabel = (code: string) => CATEGORY_OPTIONS.find((o) => o.value === code)?.label ?? code;

/** "20% · maks Rp100.000/customer" + categories + budget used, for a promo with a discount. */
function DiscountCell({ r }: { r: Record<string, unknown> }) {
  if (!r.DiscountEnabled) return <span className="text-xs text-ink-faint">Iklan saja</span>;
  const budget = Number(r.Budget) || 0;
  const used = Number(r.DiscountUsed) || 0;
  const reserved = Number(r.DiscountReserved) || 0;
  const pct = budget > 0 ? Math.min(100, ((used + reserved) / budget) * 100) : 0;
  const categories = (r.DiscountCategories as string[] | undefined) ?? [];
  return (
    <div className="min-w-48 space-y-1 text-xs">
      <p className="font-semibold text-ink">
        {String(r.DiscountPercent).replace(".", ",")}% · maks {formatCurrency(r.MaxDiscountPerCustomer)}/customer
      </p>
      <p className="text-ink-faint">{categories.map(categoryLabel).join(", ")}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-brand-purple" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-ink-soft">
        Terpakai {formatCurrency(used)}
        {reserved > 0 ? ` (+${formatCurrency(reserved)} sedang dibayar)` : ""} dari {formatCurrency(budget)} ·{" "}
        {Number(r.DiscountCustomers) || 0} customer
      </p>
    </div>
  );
}

const STATUS: Record<string, { label: string; tone: "success" | "info" | "neutral" | "warning" }> = {
  RUNNING: { label: "Sedang tayang", tone: "success" },
  SCHEDULED: { label: "Terjadwal", tone: "info" },
  ENDED: { label: "Berakhir", tone: "neutral" },
  INACTIVE: { label: "Nonaktif", tone: "warning" },
};

/** Admin › Promosi: promo ads shown as a pop-up on the app's home screen while running. */
export const promotionsConfig: ResourceConfig = {
  key: "promotions",
  endpoint: "promotions",
  title: "Promosi",
  description:
    "Iklan promo yang muncul sebagai pop-up di beranda aplikasi selama jangka waktu tayangnya. Promo juga bisa memberi diskon otomatis saat checkout yang dibayar Petope pusat — hak seller tidak berkurang.",
  searchPlaceholder: "Cari judul promo...",
  columns: [
    {
      key: "ImagePath",
      label: "Gambar",
      render: (r) => {
        const url = toPublicAssetUrl(r.ImagePath);
        return (
          <div className="flex h-16 w-9 items-center justify-center overflow-hidden rounded-md bg-surface-muted">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element -- externally-hosted upload, not worth Next/Image's remote-pattern config
              <img src={url} alt="" className="size-full object-cover" />
            ) : (
              <ImageOff className="size-4 text-ink-faint" />
            )}
          </div>
        );
      },
    },
    { key: "Title", label: "Judul Promo", render: (r) => <span className="font-semibold text-ink">{String(r.Title)}</span> },
    {
      key: "StartAt",
      label: "Jangka Waktu Tayang",
      render: (r) => (
        <span className="whitespace-nowrap text-xs text-ink">
          {formatDateTime(r.StartAt)} – {formatDateTime(r.EndAt)}
        </span>
      ),
    },
    { key: "DiscountEnabled", label: "Diskon dari Pusat", render: (r) => <DiscountCell r={r} /> },
    {
      key: "Status",
      label: "Status",
      render: (r) => {
        const s = STATUS[String(r.Status)] ?? STATUS.INACTIVE;
        return <Badge tone={s.tone}>{s.label}</Badge>;
      },
    },
  ],
  fields: [
    { name: "Title", label: "Judul Promo", type: "text", required: true, placeholder: "Diskon 20% Cetak Miniatur" },
    {
      name: "ImagePath",
      label: "Gambar Iklan",
      type: "image",
      required: true,
      imageAspect: "portrait",
      helpText: "Portrait 9:16, disarankan 1080 × 1920 px (JPG/PNG). Ditampilkan penuh di layar ponsel customer.",
    },
    { name: "StartAt", label: "Mulai Tayang", type: "datetime", required: true },
    { name: "EndAt", label: "Selesai Tayang", type: "datetime", required: true, helpText: "Setelah waktu ini promo tidak muncul lagi." },
    {
      name: "SortOrder",
      label: "Urutan",
      type: "number",
      placeholder: "0",
      defaultValue: 0,
      helpText: "Jika ada beberapa promo tayang bersamaan, yang urutannya lebih kecil tampil lebih dulu.",
    },
    { name: "IsActive", label: "Aktif", type: "boolean", defaultValue: true },
    {
      name: "DiscountEnabled",
      label: "Beri diskon dari pusat (dibayar Petope, hak seller tidak berkurang)",
      type: "boolean",
      defaultValue: false,
    },
    {
      name: "DiscountCategories",
      label: "Kategori yang Mendapat Diskon",
      type: "multiselect",
      options: CATEGORY_OPTIONS,
      initialFromRow: (row) => ((row.DiscountCategories as string[] | undefined) ?? []).map(String),
      helpText: "Wajib bila diskon aktif. Diskon hanya untuk item dari kategori yang dipilih.",
    },
    {
      name: "DiscountPercent",
      label: "Diskon (%)",
      type: "number",
      placeholder: "20",
      helpText: "Dari harga item (setelah diskon tier), tidak termasuk PPN dan ongkir. Dipotong otomatis saat checkout.",
    },
    {
      name: "MaxDiscountPerCustomer",
      label: "Maksimal Diskon per Customer (Rp)",
      type: "number",
      placeholder: "100000",
      helpText: "Total diskon yang bisa dinikmati satu customer selama promo, dari semua transaksinya.",
    },
    {
      name: "Budget",
      label: "Anggaran Promo (Rp)",
      type: "number",
      placeholder: "5000000",
      helpText: "Total yang siap dibayar Petope untuk promo ini. Diskon berhenti otomatis saat anggaran habis.",
    },
  ],
};

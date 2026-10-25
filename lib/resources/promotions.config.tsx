import { ImageOff } from "lucide-react";
import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, toPublicAssetUrl } from "./format";

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
    "Iklan promo yang muncul sebagai pop-up di beranda aplikasi saat customer membuka aplikasi, selama jangka waktu tayangnya. Customer bisa menutupnya.",
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
  ],
};

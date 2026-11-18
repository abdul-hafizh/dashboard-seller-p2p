import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

/** Admin › Master Item Code: accounting item codes of the 3D print services, each tied to a material. */
export const itemCodesConfig: ResourceConfig = {
  key: "item-codes",
  endpoint: "item-codes",
  title: "Master Item Code",
  description:
    "Item code layanan cetak 3D (sesuai sistem akuntansi), masing-masing terhubung ke satu bahan. Kolom bahan di Master Harga diambil dari bahan di sini, dan setiap sel Master Harga (bahan × rentang berat) memilih salah satu item code bahan tersebut. Item code yang sedang dipakai Master Harga tidak bisa dihapus atau diganti bahannya.",
  searchPlaceholder: "Cari item code, nama, atau bahan...",
  columns: [
    { key: "ItemCode", label: "Item Code", render: (r) => <span className="font-mono font-semibold text-ink">{String(r.ItemCode ?? "-")}</span> },
    { key: "Name", label: "Nama" },
    { key: "Material", label: "Bahan" },
    { key: "SortOrder", label: "Urutan" },
    {
      key: "IsActive",
      label: "Status",
      render: (r) => <Badge tone={r.IsActive ? "success" : "neutral"}>{r.IsActive ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ],
  fields: [
    { name: "ItemCode", label: "Item Code", type: "text", required: true, placeholder: "1011314" },
    { name: "Name", label: "Nama Item", type: "text", required: true, placeholder: "Print 3D PLA - 101-500" },
    {
      name: "Material",
      label: "Bahan",
      type: "text",
      required: true,
      placeholder: "PLA",
      helpText: "Nama bahan persis seperti di Master Harga (misalnya PLA, ABS/PETG, TPU). Bahan baru otomatis bisa ditambahkan sebagai kolom di Master Harga.",
    },
    { name: "SortOrder", label: "Urutan", type: "number", defaultValue: 0, helpText: "Angka kecil tampil lebih dulu." },
    { name: "IsActive", label: "Aktif", type: "boolean", defaultValue: true },
  ],
};

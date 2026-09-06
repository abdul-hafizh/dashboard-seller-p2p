import type { ResourceConfig } from "./types";
import { formatCurrency } from "./format";
import { Badge } from "@/components/ui/Badge";

export const materialsConfig: ResourceConfig = {
  key: "materials",
  endpoint: "materials",
  title: "Material",
  description: "Jenis material cetak beserta densitas dan harga per gram.",
  searchPlaceholder: "Cari material...",
  columns: [
    { key: "Name", label: "Nama" },
    { key: "Density", label: "Densitas (g/cm³)", render: (r) => (r.Density != null ? String(r.Density) : "-") },
    { key: "PricePerGram", label: "Harga / gram", render: (r) => formatCurrency(r.PricePerGram) },
    {
      key: "Status",
      label: "Status",
      render: (r) => <Badge tone={r.Status ? "success" : "neutral"}>{r.Status ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ],
  fields: [
    { name: "Name", label: "Nama Material", type: "text", required: true, placeholder: "PLA" },
    { name: "Density", label: "Densitas (g/cm³)", type: "number", placeholder: "1.24" },
    { name: "PricePerGram", label: "Harga per Gram (Rp)", type: "number", placeholder: "500" },
    { name: "Description", label: "Deskripsi", type: "textarea", placeholder: "Catatan tambahan tentang material ini" },
    { name: "Status", label: "Aktif", type: "boolean", defaultValue: true },
  ],
};

import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

export const materialsConfig: ResourceConfig = {
  key: "materials",
  endpoint: "materials",
  title: "Material",
  description: "Bahan cetak yang tersedia di toko. Harga diatur admin di Master Harga.",
  searchPlaceholder: "Cari material...",
  columns: [
    { key: "Name", label: "Nama" },
    { key: "Density", label: "Densitas (g/cm³)", render: (r) => (r.Density != null ? String(r.Density) : "-") },
    {
      key: "Status",
      label: "Status",
      render: (r) => <Badge tone={r.Status ? "success" : "neutral"}>{r.Status ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ],
  fields: [
    {
      name: "Name",
      label: "Bahan",
      type: "select",
      required: true,
      optionsEndpoint: "price-master/materials",
      optionValueKey: "Name",
      optionLabelKey: "Name",
      helpText: "Dari daftar bahan Master Harga — customer hanya bisa memilih bahan yang ada di sini.",
    },
    { name: "Density", label: "Densitas (g/cm³)", type: "number", placeholder: "1.24" },
    { name: "Description", label: "Deskripsi", type: "textarea", placeholder: "Catatan tambahan tentang material ini" },
    { name: "Status", label: "Aktif", type: "boolean", defaultValue: true },
  ],
};

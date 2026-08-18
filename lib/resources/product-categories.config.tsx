import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

export const productCategoriesConfig: ResourceConfig = {
  key: "product-categories",
  endpoint: "product-categories",
  title: "Kategori Produk",
  description: "Kategori untuk mengelompokkan produk di marketplace.",
  searchPlaceholder: "Cari kategori...",
  columns: [
    { key: "Name", label: "Nama" },
    { key: "Description", label: "Deskripsi", render: (r) => (r.Description ? String(r.Description) : "-") },
    {
      key: "IsActive",
      label: "Status",
      render: (r) => <Badge tone={r.IsActive ? "success" : "neutral"}>{r.IsActive ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ],
  fields: [
    { name: "Name", label: "Nama Kategori", type: "text", required: true, placeholder: "Figurine" },
    { name: "Description", label: "Deskripsi", type: "textarea" },
    { name: "IsActive", label: "Aktif", type: "boolean", defaultValue: true, intBoolean: true },
  ],
};

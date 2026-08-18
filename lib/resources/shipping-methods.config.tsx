import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

export const shippingMethodsConfig: ResourceConfig = {
  key: "shipping-methods",
  endpoint: "shipping-methods",
  title: "Metode Pengiriman",
  description: "Kurir / metode pengiriman yang tersedia.",
  searchPlaceholder: "Cari metode pengiriman...",
  columns: [
    { key: "Name", label: "Nama" },
    { key: "Provider", label: "Provider", render: (r) => (r.Provider ? String(r.Provider) : "-") },
    {
      key: "IsActive",
      label: "Status",
      render: (r) => <Badge tone={r.IsActive ? "success" : "neutral"}>{r.IsActive ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ],
  fields: [
    { name: "Name", label: "Nama Metode", type: "text", required: true, placeholder: "JNE Reguler" },
    { name: "Provider", label: "Provider", type: "text", placeholder: "JNE" },
    { name: "IsActive", label: "Aktif", type: "boolean", defaultValue: true, intBoolean: true },
  ],
};

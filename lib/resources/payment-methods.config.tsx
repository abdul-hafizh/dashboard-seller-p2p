import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

export const paymentMethodsConfig: ResourceConfig = {
  key: "payment-methods",
  endpoint: "payment-methods",
  title: "Metode Pembayaran",
  description: "Metode pembayaran yang tersedia untuk pelanggan.",
  searchPlaceholder: "Cari metode pembayaran...",
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
    { name: "Name", label: "Nama Metode", type: "text", required: true, placeholder: "QRIS" },
    { name: "Provider", label: "Provider", type: "text", placeholder: "Midtrans" },
    { name: "IsActive", label: "Aktif", type: "boolean", defaultValue: true, intBoolean: true },
  ],
};

import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

export const shippingServicesConfig: ResourceConfig = {
  key: "shipping-services",
  endpoint: "shipping-services",
  title: "Layanan Pengiriman",
  description: "Layanan spesifik di bawah tiap metode pengiriman (mis. Reguler, Same Day, Kargo).",
  searchPlaceholder: "Cari layanan pengiriman...",
  columns: [
    { key: "ServiceName", label: "Nama Layanan" },
    { key: "ServiceCategory", label: "Kategori" },
    { key: "ServiceCode", label: "Kode", render: (r) => (r.ServiceCode ? String(r.ServiceCode) : "-") },
    { key: "EstimatedDelivery", label: "Estimasi", render: (r) => (r.EstimatedDelivery ? String(r.EstimatedDelivery) : "-") },
    {
      key: "IsActive",
      label: "Status",
      render: (r) => <Badge tone={r.IsActive ? "success" : "neutral"}>{r.IsActive ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ],
  fields: [
    {
      name: "ShippingMethodId",
      label: "Metode Pengiriman",
      type: "select",
      required: true,
      optionsEndpoint: "shipping-methods",
      optionLabelKey: "Name",
    },
    { name: "ServiceName", label: "Nama Layanan", type: "text", required: true, placeholder: "JNE REG" },
    {
      name: "ServiceCategory",
      label: "Kategori",
      type: "select",
      required: true,
      options: [
        { value: "INSTANT", label: "Instant" },
        { value: "SAMEDAY", label: "Same Day" },
        { value: "REGULAR", label: "Reguler" },
        { value: "NEXTDAY", label: "Next Day" },
        { value: "CARGO", label: "Kargo" },
        { value: "INTERNAL", label: "Internal" },
      ],
    },
    { name: "ServiceCode", label: "Kode Layanan", type: "text", placeholder: "REG" },
    { name: "EstimatedDelivery", label: "Estimasi Pengiriman", type: "text", placeholder: "2-3 hari" },
    { name: "IsActive", label: "Aktif", type: "boolean", defaultValue: true },
  ],
};

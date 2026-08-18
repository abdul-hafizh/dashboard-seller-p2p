import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

export const orderStatusesConfig: ResourceConfig = {
  key: "order-statuses",
  endpoint: "order-statuses",
  title: "Status Pesanan",
  description: "Daftar status yang bisa dilalui sebuah pesanan.",
  searchPlaceholder: "Cari status...",
  columns: [
    {
      key: "Name",
      label: "Nama",
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: (r.ColorCode as string) || "#B7B2C2" }}
          />
          {String(r.Name ?? "-")}
        </span>
      ),
    },
    { key: "DisplayOrder", label: "Urutan", render: (r) => (r.DisplayOrder != null ? String(r.DisplayOrder) : "-") },
    {
      key: "IsCompleted",
      label: "Status Selesai",
      render: (r) => <Badge tone={r.IsCompleted ? "success" : "neutral"}>{r.IsCompleted ? "Selesai" : "Belum Selesai"}</Badge>,
    },
  ],
  fields: [
    { name: "Name", label: "Nama Status", type: "text", required: true, placeholder: "PROCESSING" },
    { name: "DisplayOrder", label: "Urutan Tampil", type: "number", placeholder: "3" },
    { name: "ColorCode", label: "Kode Warna", type: "text", placeholder: "#f59e0b" },
    { name: "IsCompleted", label: "Menandakan pesanan selesai", type: "boolean", defaultValue: false },
  ],
};

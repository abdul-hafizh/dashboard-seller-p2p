import type { ResourceConfig } from "./types";
import { formatTime } from "./format";
import { Badge } from "@/components/ui/Badge";

export const branchesConfig: ResourceConfig = {
  key: "branches",
  endpoint: "branches",
  title: "Cabang",
  description: "Cabang / workshop di bawah sebuah perusahaan.",
  searchPlaceholder: "Cari cabang...",
  columns: [
    { key: "Name", label: "Nama" },
    { key: "Address", label: "Alamat", render: (r) => (r.Address ? String(r.Address) : "-") },
    {
      key: "hours",
      label: "Jam Operasional",
      render: (r) => (r.OpenHour || r.CloseHour ? `${formatTime(r.OpenHour)} – ${formatTime(r.CloseHour)}` : "-"),
    },
    {
      key: "Status",
      label: "Status",
      render: (r) => <Badge tone={r.Status === "ACTIVE" ? "success" : "neutral"}>{String(r.Status ?? "-")}</Badge>,
    },
  ],
  fields: [
    { name: "Name", label: "Nama Cabang", type: "text", required: true, placeholder: "Cabang Jakarta" },
    {
      name: "CompanyId",
      label: "Perusahaan",
      type: "select",
      required: true,
      optionsEndpoint: "companies",
      optionLabelKey: "Name",
    },
    { name: "Address", label: "Alamat", type: "textarea" },
    { name: "OpenHour", label: "Jam Buka", type: "time" },
    { name: "CloseHour", label: "Jam Tutup", type: "time" },
    {
      name: "Status",
      label: "Status",
      type: "select",
      defaultValue: "ACTIVE",
      options: [
        { value: "ACTIVE", label: "Aktif" },
        { value: "INACTIVE", label: "Nonaktif" },
      ],
    },
  ],
};

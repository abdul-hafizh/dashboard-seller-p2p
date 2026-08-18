import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

export const companiesConfig: ResourceConfig = {
  key: "companies",
  endpoint: "companies",
  title: "Perusahaan",
  description: "Struktur organisasi manufaktur (perusahaan induk dari cabang).",
  searchPlaceholder: "Cari perusahaan...",
  columns: [
    { key: "Name", label: "Nama" },
    { key: "CompanyType", label: "Tipe", render: (r) => (r.CompanyType ? String(r.CompanyType) : "-") },
    { key: "Phone", label: "Telepon", render: (r) => (r.Phone ? String(r.Phone) : "-") },
    { key: "Email", label: "Email", render: (r) => (r.Email ? String(r.Email) : "-") },
    {
      key: "Status",
      label: "Status",
      render: (r) => <Badge tone={r.Status === "ACTIVE" ? "success" : "neutral"}>{String(r.Status ?? "-")}</Badge>,
    },
  ],
  fields: [
    { name: "Name", label: "Nama Perusahaan", type: "text", required: true, placeholder: "PT Meshy Manufaktur" },
    { name: "CompanyType", label: "Tipe Perusahaan", type: "text", placeholder: "MANUFACTURER" },
    { name: "CountryId", label: "Negara", type: "select", optionsEndpoint: "countries", optionLabelKey: "Name" },
    { name: "ProvinceId", label: "Provinsi", type: "select", optionsEndpoint: "provinces", optionLabelKey: "Name" },
    { name: "CityId", label: "Kota", type: "select", optionsEndpoint: "cities", optionLabelKey: "Name" },
    { name: "Address", label: "Alamat", type: "textarea" },
    { name: "Phone", label: "Telepon", type: "text" },
    { name: "Email", label: "Email", type: "text" },
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

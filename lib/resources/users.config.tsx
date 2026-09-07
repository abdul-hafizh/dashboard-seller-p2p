import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "./format";
import { ROLE } from "@/lib/constants";

export const usersConfig: ResourceConfig = {
  key: "users",
  endpoint: "users",
  title: "Pengguna",
  description: "Kelola akun Super Admin dan Merchant (khusus Super Admin).",
  searchPlaceholder: "Cari nama, email, atau telepon...",
  columns: [
    { key: "FullName", label: "Nama", render: (r) => (r.FullName as string) || "-" },
    { key: "Email", label: "Email" },
    {
      key: "Role",
      label: "Role",
      render: (r) => {
        const role = r.Role as { Name?: string } | null | undefined;
        return <Badge tone="brand">{role?.Name ?? "-"}</Badge>;
      },
    },
    {
      key: "UserLevel",
      label: "Tier",
      render: (r) => <Badge tone="brand">{(r.UserLevel as string) || "BRONZE"}</Badge>,
    },
    {
      key: "TotalSpent",
      label: "Total Belanja",
      render: (r) => formatCurrency(r.TotalSpent ?? 0),
    },
    {
      key: "IsActive",
      label: "Status",
      render: (r) => <Badge tone={r.IsActive ? "success" : "neutral"}>{r.IsActive ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ],
  fields: [
    { name: "FullName", label: "Nama Lengkap", type: "text", required: true },
    { name: "Email", label: "Email", type: "text", required: true, placeholder: "nama@email.com" },
    {
      name: "Password",
      label: "Password",
      type: "password",
      placeholder: "Wajib diisi saat membuat pengguna baru",
      helpText: "Kosongkan saat mengubah data jika tidak ingin mengganti password.",
    },
    { name: "Phone", label: "No. Telepon", type: "text" },
    {
      name: "RoleId",
      label: "Role",
      type: "select",
      required: true,
      options: [
        { value: ROLE.SUPER_ADMIN, label: "Super Admin" },
        { value: ROLE.MERCHANT, label: "Merchant" },
        { value: ROLE.CUSTOMER, label: "Customer" },
      ],
    },
    { name: "CompanyId", label: "Perusahaan", type: "select", optionsEndpoint: "companies", optionLabelKey: "Name" },
    { name: "BranchId", label: "Cabang", type: "select", optionsEndpoint: "branches", optionLabelKey: "Name" },
    { name: "IsActive", label: "Aktif", type: "boolean", defaultValue: true },
  ],
};

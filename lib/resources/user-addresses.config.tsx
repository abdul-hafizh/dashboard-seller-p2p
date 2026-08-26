import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

/** UserId is only editable by admins — merchants always manage their own
 * address (the backend forces UserId to the authenticated user otherwise,
 * and rejects update/delete of an address that isn't theirs). */
export function buildUserAddressesConfig(isAdmin: boolean): ResourceConfig {
  return {
    key: "user-addresses",
    endpoint: "user-addresses",
    title: "Alamat",
    description: isAdmin
      ? "Alamat milik seluruh pengguna (admin dan merchant)."
      : "Alamat tokomu — ditampilkan ke pembeli pada detail pesanan.",
    searchPlaceholder: "Cari alamat...",
    columns: [
      { key: "Label", label: "Label" },
      { key: "RecipientName", label: "Penerima" },
      { key: "Address", label: "Alamat" },
      ...(isAdmin
        ? [
            {
              key: "User",
              label: "Pemilik",
              render: (r: Record<string, unknown>) => {
                const owner = r.User as { FullName?: string } | null | undefined;
                return owner?.FullName ?? "-";
              },
            },
          ]
        : []),
      {
        key: "IsDefault",
        label: "Utama",
        render: (r) => <Badge tone={r.IsDefault ? "success" : "neutral"}>{r.IsDefault ? "Utama" : "-"}</Badge>,
      },
    ],
    fields: [
      ...(isAdmin
        ? [
            {
              name: "UserId",
              label: "Pemilik",
              type: "select" as const,
              optionsEndpoint: "users",
              optionLabelKey: "FullName",
              helpText: "Kosongkan untuk menetapkan dirimu sendiri sebagai pemilik.",
            },
          ]
        : []),
      { name: "Label", label: "Label", type: "text", placeholder: "Toko / Gudang" },
      { name: "RecipientName", label: "Nama Penerima", type: "text", placeholder: "Nama lengkap" },
      { name: "Phone", label: "Telepon", type: "text", placeholder: "08xxxxxxxxxx" },
      { name: "WhatsappNumber", label: "WhatsApp", type: "text", placeholder: "08xxxxxxxxxx" },
      { name: "Address", label: "Alamat Lengkap", type: "textarea", required: true, placeholder: "Jalan, nomor, RT/RW, kelurahan..." },
      { name: "CountryId", label: "Negara", type: "select", optionsEndpoint: "countries", optionLabelKey: "Name" },
      { name: "ProvinceId", label: "Provinsi", type: "select", optionsEndpoint: "provinces", optionLabelKey: "Name" },
      { name: "CityId", label: "Kota", type: "select", optionsEndpoint: "cities", optionLabelKey: "Name" },
      { name: "PostalCode", label: "Kode Pos", type: "text", placeholder: "12345" },
      { name: "IsDefault", label: "Jadikan alamat utama", type: "boolean", defaultValue: false, intBoolean: true },
    ],
  };
}

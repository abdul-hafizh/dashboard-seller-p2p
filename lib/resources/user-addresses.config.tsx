import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

/** UserId is only editable by admins — merchants always manage their own
 * address (the backend forces UserId to the authenticated user otherwise,
 * and rejects update/delete of an address that isn't theirs). */
export function buildUserAddressesConfig(isAdmin: boolean): ResourceConfig {
  return {
    key: "user-addresses",
    endpoint: "user-addresses",
    title: isAdmin ? "Alamat" : "Alamat Toko",
    description: isAdmin
      ? "Alamat milik seluruh pengguna (admin dan seller)."
      : "Dipakai untuk ongkir, kurir instan, dan Toko Terdekat di aplikasi — tandai titik lokasi di peta, alamatnya terisi otomatis.",
    searchPlaceholder: "Cari alamat...",
    columns: [
      { key: "Label", label: "Jenis Usaha" },
      { key: "RecipientName", label: "Nama Seller" },
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
      {
        name: "Label",
        label: "Jenis Usaha",
        type: "select",
        required: true,
        defaultValue: "Toko",
        options: [
          { value: "Toko", label: "Toko" },
          { value: "Rumahan", label: "Rumahan" },
        ],
      },
      { name: "RecipientName", label: "Nama Seller", type: "text", placeholder: "Nama lengkap" },
      { name: "WhatsappNumber", label: "No. WhatsApp", type: "text", placeholder: "08xxxxxxxxxx" },
      {
        name: "__location",
        label: "Titik Lokasi",
        type: "location",
        helpText:
          "Klik peta atau geser pin ke lokasi toko, atau pakai lokasi kamu sekarang — negara sampai kelurahan, kode pos, dan alamat (bila kosong) terisi otomatis dan masih bisa diubah.",
      },
      { name: "Address", label: "Alamat Lengkap", type: "textarea", required: true, placeholder: "Nama jalan, nomor, RT/RW, patokan..." },
      { name: "CountryId", label: "Negara", type: "select", optionsEndpoint: "countries", optionLabelKey: "Name" },
      {
        name: "ProvinceId",
        label: "Provinsi",
        type: "select",
        optionsEndpoint: "provinces",
        optionLabelKey: "Name",
        dependsOn: "CountryId",
      },
      {
        name: "CityId",
        label: "Kota",
        type: "select",
        optionsEndpoint: "cities",
        optionLabelKey: "Name",
        dependsOn: "ProvinceId",
      },
      {
        name: "DistrictId",
        label: "Kecamatan",
        type: "select",
        optionsEndpoint: "districts",
        optionLabelKey: "Name",
        dependsOn: "CityId",
        helpText: "Khusus Indonesia.",
      },
      {
        name: "VillageId",
        label: "Kelurahan / Desa",
        type: "select",
        optionsEndpoint: "villages",
        optionLabelKey: "Name",
        dependsOn: "DistrictId",
      },
      {
        name: "PostalCode",
        label: "Kode Pos",
        type: "text",
        placeholder: "12345",
        helpText: "Kosongkan untuk memakai kode pos kelurahan yang dipilih.",
      },
      {
        name: "Latitude",
        label: "Latitude",
        type: "number",
        placeholder: "-6.2441",
        helpText: "Terisi dari Titik Lokasi di atas. Wajib (bersama Longitude) agar kurir instan seperti Gojek/Grab muncul di ongkir pembeli.",
      },
      { name: "Longitude", label: "Longitude", type: "number", placeholder: "106.8003" },
      { name: "IsDefault", label: "Jadikan alamat utama", type: "boolean", defaultValue: false, intBoolean: true },
    ],
  };
}

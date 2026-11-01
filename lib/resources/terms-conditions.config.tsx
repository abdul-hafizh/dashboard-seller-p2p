import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

export const TERMS_PLACEMENTS = [{ value: "PRODUCT_FORM", label: "Form Produk (tambah & ubah produk)" }];

const placementLabel = (v: unknown) => TERMS_PLACEMENTS.find((p) => p.value === v)?.label ?? String(v ?? "-");

/** Admin › Syarat & Ketentuan: terms shown as a warning on a dashboard form — e.g. the seller's product form. */
export const termsConditionsConfig: ResourceConfig = {
  key: "terms-conditions",
  endpoint: "terms-conditions",
  title: "Syarat & Ketentuan",
  description:
    "Syarat & ketentuan yang tampil sebagai peringatan di form produk saat seller menambah atau mengubah produk — misalnya bahwa isian berat (gram) menjadi tanggung jawab seller. Hanya yang aktif yang ditampilkan, sesuai urutan.",
  searchPlaceholder: "Cari judul atau isi...",
  columns: [
    { key: "Title", label: "Judul", render: (r) => <span className="font-semibold text-ink">{String(r.Title ?? "-")}</span> },
    {
      key: "Content",
      label: "Isi",
      render: (r) => <p className="line-clamp-2 max-w-md whitespace-pre-line text-xs text-ink-soft">{String(r.Content ?? "")}</p>,
    },
    { key: "Placement", label: "Tampil di", render: (r) => placementLabel(r.Placement) },
    { key: "SortOrder", label: "Urutan" },
    {
      key: "IsActive",
      label: "Status",
      render: (r) => <Badge tone={r.IsActive ? "success" : "neutral"}>{r.IsActive ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ],
  fields: [
    { name: "Title", label: "Judul", type: "text", required: true, placeholder: "Tanggung Jawab Isian Berat" },
    {
      name: "Content",
      label: "Isi Syarat & Ketentuan",
      type: "textarea",
      required: true,
      placeholder: "Berat per item (gram) yang diisi seller menjadi tanggung jawab seller sepenuhnya...",
      helpText: "Baris baru (Enter) ikut tampil sebagai baris baru di form produk.",
    },
    { name: "Placement", label: "Tampil di", type: "select", required: true, options: TERMS_PLACEMENTS, defaultValue: "PRODUCT_FORM" },
    { name: "SortOrder", label: "Urutan", type: "number", defaultValue: 0, helpText: "Angka kecil tampil lebih dulu." },
    { name: "IsActive", label: "Aktif", type: "boolean", defaultValue: true },
  ],
};

import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

/** Admin › Label Alamat Toko: the "Jenis Usaha" choices on the seller's store address (Toko, Rumahan, Pabrik, …). */
export const storeLabelsConfig: ResourceConfig = {
  key: "store-labels",
  endpoint: "store-labels",
  title: "Label Alamat Toko",
  description:
    "Pilihan Jenis Usaha yang dipilih seller saat mengisi alamat toko di Profil. Hanya label aktif yang bisa dipilih, sesuai urutan. Mengubah atau menghapus label tidak mengubah alamat yang sudah tersimpan.",
  searchPlaceholder: "Cari label...",
  columns: [
    { key: "Name", label: "Nama Label", render: (r) => <span className="font-semibold text-ink">{String(r.Name ?? "-")}</span> },
    { key: "SortOrder", label: "Urutan" },
    {
      key: "IsActive",
      label: "Status",
      render: (r) => <Badge tone={r.IsActive ? "success" : "neutral"}>{r.IsActive ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ],
  fields: [
    { name: "Name", label: "Nama Label", type: "text", required: true, placeholder: "Pabrik" },
    { name: "SortOrder", label: "Urutan", type: "number", defaultValue: 0, helpText: "Angka kecil tampil lebih dulu." },
    { name: "IsActive", label: "Aktif", type: "boolean", defaultValue: true },
  ],
};

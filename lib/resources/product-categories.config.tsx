import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";
import { HOME_ACTIONS, HOME_ICONS, HomeCardPreview } from "@/components/categories/HomeCardPreview";

const HEX = /^#[0-9a-f]{6}$/i;
const swatch = (c: unknown) => (HEX.test(String(c ?? "")) ? String(c) : "#B7B2C2");

export const productCategoriesConfig: ResourceConfig = {
  key: "product-categories",
  endpoint: "product-categories",
  title: "Kategori Produk",
  description:
    "Kategori untuk mengelompokkan produk di marketplace. Kategori dengan fungsi kartu tampil sebagai kartu \"Mau pesan apa hari ini?\" di halaman utama aplikasi.",
  searchPlaceholder: "Cari kategori...",
  columns: [
    { key: "Name", label: "Nama" },
    {
      key: "HomeTitle",
      label: "Kartu Halaman Utama",
      render: (r) =>
        r.HomeAction ? (
          <span className="inline-flex items-center gap-2">
            <span
              className="size-4 shrink-0 rounded"
              style={{ background: `linear-gradient(135deg, ${swatch(r.HomeColorStart)}, ${swatch(r.HomeColorEnd ?? r.HomeColorStart)})` }}
            />
            <span>
              {String(r.HomeTitle || r.Name)}
              <span className="block text-[11px] text-ink-faint">
                {HOME_ACTIONS.find((a) => a.value === r.HomeAction)?.label} · urutan {String(r.HomeSortOrder ?? 0)}
              </span>
            </span>
            {!r.ShowOnHome && <Badge tone="neutral">Disembunyikan</Badge>}
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "IsActive",
      label: "Status",
      render: (r) => <Badge tone={r.IsActive ? "success" : "neutral"}>{r.IsActive ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ],
  fields: [
    {
      name: "Name",
      label: "Nama Kategori",
      type: "text",
      required: true,
      placeholder: "Figurine",
      helpText: "Barang Jadi, File Via Prompt dan File Siap Print dipakai sebagai nama jenis item pesanan — sebaiknya tidak diganti.",
    },
    { name: "Description", label: "Deskripsi", type: "textarea" },
    { name: "IsActive", label: "Aktif", type: "boolean", defaultValue: true, intBoolean: true },
    {
      name: "HomeAction",
      label: "Fungsi Kartu di Halaman Utama",
      type: "select",
      options: HOME_ACTIONS,
      helpText: "Yang dibuka saat customer mengetuk kartu. Kosongkan bila kategori ini tidak perlu kartu.",
    },
    { name: "ShowOnHome", label: "Tampil di halaman utama", type: "boolean", defaultValue: true },
    { name: "HomeTitle", label: "Judul Kartu", type: "text", placeholder: "Produk via Prompt", helpText: "Kosong = memakai nama kategori." },
    { name: "HomeDescription", label: "Deskripsi Kartu", type: "textarea", helpText: "Kosong = memakai deskripsi kategori." },
    { name: "HomeIcon", label: "Ikon", type: "select", options: HOME_ICONS.map(({ value, label }) => ({ value, label })) },
    {
      name: "HomeIconImage",
      label: "Gambar Ikon (opsional)",
      type: "image",
      helpText: "Bila diisi, gambar ini dipakai menggantikan ikon di atas. Sebaiknya PNG putih transparan.",
    },
    { name: "HomeColorStart", label: "Warna Latar 1", type: "text", placeholder: "#9B2FCE", helpText: "Format #RRGGBB — awal gradasi." },
    {
      name: "HomeColorEnd",
      label: "Warna Latar 2",
      type: "text",
      placeholder: "#6423A6",
      helpText: "Format #RRGGBB — akhir gradasi (samakan dengan Warna 1 untuk warna polos).",
    },
    {
      name: "HomeSortOrder",
      label: "Urutan Kategori Produk",
      type: "number",
      defaultValue: 0,
      placeholder: "1",
      liveHint: (values) => <HomeCardPreview values={values} />,
    },
  ],
};

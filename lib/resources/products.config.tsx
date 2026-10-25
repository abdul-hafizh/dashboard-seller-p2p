import type { ResourceConfig } from "./types";
import { formatCurrency, toPublicAssetUrl } from "./format";
import { Badge } from "@/components/ui/Badge";
import { ImageOff, Star, Store } from "lucide-react";

/** SellerId is only editable by admins — merchants always create products under themselves
 * (the backend defaults SellerId to the authenticated user when it's omitted). */
export function buildProductsConfig(isAdmin: boolean): ResourceConfig {
  return {
    key: "products",
    endpoint: "products",
    periodFilter: "Tanggal produk ditambahkan",
    title: "Produk",
    description: isAdmin ? "Seluruh produk dari semua seller." : "Produk yang kamu jual di marketplace.",
    searchPlaceholder: "Cari produk...",
    columns: [
      {
        key: "ThumbnailPath",
        label: "Gambar",
        render: (r) => {
          const url = toPublicAssetUrl(r.ThumbnailPath);
          return (
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element -- externally-hosted upload, not worth Next/Image's remote-pattern config
                <img src={url} alt="" className="size-full object-cover" />
              ) : (
                <ImageOff className="size-4 text-ink-faint" />
              )}
            </div>
          );
        },
      },
      {
        key: "ProductName",
        label: "Nama Produk",
        // Admins see every seller's products: the seller goes under the name instead of its own column.
        render: (r) => {
          const seller = r.Seller as { FullName?: string } | null | undefined;
          return (
            <div>
              <p className="font-medium text-ink">{String(r.ProductName ?? "-")}</p>
              {isAdmin && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-faint">
                  <Store className="size-3" /> {seller?.FullName ?? "Tanpa seller"}
                </p>
              )}
            </div>
          );
        },
      },
      {
        key: "Category",
        label: "Kategori",
        render: (r) => {
          const category = r.Category as { Name?: string } | null | undefined;
          return category?.Name ?? "-";
        },
      },
      {
        key: "MaterialName",
        label: "Bahan",
        render: (r) => (
          <div>
            <p>{(r.MaterialName as string | null) || "-"}</p>
            {r.ColorType ? (
              <p className="mt-0.5 text-xs text-ink-faint">{r.ColorType === "MULTI" ? "Multicolor" : "Satu warna"}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: "Price",
        label: "Harga",
        render: (r) =>
          r.Price != null ? (
            formatCurrency(r.Price)
          ) : (
            <span className="text-xs font-semibold text-brand-orange-deep">Belum ada harga</span>
          ),
      },
      {
        key: "Stock",
        label: "Stok",
        render: (r) => {
          const stock = Number(r.Stock ?? 0);
          return <Badge tone={stock > 0 ? "success" : "neutral"}>{stock > 0 ? stock : "Habis"}</Badge>;
        },
      },
      {
        key: "AvgRating",
        label: "Rating",
        render: (r) => {
          const avg = r.AvgRating as number | null | undefined;
          const count = Number(r.RatingCount ?? 0);
          if (avg == null || count === 0) return <span className="text-ink-faint">Belum ada</span>;
          return (
            <div className="flex items-center gap-1.5 text-ink">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{avg}</span>
              <span className="text-xs text-ink-faint">({count})</span>
            </div>
          );
        },
      },
      {
        key: "IsPublished",
        label: "Status",
        render: (r) => (
          <Badge tone={r.IsPublished ? "success" : "neutral"}>{r.IsPublished ? "Dipublikasikan" : "Draft"}</Badge>
        ),
      },
    ],
    fields: [
      { name: "ProductName", label: "Nama Produk", type: "text", required: true, placeholder: "Miniatur Karakter" },
      { name: "ThumbnailPath", label: "Gambar Produk", type: "image" },
      {
        name: "CategoryId",
        label: "Kategori",
        type: "select",
        optionsEndpoint: "product-categories",
        optionLabelKey: "Name",
      },
      { name: "Description", label: "Deskripsi", type: "textarea" },
      {
        name: "MaterialName",
        label: "Bahan",
        type: "select",
        optionsEndpoint: "price-master/materials",
        optionValueKey: "Name",
        optionLabelKey: "Name",
        helpText: "Harga dihitung otomatis: berat × harga per gram bahan ini di Master Harga admin.",
      },
      {
        name: "Weight",
        label: "Berat per Item (gram)",
        type: "number",
        placeholder: "250",
        helpText: "Menentukan harga dan ongkos kirim. Produk baru bisa dipublikasikan setelah bahan & berat diisi dan admin sudah mengisi harganya.",
      },
      {
        name: "ColorType",
        label: "Jenis Warna",
        type: "select",
        required: true,
        options: [
          { value: "SINGLE", label: "Satu warna (single color)" },
          { value: "MULTI", label: "Multicolor" },
        ],
        helpText: "Pilih salah satu: produk dicetak dengan satu warna filamen atau beberapa warna.",
      },
      { name: "Stock", label: "Stok", type: "number", placeholder: "10", defaultValue: 0 },
      ...(isAdmin
        ? [
            {
              name: "SellerId",
              label: "Seller",
              type: "select" as const,
              optionsEndpoint: "users",
              optionLabelKey: "FullName",
              helpText: "Kosongkan untuk menetapkan dirimu sendiri sebagai seller.",
            },
          ]
        : []),
      { name: "IsPublished", label: "Publikasikan produk ini", type: "boolean", defaultValue: false, intBoolean: true },
    ],
  };
}

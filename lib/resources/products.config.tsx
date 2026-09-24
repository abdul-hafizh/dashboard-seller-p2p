import type { ResourceConfig } from "./types";
import { formatCurrency, toPublicAssetUrl } from "./format";
import { Badge } from "@/components/ui/Badge";
import { ImageOff, Star } from "lucide-react";

/** SellerId is only editable by admins — merchants always create products under themselves
 * (the backend defaults SellerId to the authenticated user when it's omitted). */
export function buildProductsConfig(isAdmin: boolean): ResourceConfig {
  return {
    key: "products",
    endpoint: "products",
    title: "Produk",
    description: isAdmin ? "Seluruh produk dari semua merchant." : "Produk yang kamu jual di marketplace.",
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
      { key: "ProductName", label: "Nama Produk" },
      {
        key: "Category",
        label: "Kategori",
        render: (r) => {
          const category = r.Category as { Name?: string } | null | undefined;
          return category?.Name ?? "-";
        },
      },
      { key: "Price", label: "Harga", render: (r) => formatCurrency(r.Price) },
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
      ...(isAdmin
        ? [
            {
              key: "Seller",
              label: "Penjual",
              render: (r: Record<string, unknown>) => {
                const seller = r.Seller as { FullName?: string } | null | undefined;
                return seller?.FullName ?? "-";
              },
            },
          ]
        : []),
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
      { name: "Price", label: "Harga (Rp)", type: "number", placeholder: "150000" },
      { name: "Stock", label: "Stok", type: "number", placeholder: "10", defaultValue: 0 },
      ...(isAdmin
        ? [
            {
              name: "SellerId",
              label: "Penjual",
              type: "select" as const,
              optionsEndpoint: "users",
              optionLabelKey: "FullName",
              helpText: "Kosongkan untuk menetapkan dirimu sendiri sebagai penjual.",
            },
          ]
        : []),
      { name: "IsPublished", label: "Publikasikan produk ini", type: "boolean", defaultValue: false, intBoolean: true },
    ],
  };
}

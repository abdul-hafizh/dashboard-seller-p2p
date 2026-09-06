import type { ResourceConfig } from "./types";
import { formatCurrency } from "./format";
import { Badge } from "@/components/ui/Badge";

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

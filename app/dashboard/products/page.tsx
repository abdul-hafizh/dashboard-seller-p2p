"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { ResourceTable } from "@/components/crud/ResourceTable";
import { buildProductsConfig } from "@/lib/resources/products.config";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { storeName, type MerchantRow } from "@/components/merchants/merchant-ui";

const sellerLabel = (s: MerchantRow) => storeName(s) || s.FullName || s.Email || s.Id;

// The API scopes the list: a merchant only gets their own products, an admin
// gets every merchant's (and can narrow it to one seller).
export default function ProductsPage() {
  const { user, isAdmin, loading } = useAuth();
  const [sellerId, setSellerId] = useState("");
  const [sellerLabelPicked, setSellerLabelPicked] = useState("");
  // What's typed in the seller filter — searched on the server (name, email, phone, store).
  const [sellerQuery, setSellerQuery] = useState("");

  const config = useMemo(() => buildProductsConfig(isAdmin), [isAdmin]);

  const { data: sellers, isLoading: sellersLoading } = useSWR(
    isAdmin ? ["product-seller-options", sellerQuery] : null,
    () => apiFetch<MerchantRow[]>("admin/merchants", { query: { limit: 100, search: sellerQuery || undefined } }),
    { keepPreviousData: true },
  );
  const sellerOptions = [...(sellers?.data ?? [])]
    .map((s) => ({ value: s.Id, label: sellerLabel(s), hint: [s.FullName !== sellerLabel(s) && s.FullName, s.Email].filter(Boolean).join(" · ") }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (loading || !user) return <FullPageSpinner />;

  return (
    <ResourceTable
      config={config}
      extraQuery={isAdmin ? { sellerId: sellerId || undefined } : undefined}
      toolbarExtra={
        isAdmin && (
          <SearchableSelect
            value={sellerId}
            onChange={(id) => {
              setSellerId(id);
              setSellerLabelPicked(sellerOptions.find((o) => o.value === id)?.label ?? "");
            }}
            options={sellerOptions}
            selectedLabel={sellerLabelPicked}
            placeholder="Semua seller"
            searchPlaceholder="Cari nama toko, nama, atau email..."
            onQueryChange={setSellerQuery}
            loading={sellersLoading}
            className="w-full sm:w-56"
            aria-label="Filter seller"
          />
        )
      }
    />
  );
}

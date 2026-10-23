"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { ResourceTable } from "@/components/crud/ResourceTable";
import { buildProductsConfig } from "@/lib/resources/products.config";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { Select } from "@/components/ui/Select";
import type { MerchantRow } from "@/components/merchants/merchant-ui";

// The API scopes the list: a merchant only gets their own products, an admin
// gets every merchant's (and can narrow it to one seller).
export default function ProductsPage() {
  const { user, isAdmin, loading } = useAuth();
  const [sellerId, setSellerId] = useState("");

  const config = useMemo(() => buildProductsConfig(isAdmin), [isAdmin]);

  const { data: sellers } = useSWR(isAdmin ? "product-seller-options" : null, () =>
    apiFetch<MerchantRow[]>("admin/merchants", { query: { limit: 100 } }),
  );
  const sellerOptions = [...(sellers?.data ?? [])].sort((a, b) => String(a.FullName ?? "").localeCompare(String(b.FullName ?? "")));

  if (loading || !user) return <FullPageSpinner />;

  return (
    <ResourceTable
      config={config}
      extraQuery={isAdmin ? { sellerId: sellerId || undefined } : undefined}
      toolbarExtra={
        isAdmin && (
          <Select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="w-full sm:w-52" aria-label="Filter seller">
            <option value="">Semua seller</option>
            {sellerOptions.map((s) => (
              <option key={s.Id} value={s.Id}>
                {s.FullName ?? s.Email ?? s.Id}
              </option>
            ))}
          </Select>
        )
      }
    />
  );
}

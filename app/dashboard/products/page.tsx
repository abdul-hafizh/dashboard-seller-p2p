"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ResourceTable } from "@/components/crud/ResourceTable";
import { buildProductsConfig } from "@/lib/resources/products.config";
import { Checkbox } from "@/components/ui/Checkbox";
import { FullPageSpinner } from "@/components/ui/Spinner";

export default function ProductsPage() {
  const { user, isAdmin, loading } = useAuth();
  const [onlyMine, setOnlyMine] = useState(true);

  const config = useMemo(() => buildProductsConfig(isAdmin), [isAdmin]);

  if (loading || !user) return <FullPageSpinner />;

  const applyOnlyMine = !isAdmin && onlyMine;

  return (
    <ResourceTable
      config={config}
      pageSizeOverride={applyOnlyMine ? 200 : undefined}
      hidePagination={applyOnlyMine}
      filterRows={applyOnlyMine ? (rows) => rows.filter((r) => r.SellerId === user.Id) : undefined}
      toolbarExtra={
        !isAdmin ? (
          <label className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink">
            <Checkbox checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            Hanya produk saya
          </label>
        ) : undefined
      }
    />
  );
}

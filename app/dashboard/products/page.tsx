"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { ResourceTable } from "@/components/crud/ResourceTable";
import { buildProductsConfig } from "@/lib/resources/products.config";
import { FullPageSpinner } from "@/components/ui/Spinner";

// The API scopes the list: a merchant only gets their own products, an admin
// gets every merchant's.
export default function ProductsPage() {
  const { user, isAdmin, loading } = useAuth();

  const config = useMemo(() => buildProductsConfig(isAdmin), [isAdmin]);

  if (loading || !user) return <FullPageSpinner />;

  return <ResourceTable config={config} />;
}

"use client";

import { ResourceTable } from "@/components/crud/ResourceTable";
import { productCategoriesConfig } from "@/lib/resources/product-categories.config";

export default function ProductCategoriesPage() {
  return <ResourceTable config={productCategoriesConfig} />;
}

"use client";

import { ResourceTable } from "@/components/crud/ResourceTable";
import { materialsConfig } from "@/lib/resources/materials.config";

export default function MaterialsPage() {
  return <ResourceTable config={materialsConfig} />;
}

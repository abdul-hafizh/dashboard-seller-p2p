"use client";

import { ResourceTable } from "@/components/crud/ResourceTable";
import { provincesConfig } from "@/lib/resources/provinces.config";

export default function ProvincesPage() {
  return <ResourceTable config={provincesConfig} />;
}

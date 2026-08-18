"use client";

import { ResourceTable } from "@/components/crud/ResourceTable";
import { printersConfig } from "@/lib/resources/printers.config";

export default function PrintersPage() {
  return <ResourceTable config={printersConfig} />;
}

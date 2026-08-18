"use client";

import { ResourceTable } from "@/components/crud/ResourceTable";
import { printerTypesConfig } from "@/lib/resources/printer-types.config";

export default function PrinterTypesPage() {
  return <ResourceTable config={printerTypesConfig} />;
}

"use client";

import { ResourceTable } from "@/components/crud/ResourceTable";
import { printProfilesConfig } from "@/lib/resources/print-profiles.config";

export default function PrintProfilesPage() {
  return <ResourceTable config={printProfilesConfig} />;
}

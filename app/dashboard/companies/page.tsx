"use client";

import { ResourceTable } from "@/components/crud/ResourceTable";
import { companiesConfig } from "@/lib/resources/companies.config";

export default function CompaniesPage() {
  return <ResourceTable config={companiesConfig} />;
}

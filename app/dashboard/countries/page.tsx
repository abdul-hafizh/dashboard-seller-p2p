"use client";

import { ResourceTable } from "@/components/crud/ResourceTable";
import { countriesConfig } from "@/lib/resources/countries.config";

export default function CountriesPage() {
  return <ResourceTable config={countriesConfig} />;
}

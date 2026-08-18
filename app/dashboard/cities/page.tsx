"use client";

import { ResourceTable } from "@/components/crud/ResourceTable";
import { citiesConfig } from "@/lib/resources/cities.config";

export default function CitiesPage() {
  return <ResourceTable config={citiesConfig} />;
}

"use client";

import { ResourceTable } from "@/components/crud/ResourceTable";
import { branchesConfig } from "@/lib/resources/branches.config";

export default function BranchesPage() {
  return <ResourceTable config={branchesConfig} />;
}

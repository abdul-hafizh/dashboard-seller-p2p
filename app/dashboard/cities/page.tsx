"use client";

import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ResourceTable } from "@/components/crud/ResourceTable";
import { citiesConfig } from "@/lib/resources/cities.config";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner } from "@/components/ui/Spinner";

export default function CitiesPage() {
  const { isAdmin, loading } = useAuth();

  if (loading) return <FullPageSpinner />;

  if (!isAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Akses terbatas"
        description="Halaman ini hanya bisa diakses oleh Super Admin."
      />
    );
  }

  return <ResourceTable config={citiesConfig} />;
}

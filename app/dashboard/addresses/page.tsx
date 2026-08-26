"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { ResourceTable } from "@/components/crud/ResourceTable";
import { buildUserAddressesConfig } from "@/lib/resources/user-addresses.config";
import { FullPageSpinner } from "@/components/ui/Spinner";

export default function AddressesPage() {
  const { user, isAdmin, loading } = useAuth();

  const config = useMemo(() => buildUserAddressesConfig(isAdmin), [isAdmin]);

  if (loading || !user) return <FullPageSpinner />;

  return <ResourceTable config={config} />;
}

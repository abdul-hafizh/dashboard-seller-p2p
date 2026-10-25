"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";

export interface UserTier {
  Id: number;
  Code: string;
  Label: string;
  MinSpent: number;
  DiscountPercent: number;
}

/** Master Tier list (shared SWR cache across the dashboard). */
export function useUserTiers() {
  return useSWR("user-tiers", () => apiFetch<UserTier[]>("user-tiers"), { revalidateOnFocus: false });
}

/** A customer's tier (Users.UserLevel code) shown with the admin's label from Master Tier. */
export function TierBadge({ code }: { code: string | null | undefined }) {
  const { data } = useUserTiers();
  if (!code) return null;
  const label = data?.data.find((t) => t.Code.toUpperCase() === code.toUpperCase())?.Label ?? code;
  return <Badge tone="brand">{label}</Badge>;
}

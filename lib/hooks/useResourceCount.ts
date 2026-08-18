"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";

export function useResourceCount(endpoint: string) {
  const { data, isLoading } = useSWR(["count", endpoint], () =>
    apiFetch(endpoint, { query: { page: 1, limit: 1 } }),
  );
  return { count: data?.pagination?.totalItems ?? null, isLoading };
}

"use client";

import useSWR from "swr";
import { apiFetch, type QueryValue } from "@/lib/api-client";

/** Total rows of a list endpoint (e.g. a period's orders via { from, to }). */
export function useResourceCount(endpoint: string, query: Record<string, QueryValue> = {}) {
  const { data, isLoading } = useSWR(["count", endpoint, JSON.stringify(query)], () =>
    apiFetch(endpoint, { query: { page: 1, limit: 1, ...query } }),
  );
  return { count: data?.pagination?.totalItems ?? null, isLoading };
}

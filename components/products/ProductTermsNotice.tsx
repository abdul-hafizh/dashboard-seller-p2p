"use client";

import useSWR from "swr";
import { AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface TermsRow {
  Id: string;
  Title: string;
  Content: string;
}

/**
 * Warning above the product form (tambah & ubah): the active terms from
 * Admin › Syarat & Ketentuan for the product form — e.g. that the weight
 * the seller enters is the seller's own responsibility.
 */
export function ProductTermsNotice() {
  const { data } = useSWR("terms-conditions-product-form", () =>
    apiFetch<TermsRow[]>("terms-conditions/active", { query: { placement: "PRODUCT_FORM" } }),
  );
  const terms = data?.data ?? [];
  if (terms.length === 0) return null;

  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-error/25 bg-error/10 px-3.5 py-3 text-xs text-error">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-2">
        {terms.map((t) => (
          <div key={t.Id} className="space-y-1">
            <p className="font-bold">{t.Title}</p>
            <p className="whitespace-pre-line">{t.Content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { LayoutGrid } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Spinner } from "@/components/ui/Spinner";

type ScopeCode = "MARKET" | "PROMPT" | "PRINT_FILE";

interface ProductScopesResponse {
  MerchantId: string;
  ProductScopes: ScopeCode[];
  Options: { code: ScopeCode; label: string }[];
}

const HINTS: Record<ScopeCode, string> = {
  MARKET: "Produk yang kamu tambahkan di menu Produk tampil di market aplikasi.",
  PROMPT: "Tokomu bisa dipilih customer saat membuat desain 3D via prompt AI.",
  PRINT_FILE: "Tokomu bisa dipilih customer saat mengirim file siap print.",
};

/**
 * "Kategori Produk" — which kinds of order the store serves. A store only
 * appears in the app's store picker for the kategori it serves; without
 * Produk jadi its products are hidden from the market. At least one is required.
 *
 * Without `merchantId` it edits the logged-in merchant's own setting; with
 * it (super admin, merchant detail page) it edits that merchant's.
 */
export function ProductScopesCard({ merchantId }: { merchantId?: string }) {
  const path = merchantId ? `merchants/${merchantId}/product-scopes` : "merchants/me/product-scopes";
  const readPath = merchantId ? `${path}/manage` : path;
  const { data, isLoading, mutate } = useSWR(readPath, () => apiFetch<ProductScopesResponse>(readPath));
  const current = data?.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="size-4" /> Kategori Produk
        </CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading || !current ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-5" />
          </div>
        ) : (
          <ProductScopesEditor
            key={current.ProductScopes.join(",")}
            options={current.Options}
            initial={current.ProductScopes}
            onSave={async (scopes) => {
              const res = await apiFetch<ProductScopesResponse>(path, { method: "PUT", json: { ProductScopes: scopes } });
              await mutate(res, { revalidate: false });
            }}
          />
        )}
      </CardBody>
    </Card>
  );
}

function ProductScopesEditor({
  options,
  initial,
  onSave,
}: {
  options: ProductScopesResponse["Options"];
  initial: ScopeCode[];
  onSave: (scopes: ScopeCode[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<ScopeCode[]>(initial);
  const [saving, setSaving] = useState(false);
  const dirty = selected.slice().sort().join() !== initial.slice().sort().join();

  const toggle = (code: ScopeCode, on: boolean) =>
    setSelected((s) => (on ? [...s, code] : s.filter((c) => c !== code)));

  const save = async () => {
    if (selected.length === 0) {
      toast.error("Pilih minimal satu kategori produk.");
      return;
    }
    setSaving(true);
    try {
      await onSave(options.map((o) => o.code).filter((c) => selected.includes(c)));
      toast.success("Kategori produk disimpan");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan kategori produk.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Pilih jenis pesanan yang dilayani tokomu (wajib minimal satu). Customer hanya bisa memilih tokomu untuk
        kategori yang dicentang.
      </p>
      <div className="space-y-2">
        {options.map((o) => (
          <label
            key={o.code}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:bg-surface-muted"
          >
            <Checkbox
              className="mt-0.5"
              checked={selected.includes(o.code)}
              onChange={(e) => toggle(o.code, e.target.checked)}
            />
            <span>
              <span className="block text-sm font-semibold text-ink">{o.label}</span>
              <span className="block text-xs text-ink-faint">{HINTS[o.code]}</span>
            </span>
          </label>
        ))}
      </div>
      {selected.length === 0 && <p className="text-xs text-error">Pilih minimal satu kategori produk.</p>}
      {!selected.includes("MARKET") && initial.includes("MARKET") && (
        <p className="rounded-xl border border-brand-orange/30 bg-brand-orange/10 p-3 text-xs text-ink-soft">
          Tanpa Produk jadi, semua produk di menu Produk disembunyikan dari market (datanya tetap tersimpan) dan
          kamu tidak bisa menambah produk baru.
        </p>
      )}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || !dirty || selected.length === 0}>
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </div>
  );
}

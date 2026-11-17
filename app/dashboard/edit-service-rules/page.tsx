"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { PencilRuler, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner, Spinner } from "@/components/ui/Spinner";

type Category = "PROMPT" | "PRINT_FILE";
type ColorType = "SINGLE" | "MULTI";
type Rules = Record<Category, Record<ColorType, boolean>>;

const ENDPOINT = "system-settings/edit-service-rules";

const CATEGORIES: { key: Category; label: string; hint: string }[] = [
  { key: "PROMPT", label: "Produk via prompt", hint: "Desain 3D dari prompt AI — jenis warna dipilih customer." },
  { key: "PRINT_FILE", label: "Produk siap print", hint: "File dari customer — file .3mf dihitung multicolor, lainnya satu warna." },
];
const COLORS: { key: ColorType; label: string }[] = [
  { key: "SINGLE", label: "Satu warna" },
  { key: "MULTI", label: "Multicolor" },
];

/** Admin › Aturan Jasa Edit: which kategori + colour type require the customer to tick "Gunakan jasa edit". */
export default function EditServiceRulesPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { data, isLoading, mutate } = useSWR(isAdmin ? ENDPOINT : null, () => apiFetch<Rules>(ENDPOINT));
  const [rules, setRules] = useState<Rules | null>(null);
  const [saving, setSaving] = useState(false);

  // Load the saved rules into the form whenever they come back from the API.
  const saved = data?.data;
  const [synced, setSynced] = useState<Rules | undefined>(undefined);
  if (saved && saved !== synced) {
    setSynced(saved);
    setRules(saved);
  }

  if (authLoading) return <FullPageSpinner />;
  if (!isAdmin) {
    return <EmptyState icon={ShieldAlert} title="Akses terbatas" description="Halaman ini hanya bisa diakses oleh Super Admin." />;
  }

  const toggle = (c: Category, k: ColorType, on: boolean) =>
    setRules((r) => (r ? { ...r, [c]: { ...r[c], [k]: on } } : r));

  const save = async () => {
    if (!rules) return;
    setSaving(true);
    try {
      const res = await apiFetch<Rules>(ENDPOINT, { method: "PUT", json: rules });
      toast.success("Aturan jasa edit disimpan.");
      mutate(res, { revalidate: false });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan aturan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Aturan Jasa Edit</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Tentukan kapan customer <b>wajib</b> mencentang &quot;Gunakan jasa edit&quot; di aplikasi. Kombinasi yang dicentang tidak
          bisa dilanjutkan tanpa jasa edit; yang tidak dicentang tetap opsional (customer yang memilih). Berlaku untuk pesanan
          baru, dan juga diperiksa di server.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PencilRuler className="size-4" /> Jasa Edit Wajib
          </CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          {isLoading || !rules ? (
            <div className="flex justify-center py-6">
              <Spinner className="size-6" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full max-w-2xl text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                      <th className="px-4 py-3">Kategori Produk</th>
                      {COLORS.map((c) => (
                        <th key={c.key} className="whitespace-nowrap px-4 py-3 text-center">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIES.map((cat) => (
                      <tr key={cat.key} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{cat.label}</p>
                          <p className="text-xs text-ink-faint">{cat.hint}</p>
                        </td>
                        {COLORS.map((c) => (
                          <td key={c.key} className="px-4 py-3 text-center">
                            <label className="inline-flex cursor-pointer items-center gap-2">
                              <Checkbox
                                checked={rules[cat.key][c.key]}
                                onChange={(e) => toggle(cat.key, c.key, e.target.checked)}
                              />
                              <span className="text-xs text-ink-soft">{rules[cat.key][c.key] ? "Wajib" : "Opsional"}</span>
                            </label>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <Button loading={saving} onClick={save}>
                  Simpan Aturan
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

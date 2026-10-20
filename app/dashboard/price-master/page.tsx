"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Calculator, Plus, Tags, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formatCurrency } from "@/lib/resources/format";

interface PriceMaster {
  Materials: string[];
  Tiers: { MinGrams: number; MaxGrams: number | null }[];
  Prices: Record<string, (number | null)[]>;
}

interface MaterialColumn {
  key: number;
  name: string;
  prices: string[];
}

interface EditorState {
  /** Upper bound of each range; null on the last one = "and up". */
  maxes: (number | null)[];
  columns: MaterialColumn[];
}

let nextKey = 1;

function toEditor(master: PriceMaster): EditorState {
  return {
    maxes: master.Tiers.map((t) => t.MaxGrams),
    columns: master.Materials.map((name) => ({
      key: nextKey++,
      name,
      prices: master.Tiers.map((_, i) => {
        const v = master.Prices[name]?.[i];
        return v === null || v === undefined ? "" : String(v);
      }),
    })),
  };
}

/** Range lower bounds follow from the previous range's upper bound. */
function minsOf(maxes: (number | null)[]) {
  return maxes.map((_, i) => (i === 0 ? 1 : (maxes[i - 1] ?? 0) + 1));
}

function toPayload(state: EditorState): PriceMaster {
  const mins = minsOf(state.maxes);
  return {
    Materials: state.columns.map((c) => c.name.trim()),
    Tiers: state.maxes.map((max, i) => ({ MinGrams: mins[i], MaxGrams: i === state.maxes.length - 1 ? null : max })),
    Prices: Object.fromEntries(
      state.columns.map((c) => [c.name.trim(), c.prices.map((p) => (p.trim() === "" ? null : Number(p)))]),
    ),
  };
}

/**
 * Master Harga — the super admin sets the price per gram for each printing
 * material by weight range (ranges and materials are editable). AI designs
 * in the app are priced from this: weight × the per-gram price of the range
 * the weight falls into. Stores' own material prices are not used.
 */
export default function PriceMasterPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading, mutate } = useSWR(isAdmin ? "price-master" : null, () => apiFetch<PriceMaster>("price-master"));

  if (!isAdmin) {
    return (
      <Card>
        <EmptyState icon={Tags} title="Khusus admin" description="Master harga hanya bisa diatur oleh admin." />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="p-4">
          <h1 className="text-base font-extrabold text-ink">Master Harga</h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            Harga <b>per gram</b> untuk setiap bahan berdasarkan rentang berat. Harga desain AI di aplikasi = berat × harga per gram
            sesuai rentang beratnya. Rentang berat dan bahan bisa diubah kapan saja.
          </p>
        </div>
      </Card>
      {isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : (
        <PriceMasterEditor
          key={JSON.stringify(data.data)}
          initial={data.data}
          onSaved={(saved) => mutate({ ...data, data: saved }, { revalidate: false })}
        />
      )}
    </div>
  );
}

function PriceMasterEditor({ initial, onSaved }: { initial: PriceMaster; onSaved: (m: PriceMaster) => void }) {
  const [state, setState] = useState<EditorState>(() => toEditor(initial));
  const [saving, setSaving] = useState(false);
  const mins = minsOf(state.maxes);
  const lastIndex = state.maxes.length - 1;

  const setMax = (i: number, value: string) =>
    setState((s) => ({ ...s, maxes: s.maxes.map((m, j) => (j === i ? (value === "" ? null : Number(value)) : m)) }));

  const setPrice = (key: number, i: number, value: string) =>
    setState((s) => ({
      ...s,
      columns: s.columns.map((c) => (c.key === key ? { ...c, prices: c.prices.map((p, j) => (j === i ? value : p)) } : c)),
    }));

  const addTier = () =>
    setState((s) => {
      // Split the open-ended last range: it gets an upper bound, a new
      // "and up" range follows it.
      const lastMin = minsOf(s.maxes)[s.maxes.length - 1];
      const maxes = [...s.maxes.slice(0, -1), lastMin + 99, null];
      return { maxes, columns: s.columns.map((c) => ({ ...c, prices: [...c.prices, ""] })) };
    });

  const removeTier = (i: number) =>
    setState((s) => {
      if (s.maxes.length <= 1) return s;
      const maxes = s.maxes.filter((_, j) => j !== i);
      maxes[maxes.length - 1] = null;
      return { maxes, columns: s.columns.map((c) => ({ ...c, prices: c.prices.filter((_, j) => j !== i) })) };
    });

  const addMaterial = () =>
    setState((s) => ({
      ...s,
      columns: [...s.columns, { key: nextKey++, name: "", prices: s.maxes.map(() => "") }],
    }));

  const removeMaterial = (key: number) =>
    setState((s) => (s.columns.length <= 1 ? s : { ...s, columns: s.columns.filter((c) => c.key !== key) }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiFetch<PriceMaster>("price-master", { method: "PUT", json: toPayload(state) });
      toast.success("Master harga disimpan");
      onSaved(res.data);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan master harga");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Tags className="size-4" /> Harga per Gram
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" type="button" onClick={addTier}>
              <Plus className="size-4" /> Rentang Berat
            </Button>
            <Button variant="outline" size="sm" type="button" onClick={addMaterial}>
              <Plus className="size-4" /> Bahan
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold text-ink-soft">
                  <th className="whitespace-nowrap px-3 py-3">Rentang Berat (gram)</th>
                  {state.columns.map((c) => (
                    <th key={c.key} className="min-w-40 px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Input
                          value={c.name}
                          maxLength={30}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              columns: s.columns.map((x) => (x.key === c.key ? { ...x, name: e.target.value } : x)),
                            }))
                          }
                          placeholder="Nama bahan"
                          aria-label="Nama bahan"
                          className="h-9 font-bold"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Hapus bahan ${c.name}`}
                          disabled={state.columns.length <= 1}
                          onClick={() => removeMaterial(c.key)}
                        >
                          <Trash2 className="size-4 text-error" />
                        </Button>
                      </div>
                    </th>
                  ))}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {state.maxes.map((max, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-14 text-right font-semibold text-ink">{mins[i]}</span>
                        <span className="text-ink-faint">–</span>
                        {i === lastIndex ? (
                          <span className="font-semibold text-ink">ke atas</span>
                        ) : (
                          <Input
                            type="number"
                            min={mins[i]}
                            value={max ?? ""}
                            onChange={(e) => setMax(i, e.target.value)}
                            aria-label={`Batas atas rentang ${i + 1}`}
                            className="h-9 w-24"
                          />
                        )}
                      </div>
                    </td>
                    {state.columns.map((c) => (
                      <td key={c.key} className="px-3 py-2">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">Rp</span>
                          <Input
                            type="number"
                            min={0}
                            value={c.prices[i] ?? ""}
                            onChange={(e) => setPrice(c.key, i, e.target.value)}
                            placeholder="belum diatur"
                            aria-label={`Harga per gram ${c.name} rentang ${i + 1}`}
                            className="h-9 pl-9"
                          />
                        </div>
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Hapus rentang ${i + 1}`}
                        disabled={state.maxes.length <= 1}
                        onClick={() => removeTier(i)}
                      >
                        <Trash2 className="size-4 text-error" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="list-disc space-y-1 pl-5 text-xs text-ink-soft">
            <li>Isi harga per gram. Contoh: PLA 1–100 g = Rp2.000 → desain PLA 30 g = Rp60.000.</li>
            <li>Kosongkan harga jika bahan itu belum dijual pada rentang tersebut; customer tidak bisa memilihnya.</li>
            <li>
              Nama bahan dicocokkan dengan nama material milik toko (tidak membedakan huruf besar/kecil). Toko harus punya material
              dengan nama yang sama agar bisa dipilih customer.
            </li>
          </ul>

          <div className="flex justify-end">
            <Button type="button" onClick={save} loading={saving}>
              Simpan Master Harga
            </Button>
          </div>
        </CardBody>
      </Card>

      <PriceSimulator master={toPayload(state)} />
    </>
  );
}

/** Quick check of what a design would cost with the prices on screen. */
function PriceSimulator({ master }: { master: PriceMaster }) {
  const [grams, setGrams] = useState("30");
  const [material, setMaterial] = useState(master.Materials[0] ?? "");
  const chosen = master.Materials.includes(material) ? material : master.Materials[0] ?? "";

  const result = useMemo(() => {
    const weight = Number(grams);
    if (!Number.isFinite(weight) || weight <= 0 || !chosen) return null;
    const rounded = Math.max(1, Math.ceil(weight));
    const index = master.Tiers.findIndex((t) => rounded >= t.MinGrams && (t.MaxGrams === null || rounded <= t.MaxGrams));
    if (index < 0) return { error: "Berat di luar rentang" };
    const perGram = master.Prices[chosen]?.[index];
    if (perGram === null || perGram === undefined || Number.isNaN(perGram)) return { error: "Harga belum diatur untuk rentang ini" };
    const tier = master.Tiers[index];
    return { perGram, total: Math.round(perGram * weight), tier };
  }, [grams, chosen, master]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="size-4" /> Simulasi Harga
        </CardTitle>
      </CardHeader>
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <div>
            <FieldLabel htmlFor="sim-material">Bahan</FieldLabel>
            <Select id="sim-material" value={chosen} onChange={(e) => setMaterial(e.target.value)}>
              {master.Materials.map((m) => (
                <option key={m} value={m}>
                  {m || "(tanpa nama)"}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="sim-grams">Berat (gram)</FieldLabel>
            <Input id="sim-grams" type="number" min={1} value={grams} onChange={(e) => setGrams(e.target.value)} />
          </div>
          <div className="rounded-xl bg-surface-muted/60 px-4 py-2.5">
            {!result ? (
              <p className="text-sm text-ink-faint">Isi berat</p>
            ) : "error" in result ? (
              <p className="text-sm text-brand-orange-deep">{result.error}</p>
            ) : (
              <>
                <p className="text-lg font-extrabold text-ink">{formatCurrency(result.total)}</p>
                <p className="text-[11px] text-ink-soft">
                  {formatCurrency(result.perGram)}/g · rentang {result.tier.MinGrams}–{result.tier.MaxGrams ?? "ke atas"} g
                </p>
              </>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

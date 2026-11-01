"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { PlayCircle, ShieldAlert, Star } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner, Spinner } from "@/components/ui/Spinner";
import { formatCurrency, formatDateTime } from "@/lib/resources/format";

type Unit = "DAY" | "MONTH";

interface AwaitingOrder {
  Id: string;
  OrderNumber: string | null;
  TotalAmount: number | null;
  IsCompleted: boolean;
  StartAt: string | null;
  CustomerName: string | null;
  MerchantName: string | null;
  AutoRatingAt: string | null;
  Overdue: boolean;
}

interface AutoRatingConfig {
  Enabled: boolean;
  Amount: number;
  Unit: Unit;
  Rating: number;
  Comment: string | null;
}

interface AutoRatingData {
  config: AutoRatingConfig;
  limits: Record<Unit, { min: number; max: number }>;
  awaiting: AwaitingOrder[];
}

const ENDPOINT = "system-settings/order-auto-rating";
const UNIT_LABEL: Record<Unit, string> = { DAY: "hari", MONTH: "bulan" };

/** Admin › Rating Otomatis: orders the customer never rated get the default rating after a set duration. */
export default function OrderAutoRatingPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { data, isLoading, mutate } = useSWR(isAdmin ? ENDPOINT : null, () => apiFetch<AutoRatingData>(ENDPOINT));
  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<Unit>("MONTH");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  // Load the saved values into the form whenever they come back from the API.
  const config = data?.data.config;
  const [synced, setSynced] = useState<typeof config>(undefined);
  if (config && config !== synced) {
    setSynced(config);
    setEnabled(config.Enabled);
    setAmount(String(config.Amount));
    setUnit(config.Unit);
    setRating(config.Rating);
    setComment(config.Comment ?? "");
  }

  if (authLoading) return <FullPageSpinner />;
  if (!isAdmin) {
    return <EmptyState icon={ShieldAlert} title="Akses terbatas" description="Halaman ini hanya bisa diakses oleh Super Admin." />;
  }

  const limits = data?.data.limits ?? { DAY: { min: 1, max: 365 }, MONTH: { min: 1, max: 12 } };
  const awaiting = data?.data.awaiting ?? [];
  const overdue = awaiting.filter((o) => o.Overdue).length;

  const save = async () => {
    const n = Number(amount);
    const { min, max } = limits[unit];
    if (!Number.isInteger(n) || n < min || n > max) {
      toast.error(`Durasi harus bilangan bulat ${min}–${max} ${UNIT_LABEL[unit]}.`);
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<AutoRatingData>(ENDPOINT, {
        method: "PUT",
        json: { Enabled: enabled, Amount: n, Unit: unit, Rating: rating, Comment: comment.trim() || null },
      });
      toast.success("Pengaturan rating otomatis disimpan.");
      mutate(res, { revalidate: false });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await apiFetch<AutoRatingData & { rated: number }>(`${ENDPOINT}/run`, { method: "POST" });
      toast.success(res.message || "Selesai.");
      mutate();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menjalankan.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Rating Otomatis</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Pesanan yang <b>belum dinilai</b> customer akan diberi rating otomatis untuk seller setelah durasi di bawah. Durasi
          dihitung sejak pesanan <b>selesai</b>; bila customer juga belum menekan &quot;Pesanan Diterima&quot;, dihitung sejak
          pesanan <b>dikirim</b> dan pesanan itu sekalian diselesaikan. Setelah itu customer tidak bisa memberi rating lagi.
          Pesanan yang dibatalkan atau sedang dalam pengembalian tidak ikut. Sistem memeriksa setiap jam.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="size-4" /> Pengaturan
          </CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          {isLoading && !data ? (
            <div className="flex justify-center py-6">
              <Spinner className="size-6" />
            </div>
          ) : (
            <>
              <label className="flex max-w-md items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5">
                <Checkbox checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                <span className="text-sm font-medium text-ink">Aktifkan rating otomatis</span>
              </label>
              <div className="flex flex-col gap-2">
                <FieldLabel required>Rating otomatis setelah</FieldLabel>
                <p className="text-xs text-ink-soft">
                  Contoh: 3 bulan → pesanan yang selesai tanggal 1 Januari dan belum dinilai, otomatis dinilai tanggal 1 April.
                  Maksimal {limits.DAY.max} hari atau {limits.MONTH.max} bulan.
                </p>
                <div className="flex max-w-sm gap-2">
                  <Input
                    type="number"
                    min={limits[unit].min}
                    max={limits[unit].max}
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <Select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} aria-label="Satuan durasi">
                    <option value="DAY">Hari</option>
                    <option value="MONTH">Bulan</option>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel required>Rating yang diberikan</FieldLabel>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} bintang`} className="p-0.5">
                      <Star className={`size-7 ${n <= rating ? "fill-brand-orange text-brand-orange" : "text-ink-faint"}`} />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-semibold text-ink">{rating}/5</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel>Komentar (opsional)</FieldLabel>
                <Input
                  value={comment}
                  maxLength={255}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Rating otomatis oleh sistem"
                  className="max-w-md"
                />
              </div>
              <div>
                <Button loading={saving} onClick={save}>
                  Simpan Pengaturan
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-ink">Belum Dinilai Customer</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              {awaiting.length} pesanan belum dinilai
              {config?.Enabled && overdue > 0 ? ` · ${overdue} sudah melewati batas waktu` : ""}.
            </p>
          </div>
          {config?.Enabled && overdue > 0 && (
            <Button variant="outline" size="sm" loading={running} onClick={runNow}>
              <PlayCircle className="size-4" /> Beri Rating Sekarang
            </Button>
          )}
        </div>
        {awaiting.length === 0 ? (
          <EmptyState icon={Star} title="Tidak ada pesanan menunggu" description="Semua pesanan sudah dinilai." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="whitespace-nowrap px-4 py-3">Pesanan</th>
                  <th className="whitespace-nowrap px-4 py-3">Customer</th>
                  <th className="whitespace-nowrap px-4 py-3">Seller</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Total</th>
                  <th className="whitespace-nowrap px-4 py-3">Dihitung Sejak</th>
                  <th className="whitespace-nowrap px-4 py-3">Rating Otomatis</th>
                </tr>
              </thead>
              <tbody>
                {awaiting.map((o) => (
                  <tr key={o.Id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link href={`/dashboard/orders/${o.Id}`} className="font-semibold text-brand-purple hover:underline">
                        #{o.OrderNumber || o.Id.slice(0, 8)}
                      </Link>
                      <p className="text-xs text-ink-faint">{o.IsCompleted ? "Selesai, belum dinilai" : "Dikirim, belum dikonfirmasi"}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink">{o.CustomerName || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink">{o.MerchantName || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-ink">{formatCurrency(o.TotalAmount)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink">{o.StartAt ? formatDateTime(o.StartAt) : "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {!o.AutoRatingAt ? (
                        <Badge tone="neutral">Nonaktif</Badge>
                      ) : o.Overdue ? (
                        <Badge tone="warning">Lewat batas · diproses</Badge>
                      ) : (
                        <span className="text-ink">{formatDateTime(o.AutoRatingAt)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

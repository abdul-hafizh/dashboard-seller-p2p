"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { Hourglass, Send, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner, Spinner } from "@/components/ui/Spinner";
import { formatCurrency, formatDateTime } from "@/lib/resources/format";

interface AwaitingOrder {
  Id: string;
  OrderNumber: string | null;
  TotalAmount: number | null;
  ShipmentType: string | null;
  CourierCompany: string | null;
  CourierServiceName: string | null;
  PaidAt: string;
  ShipReminderLevel: number;
  CustomerName: string | null;
  MerchantName: string | null;
  ShipDeadlineAt: string | null;
  Overdue: boolean;
}

interface ShipDeadlineData {
  config: { Enabled: boolean; Days: number };
  limits: { minDays: number; maxDays: number };
  awaiting: AwaitingOrder[];
}

const ENDPOINT = "system-settings/order-ship-deadline";

/** Admin › Batas Kirim Seller: sellers are reminded on Telegram to ship a paid order within N days. */
export default function OrderShipDeadlinePage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { data, isLoading, mutate } = useSWR(isAdmin ? ENDPOINT : null, () => apiFetch<ShipDeadlineData>(ENDPOINT));
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  // Load the saved values into the form whenever they come back from the API.
  const config = data?.data.config;
  const [synced, setSynced] = useState<typeof config>(undefined);
  if (config && config !== synced) {
    setSynced(config);
    setEnabled(config.Enabled);
    setDays(String(config.Days));
  }

  if (authLoading) return <FullPageSpinner />;
  if (!isAdmin) {
    return <EmptyState icon={ShieldAlert} title="Akses terbatas" description="Halaman ini hanya bisa diakses oleh Super Admin." />;
  }

  const limits = data?.data.limits ?? { minDays: 1, maxDays: 30 };
  const awaiting = data?.data.awaiting ?? [];
  const overdue = awaiting.filter((o) => o.Overdue).length;

  const save = async () => {
    const n = Number(days);
    if (!Number.isInteger(n) || n < limits.minDays || n > limits.maxDays) {
      toast.error(`Jumlah hari harus bilangan bulat ${limits.minDays}–${limits.maxDays}.`);
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<ShipDeadlineData>(ENDPOINT, { method: "PUT", json: { Enabled: enabled, Days: n } });
      toast.success("Pengaturan batas kirim disimpan.");
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
      const res = await apiFetch<ShipDeadlineData & { sent: number }>(`${ENDPOINT}/run`, { method: "POST" });
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
        <h1 className="text-xl font-extrabold text-ink">Batas Kirim Seller</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Setelah customer membayar, seller harus <b>memesan kurir</b> (atau menandai pesanan <b>siap diambil</b> untuk ambil di
          toko) dalam jumlah hari di bawah. Seller mendapat pengingat lewat <b>Telegram</b> dan notifikasi saat batas waktu
          tinggal sebentar, lalu sekali lagi bila sudah terlewat. Pesanan tidak dibatalkan otomatis. Sistem memeriksa setiap jam.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hourglass className="size-4" /> Pengaturan
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
                <span className="text-sm font-medium text-ink">Aktifkan batas kirim seller</span>
              </label>
              <div className="flex flex-col gap-2">
                <FieldLabel required>Batas kirim setelah dibayar (hari)</FieldLabel>
                <p className="text-xs text-ink-soft">
                  Contoh: 2 → pesanan yang dibayar tanggal 1 jam 10.00 harus dikirim sebelum tanggal 3 jam 10.00. Pengingat
                  pertama dikirim 24 jam sebelum batas (atau di tengah waktu bila batasnya 1 hari). Minimal {limits.minDays},
                  maksimal {limits.maxDays} hari.
                </p>
                <Input
                  type="number"
                  min={limits.minDays}
                  max={limits.maxDays}
                  step="1"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="max-w-xs"
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
            <h2 className="text-base font-extrabold text-ink">Menunggu Dikirim Seller</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              {awaiting.length} pesanan sudah dibayar tapi kurirnya belum dipesan / belum siap diambil
              {config?.Enabled && overdue > 0 ? ` · ${overdue} sudah melewati batas kirim` : ""}.
            </p>
          </div>
          {config?.Enabled && awaiting.length > 0 && (
            <Button variant="outline" size="sm" loading={running} onClick={runNow}>
              <Send className="size-4" /> Kirim Pengingat Sekarang
            </Button>
          )}
        </div>
        {awaiting.length === 0 ? (
          <EmptyState icon={Hourglass} title="Tidak ada pesanan menunggu" description="Semua pesanan yang dibayar sudah diproses seller." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="whitespace-nowrap px-4 py-3">Pesanan</th>
                  <th className="whitespace-nowrap px-4 py-3">Customer</th>
                  <th className="whitespace-nowrap px-4 py-3">Seller</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Total</th>
                  <th className="whitespace-nowrap px-4 py-3">Dibayar</th>
                  <th className="whitespace-nowrap px-4 py-3">Batas Kirim</th>
                  <th className="whitespace-nowrap px-4 py-3">Pengingat</th>
                </tr>
              </thead>
              <tbody>
                {awaiting.map((o) => (
                  <tr key={o.Id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link href={`/dashboard/orders/${o.Id}`} className="font-semibold text-brand-purple hover:underline">
                        #{o.OrderNumber || o.Id.slice(0, 8)}
                      </Link>
                      <p className="text-xs text-ink-faint">
                        {o.ShipmentType === "PICKUP"
                          ? "Ambil di toko"
                          : [o.CourierCompany?.toUpperCase(), o.CourierServiceName].filter(Boolean).join(" ") || "Kurir"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink">{o.CustomerName || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink">{o.MerchantName || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-ink">{formatCurrency(o.TotalAmount)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink">{formatDateTime(o.PaidAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {!o.ShipDeadlineAt ? (
                        <Badge tone="neutral">Nonaktif</Badge>
                      ) : o.Overdue ? (
                        <Badge tone="error">Lewat batas · {formatDateTime(o.ShipDeadlineAt)}</Badge>
                      ) : (
                        <span className="text-ink">{formatDateTime(o.ShipDeadlineAt)}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">
                      {Number(o.ShipReminderLevel) >= 2 ? "Lewat batas" : Number(o.ShipReminderLevel) === 1 ? "Segera habis" : "-"}
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

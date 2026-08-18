"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { ArrowLeft, Package, History, FileText } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatCurrency, formatDate } from "@/lib/resources/format";

interface OrderStatus {
  Id: number;
  Name: string;
}

interface OrderItem {
  Id: string;
  Quantity: number | null;
  UnitPrice: number | null;
  MaterialId: number | null;
  PrintProfileId: number | null;
}

interface StatusHistoryEntry {
  Id: number;
  StatusId: number;
  Remarks: string | null;
  CreatedAt: string | null;
}

interface OrderDetail {
  Id: string;
  OrderNumber: string | null;
  CustomerId: string | null;
  StatusId: number | null;
  TotalAmount: number | null;
  Notes: string | null;
  Rating: number | null;
  RatingNotes: string | null;
  CreatedAt: string | null;
  Status: OrderStatus | null;
  Items?: OrderItem[];
  StatusHistories?: StatusHistoryEntry[];
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params.id;

  const { data, isLoading, mutate } = useSWR(["orders", orderId], () =>
    apiFetch<OrderDetail>(`orders/${orderId}`),
  );
  const { data: statusesData } = useSWR(["order-statuses", "all"], () =>
    apiFetch<OrderStatus[]>("order-statuses", { query: { limit: 200 } }),
  );

  const [nextStatusId, setNextStatusId] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  if (isLoading || !data) return <FullPageSpinner />;

  const order = data.data;
  const statuses = statusesData?.data ?? [];
  const statusName = (id: number | null) => statuses.find((s) => s.Id === id)?.Name ?? `#${id}`;

  const updateStatus = async () => {
    if (!nextStatusId) return;
    setUpdating(true);
    try {
      await apiFetch(`orders/${orderId}`, { method: "PUT", json: { StatusId: Number(nextStatusId) } });
      toast.success("Status pesanan berhasil diperbarui");
      setNextStatusId("");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal memperbarui status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Kembali">
          <ArrowLeft className="size-4.5" />
        </Button>
        <div>
          <h1 className="text-lg font-extrabold text-ink">{order.OrderNumber ?? `Pesanan #${order.Id.slice(0, 8)}`}</h1>
          <p className="text-xs text-ink-soft">Dibuat {formatDate(order.CreatedAt)}</p>
        </div>
        <Badge tone="info" className="ml-auto">
          {order.Status?.Name ?? "-"}
        </Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Pesanan</CardTitle>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-ink-soft">Total</p>
                <p className="mt-0.5 font-bold text-ink">{formatCurrency(order.TotalAmount)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-soft">ID Pelanggan</p>
                <p className="mt-0.5 font-mono text-xs text-ink">{order.CustomerId ?? "-"}</p>
              </div>
              {order.Rating != null && (
                <div>
                  <p className="text-xs font-semibold text-ink-soft">Rating</p>
                  <p className="mt-0.5 text-ink">{order.Rating} / 5</p>
                </div>
              )}
              {order.Notes && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-ink-soft">Catatan</p>
                  <p className="mt-0.5 text-ink">{order.Notes}</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-4" /> Item Pesanan
              </CardTitle>
            </CardHeader>
            {order.Items && order.Items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                      <th className="px-4 py-2.5">Qty</th>
                      <th className="px-4 py-2.5">Harga Satuan</th>
                      <th className="px-4 py-2.5">Material</th>
                      <th className="px-4 py-2.5">Profil Cetak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.Items.map((item) => (
                      <tr key={item.Id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 text-ink">{item.Quantity ?? "-"}</td>
                        <td className="px-4 py-2.5 text-ink">{formatCurrency(item.UnitPrice)}</td>
                        <td className="px-4 py-2.5 text-ink-soft">{item.MaterialId ?? "-"}</td>
                        <td className="px-4 py-2.5 text-ink-soft">{item.PrintProfileId ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <CardBody>
                <p className="text-sm text-ink-soft">Tidak ada item.</p>
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4" /> Riwayat Status
              </CardTitle>
            </CardHeader>
            <CardBody>
              {order.StatusHistories && order.StatusHistories.length > 0 ? (
                <ol className="flex flex-col gap-3">
                  {order.StatusHistories.map((h) => (
                    <li key={h.Id} className="flex gap-3 text-sm">
                      <div className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-purple" />
                      <div>
                        <p className="font-semibold text-ink">{statusName(h.StatusId)}</p>
                        {h.Remarks && <p className="text-ink-soft">{h.Remarks}</p>}
                        <p className="text-xs text-ink-faint">{formatDate(h.CreatedAt)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink-soft">Belum ada riwayat perubahan status.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4" /> Ubah Status
              </CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              <Select value={nextStatusId} onChange={(e) => setNextStatusId(e.target.value)}>
                <option value="">Pilih status baru...</option>
                {statuses.map((s) => (
                  <option key={s.Id} value={s.Id}>
                    {s.Name}
                  </option>
                ))}
              </Select>
              <Button onClick={updateStatus} loading={updating} disabled={!nextStatusId}>
                Perbarui Status
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

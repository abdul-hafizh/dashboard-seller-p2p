"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { PackageSearch, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner } from "@/components/ui/Spinner";

interface QueueItem {
  Id: string;
  QueueNumber: number;
  QueueType: "ONLINE" | "OFFLINE";
  Status: string;
  CustomerName: string | null;
  ItemName: string | null;
  OrderNumber: string | null;
  EstimatedDurationMinutes: number | null;
  EstimatedFinishAt: string | null;
}

interface QueueResponse {
  summary: { totalOfflineWaiting: number; totalOnlineInProgress: number };
  offlineWaitingQueue: QueueItem[];
  onlineInProgressQueue: QueueItem[];
  data: QueueItem[];
}

// GET /print-queues returns summary/offlineWaitingQueue/onlineInProgressQueue
// as siblings of the standard `data` envelope field, not nested inside it —
// apiFetch only types `data`, so the extra fields are read via this cast.
type QueueEnvelopeExtra = QueueResponse;

const STATUS_TONE: Record<string, "neutral" | "success" | "info" | "warning"> = {
  WAITING: "neutral",
  IN_PROGRESS: "info",
  DONE: "success",
  CANCELLED: "warning",
};

function formatEta(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function PrintQueuePage() {
  const { user, loading } = useAuth();
  const branchId = user?.BranchId ?? null;
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ CustomerName: "", ItemName: "", WeightGrams: "" });
  const [submitting, setSubmitting] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<QueueResponse>(
    branchId ? ["print-queues", branchId] : null,
    async () => {
      const res = await apiFetch<QueueItem[]>("print-queues", { query: { branchId } });
      return res as unknown as QueueEnvelopeExtra;
    },
    { refreshInterval: 15000 },
  );

  const advanceStatus = useCallback(
    async (id: string, status: string) => {
      setActingOn(id);
      try {
        await apiFetch(`print-queues/${id}/status`, { method: "PATCH", json: { Status: status } });
        toast.success("Status antrian diperbarui");
        await mutate();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Gagal memperbarui status");
      } finally {
        setActingOn(null);
      }
    },
    [mutate],
  );

  const handleAddOffline = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("print-queues", {
        method: "POST",
        json: {
          QueueType: "OFFLINE",
          CustomerName: form.CustomerName || undefined,
          ItemName: form.ItemName || undefined,
          WeightGrams: form.WeightGrams ? Number(form.WeightGrams) : undefined,
        },
      });
      toast.success("Antrian offline ditambahkan");
      setForm({ CustomerName: "", ItemName: "", WeightGrams: "" });
      setModalOpen(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menambah antrian");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (error) toast.error(error instanceof ApiError ? error.message : "Gagal memuat antrian");
  }, [error]);

  if (loading) return <FullPageSpinner />;

  if (!branchId) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="Akun belum terhubung ke Cabang"
        description="Antrian cetak dikelola per cabang. Hubungi Super Admin untuk menautkan akun Anda ke sebuah Cabang di menu Pengguna."
      />
    );
  }

  const renderQueueCard = (item: QueueItem) => (
    <Card key={item.Id} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink">#{item.QueueNumber}</span>
            <Badge tone={STATUS_TONE[item.Status] ?? "neutral"}>{item.Status}</Badge>
            <Badge tone="brand">{item.QueueType === "ONLINE" ? "Online" : "Offline"}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink">{item.ItemName || "Custom 3D Print"}</p>
          <p className="text-xs text-ink-faint">
            {item.CustomerName || "-"} {item.OrderNumber ? `· ${item.OrderNumber}` : ""}
          </p>
          <p className="mt-1 text-xs text-ink-faint">Estimasi selesai: {formatEta(item.EstimatedFinishAt)}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          {item.Status === "WAITING" && (
            <Button size="sm" variant="outline" loading={actingOn === item.Id} onClick={() => advanceStatus(item.Id, "IN_PROGRESS")}>
              Mulai Cetak
            </Button>
          )}
          {item.Status === "IN_PROGRESS" && (
            <Button size="sm" loading={actingOn === item.Id} onClick={() => advanceStatus(item.Id, "DONE")}>
              Selesai
            </Button>
          )}
          {(item.Status === "WAITING" || item.Status === "IN_PROGRESS") && (
            <Button size="sm" variant="ghost" loading={actingOn === item.Id} onClick={() => advanceStatus(item.Id, "CANCELLED")}>
              Batalkan
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink">Antrian Cetak</h1>
          <p className="text-sm text-ink-faint">Pantau antrian cetak offline (walk-in) dan online (dari pesanan).</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="size-4" /> Tambah Antrian Offline
        </Button>
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Menunggu (Offline) — {data?.summary.totalOfflineWaiting ?? 0}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {!data?.offlineWaitingQueue.length && (
                <p className="text-sm text-ink-faint">Tidak ada antrian offline yang menunggu.</p>
              )}
              {data?.offlineWaitingQueue.map(renderQueueCard)}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sedang Dicetak (Online) — {data?.summary.totalOnlineInProgress ?? 0}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {!data?.onlineInProgressQueue.length && (
                <p className="text-sm text-ink-faint">Tidak ada pesanan online yang sedang dicetak.</p>
              )}
              {data?.onlineInProgressQueue.map(renderQueueCard)}
            </CardBody>
          </Card>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Antrian Offline">
        <form className="space-y-4" onSubmit={handleAddOffline}>
          <div>
            <FieldLabel>Nama Pelanggan</FieldLabel>
            <Input
              value={form.CustomerName}
              onChange={(e) => setForm((f) => ({ ...f, CustomerName: e.target.value }))}
              placeholder="Pelanggan Offline"
            />
          </div>
          <div>
            <FieldLabel>Nama Item</FieldLabel>
            <Input
              value={form.ItemName}
              onChange={(e) => setForm((f) => ({ ...f, ItemName: e.target.value }))}
              placeholder="Custom 3D Print"
            />
          </div>
          <div>
            <FieldLabel>Berat (gram)</FieldLabel>
            <Input
              type="number"
              value={form.WeightGrams}
              onChange={(e) => setForm((f) => ({ ...f, WeightGrams: e.target.value }))}
              placeholder="20"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={submitting}>
              Tambah
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

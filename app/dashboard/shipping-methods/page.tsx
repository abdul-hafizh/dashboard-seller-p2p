"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ShieldAlert, Truck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner, Spinner } from "@/components/ui/Spinner";
import { ResourceForm } from "@/components/crud/ResourceForm";
import type { FieldConfig } from "@/lib/resources/types";

interface ShippingService {
  Id: number;
  ShippingMethodId: number;
  ServiceName: string;
  ServiceCategory: string | null;
  ServiceCode: string | null;
  EstimatedDelivery: string | null;
  IsActive: boolean | number | null;
}

interface ShippingMethod {
  Id: number;
  Name: string;
  Provider: string | null;
  ShippingType: string | null;
  IsActive: number | boolean | null;
  Services?: ShippingService[];
}

// The app groups live Biteship rates into these categories (ShippingMethod.ShippingType).
const SHIPPING_TYPES = [
  { value: "INSTANT_SHIPMENT", label: "Instan" },
  { value: "REGULAR_SHIPMENT", label: "Reguler" },
  { value: "REGULAR_CARGO_SHIPMENT", label: "Kargo" },
  { value: "INTERNATIONAL_CARGO_SHIPMENT", label: "Internasional" },
  { value: "INTERNAL_SHIPMENT", label: "Internal" },
];
const SERVICE_CATEGORIES = [
  { value: "INSTANT", label: "Instant" },
  { value: "SAMEDAY", label: "Same Day" },
  { value: "REGULAR", label: "Reguler" },
  { value: "NEXTDAY", label: "Next Day" },
  { value: "CARGO", label: "Kargo" },
  { value: "INTERNAL", label: "Internal" },
];
const labelOf = (list: { value: string; label: string }[], v: string | null | undefined) =>
  list.find((o) => o.value === String(v ?? "").toUpperCase())?.label ?? (v || "-");

const METHOD_FIELDS: FieldConfig[] = [
  { name: "Name", label: "Nama Kurir", type: "text", required: true, placeholder: "JNE" },
  {
    name: "Provider",
    label: "Kode Kurir Biteship",
    type: "text",
    placeholder: "jne",
    helpText: "Dipakai untuk mencocokkan ongkir dari Biteship, mis. jne, jnt, sicepat, gojek, grab.",
  },
  {
    name: "ShippingType",
    label: "Kategori",
    type: "select",
    required: true,
    options: SHIPPING_TYPES,
    helpText: "Kelompok ongkir kurir ini di checkout aplikasi.",
  },
  { name: "IsActive", label: "Aktif", type: "boolean", defaultValue: true, intBoolean: true },
];

const SERVICE_FIELDS: FieldConfig[] = [
  { name: "ServiceName", label: "Nama Layanan", type: "text", required: true, placeholder: "JNE REG" },
  { name: "ServiceCategory", label: "Jenis Layanan", type: "select", required: true, options: SERVICE_CATEGORIES },
  { name: "ServiceCode", label: "Kode Layanan", type: "text", placeholder: "reg" },
  { name: "EstimatedDelivery", label: "Estimasi Pengiriman", type: "text", placeholder: "2-3 hari" },
  { name: "IsActive", label: "Aktif", type: "boolean", defaultValue: true },
];

type ModalState =
  | { kind: "method"; row?: ShippingMethod }
  | { kind: "service"; method: ShippingMethod; row?: ShippingService }
  | null;
type DeleteState = { kind: "method"; row: ShippingMethod } | { kind: "service"; row: ShippingService } | null;

const errorText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

/** Admin › Kurir & Layanan: shipping couriers (ShippingMethods) with their services, in one place. */
export default function ShippingCouriersPage() {
  const { isAdmin, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, mutate } = useSWR(isAdmin ? "shipping-couriers" : null, () =>
    apiFetch<ShippingMethod[]>("shipping-methods", { query: { limit: 500 } }),
  );

  const methods = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = [...(data?.data ?? [])].sort((a, b) => a.Name.localeCompare(b.Name));
    if (!q) return all;
    return all.filter(
      (m) =>
        m.Name.toLowerCase().includes(q) ||
        String(m.Provider ?? "").toLowerCase().includes(q) ||
        (m.Services ?? []).some((s) => s.ServiceName.toLowerCase().includes(q)),
    );
  }, [data, search]);

  if (loading) return <FullPageSpinner />;
  if (!isAdmin) {
    return <EmptyState icon={ShieldAlert} title="Akses terbatas" description="Halaman ini hanya bisa diakses oleh Super Admin." />;
  }

  const handleSubmit = async (payload: Record<string, unknown>) => {
    if (!modal) return;
    try {
      if (modal.kind === "method") {
        if (modal.row) await apiFetch(`shipping-methods/${modal.row.Id}`, { method: "PUT", json: payload });
        else await apiFetch("shipping-methods", { method: "POST", json: payload });
        toast.success(modal.row ? "Kurir diperbarui" : "Kurir ditambahkan");
      } else {
        const body = { ...payload, ShippingMethodId: modal.method.Id };
        if (modal.row) await apiFetch(`shipping-services/${modal.row.Id}`, { method: "PUT", json: body });
        else await apiFetch("shipping-services", { method: "POST", json: body });
        toast.success(modal.row ? "Layanan diperbarui" : "Layanan ditambahkan");
      }
      setModal(null);
      mutate();
    } catch (e) {
      toast.error(errorText(e, "Gagal menyimpan, coba lagi."));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === "service") {
        await apiFetch(`shipping-services/${deleteTarget.row.Id}`, { method: "DELETE" });
      } else {
        // A courier's services go with it.
        for (const s of deleteTarget.row.Services ?? []) {
          await apiFetch(`shipping-services/${s.Id}`, { method: "DELETE" });
        }
        await apiFetch(`shipping-methods/${deleteTarget.row.Id}`, { method: "DELETE" });
      }
      toast.success(deleteTarget.kind === "method" ? "Kurir dihapus" : "Layanan dihapus");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(errorText(e, "Gagal menghapus. Data ini mungkin sudah dipakai pesanan — nonaktifkan saja."));
    } finally {
      setDeleting(false);
      mutate();
    }
  };

  const modalTitle = !modal
    ? ""
    : modal.kind === "method"
      ? modal.row
        ? "Ubah Kurir"
        : "Tambah Kurir"
      : `${modal.row ? "Ubah" : "Tambah"} Layanan · ${modal.method.Name}`;

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-extrabold text-ink">Kurir & Layanan Pengiriman</h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            Kurir yang tampil di checkout aplikasi, dikelompokkan per kategori, beserta layanannya. Ongkir tetap dihitung langsung
            oleh Biteship.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kurir atau layanan..."
              className="w-full pl-9 sm:w-56"
            />
          </div>
          <Button onClick={() => setModal({ kind: "method" })} className="shrink-0">
            <Plus className="size-4" /> <span className="hidden sm:inline">Tambah Kurir</span>
          </Button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : methods.length === 0 ? (
        <EmptyState icon={Truck} title="Belum ada kurir" description="Klik Tambah Kurir untuk menambahkan kurir pengiriman." />
      ) : (
        <ul className="divide-y divide-border">
          {methods.map((m) => {
            const services = [...(m.Services ?? [])].sort((a, b) => a.ServiceName.localeCompare(b.ServiceName));
            return (
              <li key={m.Id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-ink">{m.Name}</span>
                      <Badge tone="brand">{labelOf(SHIPPING_TYPES, m.ShippingType)}</Badge>
                      <Badge tone={m.IsActive ? "success" : "neutral"}>{m.IsActive ? "Aktif" : "Nonaktif"}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-faint">Kode Biteship: {m.Provider || "-"}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setModal({ kind: "service", method: m })}>
                      <Plus className="size-4" /> Layanan
                    </Button>
                    <button
                      type="button"
                      onClick={() => setModal({ kind: "method", row: m })}
                      className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-info/10 hover:text-info"
                      aria-label={`Ubah ${m.Name}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ kind: "method", row: m })}
                      className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-error/10 hover:text-error"
                      aria-label={`Hapus ${m.Name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {services.length === 0 ? (
                  <p className="mt-3 text-xs text-ink-faint">Belum ada layanan.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-surface-muted/60 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                          <th className="whitespace-nowrap px-3 py-2">Layanan</th>
                          <th className="whitespace-nowrap px-3 py-2">Jenis</th>
                          <th className="whitespace-nowrap px-3 py-2">Kode</th>
                          <th className="whitespace-nowrap px-3 py-2">Estimasi</th>
                          <th className="whitespace-nowrap px-3 py-2">Status</th>
                          <th className="px-3 py-2 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {services.map((s) => (
                          <tr key={s.Id} className="border-t border-border">
                            <td className="whitespace-nowrap px-3 py-2 text-ink">{s.ServiceName}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-ink-soft">{labelOf(SERVICE_CATEGORIES, s.ServiceCategory)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-ink-soft">{s.ServiceCode || "-"}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-ink-soft">{s.EstimatedDelivery || "-"}</td>
                            <td className="whitespace-nowrap px-3 py-2">
                              <Badge tone={s.IsActive ? "success" : "neutral"}>{s.IsActive ? "Aktif" : "Nonaktif"}</Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setModal({ kind: "service", method: m, row: s })}
                                  className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-info/10 hover:text-info"
                                  aria-label={`Ubah ${s.ServiceName}`}
                                >
                                  <Pencil className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget({ kind: "service", row: s })}
                                  className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-error/10 hover:text-error"
                                  aria-label={`Hapus ${s.ServiceName}`}
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} title={modalTitle}>
        {modal && (
          <ResourceForm
            key={`${modal.kind}-${modal.row?.Id ?? "new"}`}
            fields={modal.kind === "method" ? METHOD_FIELDS : SERVICE_FIELDS}
            initialValues={modal.row as Record<string, unknown> | undefined}
            submitLabel={modal.row ? "Simpan Perubahan" : "Tambah"}
            onSubmit={handleSubmit}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.kind === "method" ? `Hapus kurir ${deleteTarget.row.Name}?` : "Hapus layanan ini?"}
        description={
          deleteTarget?.kind === "method"
            ? `Kurir beserta ${(deleteTarget.row.Services ?? []).length} layanannya akan dihapus dari checkout aplikasi. Kalau hanya ingin menyembunyikan sementara, ubah statusnya menjadi nonaktif.`
            : "Layanan ini tidak akan tampil lagi di checkout aplikasi."
        }
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Card>
  );
}

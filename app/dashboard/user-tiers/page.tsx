"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Award, Pencil, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner, Spinner } from "@/components/ui/Spinner";
import { ResourceForm } from "@/components/crud/ResourceForm";
import { useUserTiers, type UserTier } from "@/components/customers/TierBadge";
import { formatCurrency } from "@/lib/resources/format";
import type { FieldConfig } from "@/lib/resources/types";

const FIELDS: FieldConfig[] = [
  { name: "Label", label: "Label Tier", type: "text", required: true, placeholder: "Gold" },
  {
    name: "MinSpent",
    label: "Minimal Total Transaksi (Rp)",
    type: "number",
    required: true,
    placeholder: "1000000",
    helpText: "Customer naik ke tier ini setelah total belanjanya (pesanan dibayar) mencapai nominal ini.",
  },
  {
    name: "DiscountPercent",
    label: "Diskon (%)",
    type: "number",
    required: true,
    placeholder: "10",
    helpText: "Dipotong otomatis dari harga produk setiap kali customer di tier ini belanja.",
  },
];

/** Admin › Master Tier: label, minimum total spent and discount of each customer loyalty tier. */
export default function UserTiersPage() {
  const { isAdmin, loading } = useAuth();
  const { data, isLoading, mutate } = useUserTiers();
  const [editing, setEditing] = useState<UserTier | null>(null);

  if (loading) return <FullPageSpinner />;
  if (!isAdmin) {
    return <EmptyState icon={ShieldAlert} title="Akses terbatas" description="Halaman ini hanya bisa diakses oleh Super Admin." />;
  }

  const tiers = data?.data ?? [];

  const save = async (payload: Record<string, unknown>) => {
    if (!editing) return;
    try {
      await apiFetch(`user-tiers/${editing.Id}`, { method: "PUT", json: payload });
      toast.success("Tier diperbarui. Tier semua customer dihitung ulang.");
      setEditing(null);
      mutate();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan tier");
    }
  };

  return (
    <Card>
      <div className="border-b border-border p-4">
        <h1 className="text-base font-extrabold text-ink">Master Tier</h1>
        <p className="mt-0.5 text-xs text-ink-soft">
          Tingkatan customer berdasarkan total belanja. Label, syarat nominal, dan diskon di sini dipakai di aplikasi, harga
          pesanan, dan invoice. Urutan tier tetap (dari terendah ke tertinggi).
        </p>
      </div>
      {isLoading && !data ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : tiers.length === 0 ? (
        <EmptyState icon={Award} title="Master tier belum ada" description="Jalankan script add-user-tiers.js di server terlebih dahulu." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                <th className="whitespace-nowrap px-4 py-3">Urutan</th>
                <th className="whitespace-nowrap px-4 py-3">Label Tier</th>
                <th className="whitespace-nowrap px-4 py-3">Kode</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Syarat Total Transaksi</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Diskon</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t, i) => {
                const next = tiers[i + 1];
                return (
                  <tr key={t.Id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                    <td className="px-4 py-3 text-ink-soft">{i + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">
                      <span className="inline-flex items-center gap-2">
                        <Award className="size-4 text-brand-purple" /> {t.Label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-faint">{t.Code}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-ink">
                      {next ? `${formatCurrency(t.MinSpent)} – < ${formatCurrency(next.MinSpent)}` : `≥ ${formatCurrency(t.MinSpent)}`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-success">
                      {t.DiscountPercent > 0 ? `${String(t.DiscountPercent).replace(".", ",")}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setEditing(t)}
                          className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-info/10 hover:text-info"
                          aria-label={`Ubah ${t.Label}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing ? `Ubah Tier ${editing.Label}` : ""}>
        {editing && (
          <ResourceForm
            key={editing.Id}
            fields={FIELDS}
            initialValues={editing as unknown as Record<string, unknown>}
            submitLabel="Simpan Perubahan"
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </Card>
  );
}

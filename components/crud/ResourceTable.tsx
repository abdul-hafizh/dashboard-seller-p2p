"use client";

import { useEffect, useState, type ReactNode } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { ResourceConfig } from "@/lib/resources/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { ResourceForm } from "./ResourceForm";

type Row = Record<string, unknown>;

interface ResourceTableProps {
  config: ResourceConfig<Row>;
  /** Extra controls rendered next to the search box (e.g. a merchant's "only mine" toggle). */
  toolbarExtra?: ReactNode;
  /** Applied client-side to the fetched page, e.g. filtering products by SellerId. */
  filterRows?: (rows: Row[]) => Row[];
  /** Overrides config.pageSize — useful together with filterRows to fetch a bigger page to filter from. */
  pageSizeOverride?: number;
  /** Hides the server-pagination footer, for when filterRows makes it not meaningful. */
  hidePagination?: boolean;
}

export function ResourceTable({ config, toolbarExtra, filterRows, pageSizeOverride, hidePagination }: ResourceTableProps) {
  const idKey = config.idKey ?? "Id";
  const pageSize = pageSizeOverride ?? config.pageSize ?? 10;

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; row?: Row } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, mutate } = useSWR(
    [config.endpoint, page, search, pageSize],
    () =>
      apiFetch<Row[]>(config.endpoint, {
        query: { page, limit: pageSize, search: search || undefined },
      }),
    { keepPreviousData: true },
  );

  const fetchedRows = data?.data ?? [];
  const rows = filterRows ? filterRows(fetchedRows) : fetchedRows;
  const pagination = data?.pagination;

  const closeModal = () => setModal(null);

  const handleSubmit = async (payload: Record<string, unknown>) => {
    try {
      if (modal?.mode === "edit" && modal.row) {
        const id = String(modal.row[idKey]);
        await apiFetch(`${config.endpoint}/${id}`, { method: "PUT", json: payload });
        await config.afterSave?.(id, payload);
        toast.success(`${config.title} berhasil diperbarui`);
      } else {
        const res = await apiFetch<Row>(config.endpoint, { method: "POST", json: payload });
        await config.afterSave?.(String(res.data[idKey]), payload);
        toast.success(`${config.title} berhasil ditambahkan`);
      }
      closeModal();
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Terjadi kesalahan, coba lagi.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`${config.endpoint}/${deleteTarget[idKey]}`, { method: "DELETE" });
      toast.success(`${config.title} berhasil dihapus`);
      setDeleteTarget(null);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal menghapus data.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-extrabold text-ink">{config.title}</h1>
          {config.description && <p className="mt-0.5 text-xs text-ink-soft">{config.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbarExtra}
          {config.searchable !== false && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={config.searchPlaceholder ?? "Cari..."}
                className="w-full pl-9 sm:w-56"
              />
            </div>
          )}
          <Button onClick={() => setModal({ mode: "create" })} className="shrink-0">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Tambah</span>
          </Button>
        </div>
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} title={`Belum ada data ${config.title.toLowerCase()}`} description="Klik tombol Tambah untuk membuat data baru." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                {config.columns.map((col) => (
                  <th key={col.key} className={`whitespace-nowrap px-4 py-3 ${col.className ?? ""}`}>
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row[idKey])} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                  {config.columns.map((col) => (
                    <td key={col.key} className={`whitespace-nowrap px-4 py-3 text-ink ${col.className ?? ""}`}>
                      {col.render ? col.render(row) : String(row[col.key] ?? "-")}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setModal({ mode: "edit", row })}
                        className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-info/10 hover:text-info"
                        aria-label="Ubah"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-error/10 hover:text-error"
                        aria-label="Hapus"
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

      {!hidePagination && pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-ink-soft">
            Halaman {pagination.currentPage} dari {pagination.totalPages} · {pagination.totalItems} data
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(modal)}
        onClose={closeModal}
        title={modal?.mode === "edit" ? `Ubah ${config.title}` : `Tambah ${config.title}`}
      >
        {modal && (
          <ResourceForm
            fields={config.fields}
            initialValues={modal.row}
            submitLabel={modal.mode === "edit" ? "Simpan Perubahan" : "Tambah"}
            onSubmit={handleSubmit}
            onCancel={closeModal}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Hapus ${config.title}?`}
        description={`Tindakan ini tidak dapat dibatalkan. Data akan dihapus secara permanen.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Card>
  );
}

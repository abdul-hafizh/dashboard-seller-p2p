"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Store, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner, Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/resources/format";
import {
  MerchantApprovalActions,
  MerchantAvatar,
  MerchantStatusBadge,
  storeName,
  type MerchantRow,
} from "@/components/merchants/merchant-ui";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "", label: "Semua" },
  { key: "pending", label: "Menunggu Persetujuan" },
  { key: "approved", label: "Disetujui" },
  { key: "rejected", label: "Ditolak" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function MerchantsPage() {
  const { isAdmin, loading } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("");

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, mutate } = useSWR(isAdmin ? ["admin-merchants", page, search, tab] : null, () =>
    apiFetch<MerchantRow[]>("admin/merchants", {
      query: { page, limit: 20, search: search || undefined, status: tab || undefined },
    }),
  );

  if (loading) return <FullPageSpinner />;
  if (!isAdmin) {
    return (
      <EmptyState icon={ShieldAlert} title="Akses terbatas" description="Halaman ini hanya bisa diakses oleh Super Admin." />
    );
  }

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const pendingCount = (data as { meta?: { pendingCount?: number } } | undefined)?.meta?.pendingCount ?? 0;

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-extrabold text-ink">Merchant</h1>
          <p className="mt-0.5 text-xs text-ink-soft">Daftar semua merchant, akun pemiliknya, dan produk yang mereka jual.</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama, email, toko..."
            className="w-full pl-9 sm:w-64"
          />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border px-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
              tab === t.key ? "border-brand-purple text-brand-purple" : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {t.label}
            {t.key === "pending" && pendingCount > 0 && (
              <span className="rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Store}
          title={search ? "Merchant tidak ditemukan" : "Belum ada merchant"}
          description={search ? "Coba kata kunci lain." : "Merchant yang terdaftar akan muncul di sini."}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                <th className="whitespace-nowrap px-4 py-3">Merchant</th>
                <th className="whitespace-nowrap px-4 py-3">Akun Pengguna</th>
                <th className="whitespace-nowrap px-4 py-3">Produk</th>
                <th className="whitespace-nowrap px-4 py-3">Pesanan</th>
                <th className="whitespace-nowrap px-4 py-3">Status</th>
                <th className="whitespace-nowrap px-4 py-3">Bergabung</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.Id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <MerchantAvatar merchant={m} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{storeName(m) ?? m.FullName ?? "-"}</p>
                        {storeName(m) && <p className="truncate text-xs text-ink-soft">{m.FullName}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    <p className="text-ink">{m.Email ?? "-"}</p>
                    <p className="text-xs">{m.Phone || m.WhatsappNumber || "-"}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink">
                    <span className="font-semibold">{m.ProductCount ?? 0}</span>
                    <span className="text-xs text-ink-soft"> · {m.PublishedProductCount ?? 0} tayang</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">{m.OrderCount ?? 0}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <MerchantStatusBadge merchant={m} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatDate(m.CreatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <MerchantApprovalActions merchant={m} onChanged={() => mutate()} />
                      <Link href={`/dashboard/merchants/${m.Id}`}>
                        <Button variant="ghost" size="sm">
                          Lihat <ChevronRight className="size-4" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-ink-soft">
            Halaman {pagination.currentPage} dari {pagination.totalPages} · {pagination.totalItems} merchant
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
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
    </Card>
  );
}

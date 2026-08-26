"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, ShoppingCart, ChevronRight as ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { formatCurrency, formatDate } from "@/lib/resources/format";

interface OrderRow {
  Id: string;
  OrderNumber: string | null;
  CustomerId: string | null;
  TotalAmount: number | null;
  CreatedAt: string | null;
  Status: { Id: number; Name: string; ColorCode: string | null } | null;
  Customer?: { User?: { FullName: string | null; Phone: string | null } | null } | null;
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useSWR(["orders", page, search], () =>
    apiFetch<OrderRow[]>("orders", { query: { page, limit: 10, search: search || undefined } }),
  );

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-extrabold text-ink">Pesanan</h1>
          <p className="mt-0.5 text-xs text-ink-soft">Pantau status pesanan yang masuk.</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nomor pesanan..."
            className="w-full pl-9 sm:w-64"
          />
        </div>
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Belum ada pesanan" description="Pesanan dari pelanggan akan muncul di sini." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                <th className="whitespace-nowrap px-4 py-3">No. Pesanan</th>
                <th className="whitespace-nowrap px-4 py-3">Pelanggan</th>
                <th className="whitespace-nowrap px-4 py-3">Status</th>
                <th className="whitespace-nowrap px-4 py-3">Total</th>
                <th className="whitespace-nowrap px-4 py-3">Tanggal</th>
                <th className="px-4 py-3 text-right">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr key={order.Id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">
                    {order.OrderNumber ?? order.Id.slice(0, 8)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink">
                    {order.Customer?.User?.FullName ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge tone="info">{order.Status?.Name ?? "-"}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink">{formatCurrency(order.TotalAmount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatDate(order.CreatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/orders/${order.Id}`}>
                      <Button variant="ghost" size="sm">
                        Lihat <ArrowRight className="size-4" />
                      </Button>
                    </Link>
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
            Halaman {pagination.currentPage} dari {pagination.totalPages} · {pagination.totalItems} pesanan
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

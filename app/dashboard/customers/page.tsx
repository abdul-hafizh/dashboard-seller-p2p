"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Search, Users, Download, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { formatCurrency, formatDate } from "@/lib/resources/format";
import { CustomerAvatar, ageOf, genderLabel, type CustomerRow } from "@/components/customers/customer-ui";

/** Admin › Customer: every customer account with their purchases; CSV export. */
export default function CustomersPage() {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useSWR(isAdmin ? ["admin-customers", page, search, gender] : null, () =>
    apiFetch<CustomerRow[]>("admin/customers", { query: { page, limit: 20, search: search || undefined, gender: gender || undefined } }),
  );

  if (!isAdmin) {
    return (
      <Card>
        <EmptyState icon={Users} title="Khusus admin" description="Halaman ini hanya untuk admin." />
      </Card>
    );
  }

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-base font-extrabold text-ink">Customer</h1>
          <p className="mt-0.5 text-xs text-ink-soft">Data customer, alamat kirim, dan riwayat belanja mereka.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Nama, email, atau no HP"
              className="w-full pl-9 sm:w-60"
            />
          </div>
          <Select value={gender} onChange={(e) => { setGender(e.target.value); setPage(1); }} className="w-36" aria-label="Filter jenis kelamin">
            <option value="">Semua gender</option>
            <option value="MALE">Laki-laki</option>
            <option value="FEMALE">Perempuan</option>
          </Select>
          <a href="/api/backend/admin/customers/export" download>
            <Button type="button" variant="outline" size="sm">
              <Download className="size-4" /> Ekspor CSV
            </Button>
          </a>
        </div>
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="Belum ada customer" description="Customer yang mendaftar di aplikasi akan muncul di sini." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                <th className="whitespace-nowrap px-4 py-3">Customer</th>
                <th className="whitespace-nowrap px-4 py-3">Kontak</th>
                <th className="whitespace-nowrap px-4 py-3">Gender / Usia</th>
                <th className="whitespace-nowrap px-4 py-3">Kota</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Pesanan</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Total Belanja</th>
                <th className="whitespace-nowrap px-4 py-3">Terakhir Belanja</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const age = ageOf(c.BirthDate);
                return (
                  <tr key={c.Id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CustomerAvatar src={c.Avatar} name={c.FullName} />
                        <div>
                          <p className="font-semibold text-ink">{c.FullName ?? "-"}</p>
                          <div className="mt-0.5 flex gap-1">
                            {c.UserLevel && <Badge tone="brand">{c.UserLevel}</Badge>}
                            {c.IsActive === false && <Badge tone="error">Nonaktif</Badge>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="text-ink">{c.Email ?? "-"}</p>
                      <p className="text-xs text-ink-soft">{c.Phone || c.WhatsappNumber || "-"}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                      {genderLabel(c.Gender)}
                      {age !== null && <span> · {age} th</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-ink">{c.DefaultAddress?.City ?? "-"}</span>
                      {c.DefaultAddress?.HasPin && <MapPin className="ml-1 inline size-3.5 text-success" aria-label="Alamat sudah di-pin" />}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-ink">
                      {c.Stats.PaidOrders}
                      <span className="text-xs text-ink-faint"> / {c.Stats.Orders}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-ink">{formatCurrency(c.Stats.Spent)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{c.Stats.LastOrderAt ? formatDate(c.Stats.LastOrderAt) : "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/customers/${c.Id}`}>
                        <Button variant="ghost" size="sm">
                          Detail <ChevronRight className="size-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-ink-soft">
            Halaman {pagination.currentPage} dari {pagination.totalPages} · {pagination.totalItems} customer
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

    </Card>
  );
}


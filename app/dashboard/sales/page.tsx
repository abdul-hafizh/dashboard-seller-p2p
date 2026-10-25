"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Download,
  Wallet,
  Receipt,
  PackageCheck,
  Boxes,
  CircleCheck,
  CircleX,
  Star,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formatCurrency, formatDateTime } from "@/lib/resources/format";
import { storeName, type MerchantRow } from "@/components/merchants/merchant-ui";

interface SalesItem {
  Id: string;
  Name: string;
  Type: "PRODUCT" | "CUSTOM";
  Material: string | null;
  Quantity: number;
  UnitPrice: number;
  LineTotal: number;
}

interface SalesRow {
  Id: string;
  OrderNumber: string | null;
  Status: { Id: number; Name: string; ColorCode: string | null } | null;
  Seller: { Id: string; StoreName: string };
  Customer: { Name: string | null; Phone: string | null; Email: string | null } | null;
  Items: SalesItem[];
  ItemCount: number;
  SubtotalAmount: number;
  DiscountAmount: number;
  TaxAmount: number;
  AppFeeAmount: number;
  ShippingCost: number;
  TotalAmount: number;
  PaidAmount: number;
  PaymentMethod: string | null;
  Shipping: { Type: "PICKUP" | "COURIER"; Courier: string | null; TrackingNumber: string | null; Status: string | null } | null;
  Dates: {
    OrderedAt: string | null;
    PaidAt: string | null;
    ShippedAt: string | null;
    ReceivedAt: string | null;
    CompletedAt: string | null;
    CancelledAt: string | null;
  };
  Rating: number | null;
  RatingNotes: string | null;
}

interface SalesSummary {
  TotalOrders: number;
  PaidOrders: number;
  CompletedOrders: number;
  PendingOrders: number;
  CancelledOrders: number;
  Revenue: number;
  GrossSales: number;
  ItemsSold: number;
  AvgRating: number | null;
  RatedOrders: number;
}

const STATUS_OPTIONS = [
  { value: "", label: "Semua status" },
  { value: "2", label: "Menunggu Pembayaran" },
  { value: "3", label: "Diproses" },
  { value: "4", label: "Selesai" },
  { value: "5", label: "Dibatalkan" },
];

const STATUS_LABEL: Record<string, { label: string; tone: "warning" | "info" | "success" | "error" | "neutral" }> = {
  PENDING_PAYMENT: { label: "Menunggu Bayar", tone: "warning" },
  PROCESSING: { label: "Diproses", tone: "info" },
  COMPLETED: { label: "Selesai", tone: "success" },
  CANCELLED: { label: "Dibatalkan", tone: "error" },
};

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function defaultRange() {
  const now = new Date();
  return { from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDateInput(now) };
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q.set(k, String(v));
  return q.toString();
}

function DateCell({ value, empty = "-" }: { value: string | null; empty?: string }) {
  return <span className={value ? "text-ink" : "text-ink-faint"}>{value ? formatDateTime(value) : empty}</span>;
}

/** Customer's 1–5 star rating of the order, with their review underneath. */
function RatingCell({ rating, notes }: { rating: number | null; notes: string | null }) {
  if (rating == null) return <span className="text-ink-faint">Belum dinilai</span>;
  return (
    <div>
      <div className="flex items-center gap-0.5" aria-label={`Rating ${rating} dari 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={n <= rating ? "size-3.5 fill-amber-400 text-amber-400" : "size-3.5 text-border"} />
        ))}
        <span className="ml-1 font-semibold text-ink">{rating}</span>
      </div>
      {notes && (
        <p className="mt-1 line-clamp-2 text-ink-soft" title={notes}>
          {notes}
        </p>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <Icon className="size-4 text-brand-purple" /> {label}
      </div>
      <p className="mt-1.5 text-lg font-extrabold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}

/**
 * Laporan Penjualan — per order: seller, customer, products with prices and
 * the order / paid / shipped / received dates. Merchants see their own
 * sales (scoped server-side), super admin all sellers with a seller filter.
 */
export default function SalesReportPage() {
  const { isAdmin } = useAuth();
  const [from, setFrom] = useState(() => defaultRange().from);
  const [to, setTo] = useState(() => defaultRange().to);
  const [statusId, setStatusId] = useState("");
  const [shipping, setShipping] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filters = { from, to, statusId, shipping, merchantId: isAdmin ? merchantId : "", search };

  const { data, isLoading, error } = useSWR(["sales-report", page, JSON.stringify(filters)], () =>
    apiFetch<SalesRow[]>("reports/sales", { query: { ...filters, page, limit: 20 } }),
  );
  const { data: merchants } = useSWR(isAdmin ? "sales-merchant-options" : null, () =>
    apiFetch<MerchantRow[]>("admin/merchants", { query: { status: "approved", limit: 100 } }),
  );

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const summary = data?.meta?.summary as SalesSummary | undefined;
  const exportHref = `/api/backend/reports/sales/export?${buildQuery(filters)}`;

  const changeFilter = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-base font-extrabold text-ink">Laporan Penjualan</h1>
            <p className="mt-0.5 text-xs text-ink-soft">
              {isAdmin
                ? "Detail penjualan semua seller: produk, harga, dan tanggal order, bayar, kirim, serta terima."
                : "Detail penjualan toko kamu: produk, harga, dan tanggal order, bayar, kirim, serta terima."}
            </p>
          </div>
          <a href={exportHref} download>
            <Button variant="outline" size="sm" type="button">
              <Download className="size-4" /> Ekspor Excel
            </Button>
          </a>
        </div>

        <div className={`grid gap-3 p-4 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
          <div>
            <FieldLabel htmlFor="sr-from">Dari tanggal</FieldLabel>
            <Input id="sr-from" type="date" value={from} max={to || undefined} onChange={(e) => changeFilter(setFrom)(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="sr-to">Sampai tanggal</FieldLabel>
            <Input id="sr-to" type="date" value={to} min={from || undefined} onChange={(e) => changeFilter(setTo)(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="sr-status">Status</FieldLabel>
            <Select id="sr-status" value={statusId} onChange={(e) => changeFilter(setStatusId)(e.target.value)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="sr-ship">Pengiriman</FieldLabel>
            <Select id="sr-ship" value={shipping} onChange={(e) => changeFilter(setShipping)(e.target.value)}>
              <option value="">Semua</option>
              <option value="COURIER">Kurir</option>
              <option value="PICKUP">Ambil di toko</option>
            </Select>
          </div>
          {isAdmin && (
            <div>
              <FieldLabel htmlFor="sr-seller">Seller</FieldLabel>
              <Select id="sr-seller" value={merchantId} onChange={(e) => changeFilter(setMerchantId)(e.target.value)}>
                <option value="">Semua seller</option>
                {(merchants?.data ?? []).map((m) => (
                  <option key={m.Id} value={m.Id}>
                    {storeName(m) || m.FullName || m.Email}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <FieldLabel htmlFor="sr-search">Cari</FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
              <Input
                id="sr-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="No. pesanan, produk, customer"
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </Card>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-4 xl:grid-cols-7">
          <SummaryCard icon={Wallet} label="Pendapatan" value={formatCurrency(summary.Revenue)} hint="Pesanan dibayar, tanpa ongkir" />
          <SummaryCard icon={Receipt} label="Penjualan Produk" value={formatCurrency(summary.GrossSales)} hint="Harga × qty, sebelum biaya" />
          <SummaryCard icon={PackageCheck} label="Pesanan Dibayar" value={String(summary.PaidOrders)} hint={`dari ${summary.TotalOrders} pesanan`} />
          <SummaryCard icon={Boxes} label="Item Terjual" value={String(summary.ItemsSold)} />
          <SummaryCard icon={CircleCheck} label="Selesai" value={String(summary.CompletedOrders)} />
          <SummaryCard
            icon={CircleX}
            label="Batal / Belum Bayar"
            value={`${summary.CancelledOrders} / ${summary.PendingOrders}`}
          />
          <SummaryCard
            icon={Star}
            label="Rating"
            value={summary.AvgRating != null ? `${summary.AvgRating.toLocaleString("id-ID")} / 5` : "-"}
            hint={summary.RatedOrders ? `dari ${summary.RatedOrders} ulasan` : "Belum ada ulasan"}
          />
        </div>
      )}

      <Card>
        {isLoading && rows.length === 0 ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : error ? (
          <EmptyState icon={BarChart3} title="Gagal memuat laporan" description={error instanceof Error ? error.message : undefined} />
        ) : rows.length === 0 ? (
          <EmptyState icon={BarChart3} title="Belum ada penjualan" description="Tidak ada pesanan pada periode dan filter ini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="whitespace-nowrap px-4 py-3">Pesanan</th>
                  {isAdmin && <th className="whitespace-nowrap px-4 py-3">Seller</th>}
                  <th className="whitespace-nowrap px-4 py-3">Customer</th>
                  <th className="min-w-64 px-4 py-3">Produk · Harga</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Total</th>
                  <th className="whitespace-nowrap px-4 py-3">Pengiriman</th>
                  <th className="whitespace-nowrap px-4 py-3">Tgl Order</th>
                  <th className="whitespace-nowrap px-4 py-3">Tgl Bayar</th>
                  <th className="whitespace-nowrap px-4 py-3">Tgl Kirim</th>
                  <th className="whitespace-nowrap px-4 py-3">Tgl Terima</th>
                  <th className="min-w-44 px-4 py-3">Rating</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const status = r.Status ? STATUS_LABEL[r.Status.Name] : undefined;
                  const cancelled = r.Status?.Name === "CANCELLED";
                  return (
                    <tr key={r.Id} className="border-b border-border align-top last:border-0 hover:bg-surface-muted/40">
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link href={`/dashboard/orders/${r.Id}`} className="font-semibold text-ink hover:text-brand-purple">
                          {r.OrderNumber ?? r.Id.slice(0, 8)}
                        </Link>
                        <div className="mt-1">
                          <Badge tone={status?.tone ?? "neutral"}>{status?.label ?? r.Status?.Name ?? "-"}</Badge>
                        </div>
                      </td>
                      {isAdmin && <td className="whitespace-nowrap px-4 py-3 text-ink">{r.Seller.StoreName}</td>}
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="text-ink">{r.Customer?.Name ?? "-"}</p>
                        {r.Customer?.Phone && <p className="text-xs text-ink-soft">{r.Customer.Phone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <ul className="space-y-1">
                          {r.Items.map((it) => (
                            <li key={it.Id} className="flex justify-between gap-3">
                              <span className="text-ink">
                                {it.Name}
                                {it.Material && <span className="text-ink-faint"> · {it.Material}</span>}
                                <span className="text-ink-soft"> × {it.Quantity}</span>
                              </span>
                              <span className="whitespace-nowrap text-ink-soft">
                                {formatCurrency(it.UnitPrice)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <p className="font-semibold text-ink">{formatCurrency(r.TotalAmount + r.ShippingCost)}</p>
                        <p className="text-[11px] text-ink-faint">
                          Produk {formatCurrency(r.SubtotalAmount)}
                          {r.ShippingCost > 0 && ` · Ongkir ${formatCurrency(r.ShippingCost)}`}
                        </p>
                        {r.PaymentMethod && <p className="text-[11px] text-ink-faint">{r.PaymentMethod}</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {r.Shipping?.Type === "PICKUP" ? (
                          <Badge tone="brand">Ambil di Toko</Badge>
                        ) : (
                          <span className="text-ink">{r.Shipping?.Courier ?? "-"}</span>
                        )}
                        {r.Shipping?.TrackingNumber && (
                          <p className="text-xs text-ink-soft">Resi {r.Shipping.TrackingNumber}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <DateCell value={r.Dates.OrderedAt} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <DateCell value={r.Dates.PaidAt} empty={cancelled ? "Batal" : "Belum bayar"} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <DateCell value={r.Dates.ShippedAt} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {cancelled ? (
                          <span className="text-error">Batal {r.Dates.CancelledAt ? formatDateTime(r.Dates.CancelledAt) : ""}</span>
                        ) : (
                          <DateCell value={r.Dates.ReceivedAt} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <RatingCell rating={r.Rating} notes={r.RatingNotes} />
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
    </div>
  );
}

"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MessageCircle, Cake, User, MapPin, ExternalLink, ShoppingBag, ChevronDown, ChevronUp, Coins, Package } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatCurrency, formatDate, formatDateTime, toPublicAssetUrl } from "@/lib/resources/format";
import { CustomerAvatar, ageOf, genderLabel } from "@/components/customers/customer-ui";

interface Address {
  Id: string;
  Label: string | null;
  RecipientName: string | null;
  Phone: string | null;
  Address: string | null;
  PostalCode: string | null;
  Latitude: number | null;
  Longitude: number | null;
  IsDefault: boolean;
  City?: { Name: string } | null;
  Province?: { Name: string } | null;
}

interface OrderItem {
  Id: string;
  Name: string;
  Material: string | null;
  Quantity: number;
  UnitPrice: number | null;
  WeightGrams: number | null;
  ThumbnailPath: string | null;
}

interface CustomerOrder {
  Id: string;
  OrderNumber: string | null;
  Kind: "ORDER" | "TOKEN";
  TokenQuantity: number | null;
  Status: string | null;
  StoreName: string | null;
  CreatedAt: string;
  PaidAt: string | null;
  PaymentMethod: string | null;
  SubtotalAmount: number | null;
  DiscountAmount: number | null;
  TaxAmount: number | null;
  AppFeeAmount: number | null;
  TotalAmount: number | null;
  ShippingCost: number;
  Shipping: { Type: "PICKUP" | "COURIER"; Courier: string; TrackingNumber: string | null; Status: string | null } | null;
  Rating: number | null;
  Notes: string | null;
  Items: OrderItem[];
}

interface CustomerDetail {
  Id: string;
  FullName: string | null;
  Email: string | null;
  Phone: string | null;
  WhatsappNumber: string | null;
  Gender: "MALE" | "FEMALE" | null;
  BirthDate: string | null;
  Avatar: string | null;
  UserLevel: string | null;
  CreatedAt: string | null;
  LastLogin: string | null;
  Addresses: Address[];
  Orders: CustomerOrder[];
  Summary: { Orders: number; PaidOrders: number; Spent: number; ItemsBought: number; TokenPurchases: number };
}

const STATUS_TONE: Record<string, "warning" | "info" | "success" | "error" | "neutral"> = {
  PENDING_PAYMENT: "warning",
  PROCESSING: "info",
  COMPLETED: "success",
  CANCELLED: "error",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu Bayar",
  PROCESSING: "Diproses",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

function Info({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="size-4 shrink-0 text-ink-faint" />
      <span className="text-ink-soft">{label}:</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function OrderCard({ order }: { order: CustomerOrder }) {
  const [open, setOpen] = useState(false);
  const total = Number(order.TotalAmount || 0) + order.ShippingCost;
  return (
    <div className="rounded-xl border border-border">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left">
        <div className="min-w-40 flex-1">
          <p className="font-semibold text-ink">
            {order.Kind === "TOKEN" ? `Pembelian ${order.TokenQuantity} token AI` : order.OrderNumber}
          </p>
          <p className="text-xs text-ink-soft">
            {formatDateTime(order.CreatedAt)}
            {order.StoreName ? ` · ${order.StoreName}` : ""}
          </p>
        </div>
        <Badge tone={STATUS_TONE[order.Status ?? ""] ?? "neutral"}>{STATUS_LABEL[order.Status ?? ""] ?? order.Status ?? "-"}</Badge>
        <p className="w-32 text-right font-bold text-ink">{formatCurrency(total)}</p>
        {open ? <ChevronUp className="size-4 text-ink-faint" /> : <ChevronDown className="size-4 text-ink-faint" />}
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3 text-sm">
          {order.Items.length > 0 && (
            <ul className="space-y-2">
              {order.Items.map((it) => {
                const thumb = toPublicAssetUrl(it.ThumbnailPath);
                return (
                  <li key={it.Id} className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element -- uploaded product photo
                        <img src={thumb} alt="" className="size-full object-cover" />
                      ) : (
                        <Package className="size-4 text-ink-faint" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-ink">{it.Name}</p>
                      <p className="text-xs text-ink-soft">
                        {it.Quantity} × {formatCurrency(it.UnitPrice)}
                        {it.Material ? ` · ${it.Material}` : ""}
                        {it.WeightGrams ? ` · ${Math.round(it.WeightGrams)} g` : ""}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-ink">{formatCurrency((it.UnitPrice ?? 0) * it.Quantity)}</p>
                  </li>
                );
              })}
            </ul>
          )}
          <dl className="grid gap-1 border-t border-border pt-2 text-xs sm:max-w-sm">
            {order.SubtotalAmount != null && <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{formatCurrency(order.SubtotalAmount)}</dd></div>}
            {Number(order.DiscountAmount) > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Diskon</dt><dd>− {formatCurrency(order.DiscountAmount)}</dd></div>}
            {Number(order.AppFeeAmount) > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Biaya layanan</dt><dd>{formatCurrency(order.AppFeeAmount)}</dd></div>}
            {Number(order.TaxAmount) > 0 && <div className="flex justify-between"><dt className="text-ink-soft">PPN</dt><dd>{formatCurrency(order.TaxAmount)}</dd></div>}
            {order.ShippingCost > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Ongkir</dt><dd>{formatCurrency(order.ShippingCost)}</dd></div>}
            <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatCurrency(total)}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-soft">
            {order.PaidAt && <span>Dibayar {formatDateTime(order.PaidAt)}{order.PaymentMethod ? ` · ${order.PaymentMethod}` : ""}</span>}
            {order.Shipping && (
              <span>
                {order.Shipping.Type === "PICKUP" ? "Ambil di toko" : order.Shipping.Courier || "Kurir"}
                {order.Shipping.TrackingNumber ? ` · Resi ${order.Shipping.TrackingNumber}` : ""}
              </span>
            )}
            {order.Rating != null && <span>Rating ★ {order.Rating}/5</span>}
            {order.Notes && <span>Catatan: {order.Notes}</span>}
          </div>
          {order.Kind === "ORDER" && (
            <Link href={`/dashboard/orders/${order.Id}`}>
              <Button type="button" size="sm" variant="outline">
                Buka Detail Pesanan
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, loading } = useAuth();
  const { data, error, isLoading } = useSWR(isAdmin ? ["admin-customer", id] : null, () => apiFetch<CustomerDetail>(`admin/customers/${id}`));

  if (loading || (isAdmin && isLoading)) return <FullPageSpinner />;
  if (!isAdmin) return <EmptyState icon={User} title="Khusus admin" description="Halaman ini hanya untuk admin." />;
  const c = data?.data;
  if (error || !c) return <EmptyState icon={User} title="Customer tidak ditemukan" description="Customer ini tidak ada atau sudah dihapus." />;

  const age = ageOf(c.BirthDate);
  const orders = c.Orders.filter((o) => o.Kind === "ORDER");
  const tokens = c.Orders.filter((o) => o.Kind === "TOKEN");

  return (
    <div className="space-y-5">
      <Link href="/dashboard/customers" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Kembali ke daftar customer
      </Link>

      <Card>
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <CustomerAvatar src={c.Avatar} name={c.FullName} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-ink">{c.FullName ?? "-"}</h1>
              {c.UserLevel && <Badge tone="brand">{c.UserLevel}</Badge>}
            </div>
            <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              <Info icon={Mail} label="Email" value={c.Email ?? "-"} />
              <Info icon={Phone} label="No HP" value={c.Phone || "-"} />
              <Info icon={MessageCircle} label="WhatsApp" value={c.WhatsappNumber || "-"} />
              <Info icon={User} label="Jenis kelamin" value={genderLabel(c.Gender)} />
              <Info icon={Cake} label="Tanggal lahir" value={c.BirthDate ? `${formatDate(c.BirthDate)}${age !== null ? ` (${age} th)` : ""}` : "-"} />
              <Info icon={User} label="Terdaftar" value={c.CreatedAt ? formatDate(c.CreatedAt) : "-"} />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold text-ink-soft">Total Belanja</p>
          <p className="mt-1 text-lg font-extrabold text-ink">{formatCurrency(c.Summary.Spent)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold text-ink-soft">Pesanan Dibayar</p>
          <p className="mt-1 text-lg font-extrabold text-ink">{c.Summary.PaidOrders} <span className="text-sm font-medium text-ink-faint">/ {c.Summary.Orders}</span></p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold text-ink-soft">Item Dibeli</p>
          <p className="mt-1 text-lg font-extrabold text-ink">{c.Summary.ItemsBought}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold text-ink-soft">Pembelian Token</p>
          <p className="mt-1 text-lg font-extrabold text-ink">{c.Summary.TokenPurchases}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-4" /> Alamat Kirim
          </CardTitle>
        </CardHeader>
        <CardBody>
          {c.Addresses.length === 0 ? (
            <p className="text-sm text-ink-soft">Customer belum menyimpan alamat.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {c.Addresses.map((a) => (
                <div key={a.Id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink">{a.Label || "Alamat"}</p>
                    {a.IsDefault && <Badge tone="brand">Utama</Badge>}
                  </div>
                  <p className="mt-1 text-ink">
                    {a.RecipientName}
                    {a.Phone ? ` · ${a.Phone}` : ""}
                  </p>
                  <p className="text-ink-soft">
                    {[a.Address, a.City?.Name, a.Province?.Name, a.PostalCode].filter(Boolean).join(", ")}
                  </p>
                  {a.Latitude != null && a.Longitude != null ? (
                    <a
                      href={mapsUrl(a.Latitude, a.Longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-purple"
                    >
                      <ExternalLink className="size-3.5" /> Lihat titik di Google Maps
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-brand-orange-deep">Belum di-pin di peta</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="size-4" /> Riwayat Pesanan ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {orders.length === 0 ? (
            <p className="text-sm text-ink-soft">Belum ada pesanan.</p>
          ) : (
            orders.map((o) => <OrderCard key={o.Id} order={o} />)
          )}
        </CardBody>
      </Card>

      {tokens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-4" /> Pembelian Token AI ({tokens.length})
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {tokens.map((o) => (
              <OrderCard key={o.Id} order={o} />
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

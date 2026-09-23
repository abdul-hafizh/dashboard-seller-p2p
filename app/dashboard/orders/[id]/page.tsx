"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { ArrowLeft, Package, History, FileText, Box, Download, ImageOff, Clock, User, MapPin, Tag, Truck, RefreshCw } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Model3DViewer } from "@/components/Model3DViewer";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/resources/format";
import { downloadInvoice } from "@/lib/download-invoice";

interface OrderStatus {
  Id: number;
  Name: string;
}

interface AIModelPreview {
  Id: string;
  PreviewPath: string | null;
}

interface AIModelFile {
  Id: string;
  FileType: string;
  FilePath: string | null;
}

interface AIJobRef {
  Id: string;
  Note: string | null;
}

interface AIModel {
  Id: string;
  ModelName: string | null;
  Previews?: AIModelPreview[];
  Files?: AIModelFile[];
  Job?: AIJobRef | null;
}

interface OrderItem {
  Id: string;
  Quantity: number | null;
  UnitPrice: number | null;
  MaterialId: number | null;
  PrintProfileId: number | null;
  AIModel?: AIModel | null;
}

interface StatusHistoryEntry {
  Id: number;
  StatusId: number;
  Remarks: string | null;
  CreatedAt: string | null;
}

interface CustomerUser {
  FullName: string | null;
  Email: string | null;
  Phone: string | null;
  WhatsappNumber: string | null;
  UserLevel?: string | null;
  TotalSpent?: number | null;
}

interface OrderCustomer {
  Id: string;
  CompanyName: string | null;
  User?: CustomerUser | null;
}

interface OrderMerchant {
  Id: string;
  FullName: string | null;
  Email: string | null;
  Phone: string | null;
  WhatsappNumber: string | null;
  Company?: { Id: string; Name: string | null } | null;
  Branch?: { Id: string; Name: string | null } | null;
}

interface AddressRegion {
  Id: number;
  Name: string;
}

interface ShippingAddress {
  Id: string;
  RecipientName: string | null;
  Phone: string | null;
  Address: string | null;
  PostalCode: string | null;
  City?: AddressRegion | null;
  Province?: AddressRegion | null;
}

interface PaymentSummary {
  Id: string;
  Status: string | null;
}

interface ShipmentMethodInfo {
  Id: number;
  Name: string | null;
  Provider: string | null;
  ShippingType: string | null;
}

interface ShipmentServiceInfo {
  Id: number;
  ServiceName: string | null;
  ServiceCategory: string | null;
  EstimatedDelivery: string | null;
}

interface ShipmentInfo {
  Id: string;
  CourierCompany: string | null;
  CourierType: string | null;
  CourierServiceName: string | null;
  ShippingCost: number | null;
  PackageWeight: number | null;
  Status: string | null;
  TrackingNumber: string | null;
  ShippingMethod?: ShipmentMethodInfo | null;
  ShippingService?: ShipmentServiceInfo | null;
}

interface TrackingHistoryEntry {
  status?: string | null;
  note?: string | null;
  updated_at?: string | null;
  service_type?: string | null;
}

interface TrackingResult {
  status: string;
  biteshipStatus: string;
  history: TrackingHistoryEntry[];
}

interface OrderDetail {
  Id: string;
  OrderNumber: string | null;
  CustomerId: string | null;
  StatusId: number | null;
  TotalAmount: number | null;
  SubtotalAmount?: number | null;
  Notes: string | null;
  Rating: number | null;
  RatingNotes: string | null;
  CreatedAt: string | null;
  Status: OrderStatus | null;
  Items?: OrderItem[];
  StatusHistories?: StatusHistoryEntry[];
  Customer?: OrderCustomer | null;
  Merchant?: OrderMerchant | null;
  ShippingAddress?: ShippingAddress | null;
  Payments?: PaymentSummary[];
  Shipments?: ShipmentInfo[];
}

/** Mirrors flutter_meshy1's shippingCategoryLabel() so the merchant and
 * customer see the same category name for a shipment. */
function shippingCategoryLabel(shippingType: string | null | undefined): string {
  switch ((shippingType ?? "").toUpperCase()) {
    case "INSTANT_SHIPMENT":
      return "Instan";
    case "REGULAR_SHIPMENT":
      return "Reguler";
    case "REGULAR_CARGO_SHIPMENT":
      return "Kargo";
    case "INTERNATIONAL_CARGO_SHIPMENT":
      return "Internasional";
    case "INTERNAL_SHIPMENT":
      return "Internal";
    default:
      return "Lainnya";
  }
}

export default function OrderDetailPage() {
  const { isAdmin } = useAuth();
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
  const [expiredPreviews, setExpiredPreviews] = useState<Set<string>>(new Set());
  const [priceInput, setPriceInput] = useState<string>("");
  const [updatingPrice, setUpdatingPrice] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [tracking, setTracking] = useState<Record<string, TrackingResult>>({});
  const [trackingLoading, setTrackingLoading] = useState<Record<string, boolean>>({});

  // Keep the price field synced with the fetched order — re-runs after
  // mutate() too, so a successful save shows the newly-saved value back.
  useEffect(() => {
    // The input is the item price (before PPN / app fee / discount); older
    // orders without a stored subtotal fall back to the total.
    const amount = data?.data.SubtotalAmount ?? data?.data.TotalAmount;
    setPriceInput(amount != null && amount > 0 ? String(amount) : "");
  }, [data?.data.SubtotalAmount, data?.data.TotalAmount]);

  if (isLoading || !data) return <FullPageSpinner />;

  const order = data.data;
  const statuses = statusesData?.data ?? [];
  const statusName = (id: number | null) => statuses.find((s) => s.Id === id)?.Name ?? `#${id}`;
  const models = (order.Items ?? []).map((item) => item.AIModel).filter((m): m is AIModel => Boolean(m));
  // Once a payment is PAID, the customer already paid this exact amount —
  // changing it afterwards would no longer match what was actually charged
  // (see api-meshy's PaymentController.createSnapToken, which locks the
  // amount in at snap-token creation), so price editing is locked from here on.
  const isPaid = (order.Payments ?? []).some((p) => p.Status === "PAID");

  const handleDownloadInvoice = async () => {
    setDownloadingInvoice(true);
    try {
      await downloadInvoice(order.Id, order.OrderNumber);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunduh invoice.");
    } finally {
      setDownloadingInvoice(false);
    }
  };

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

  const updatePrice = async () => {
    const amount = Number(priceInput);
    if (!priceInput || Number.isNaN(amount) || amount <= 0) {
      toast.error("Masukkan harga yang valid (lebih dari 0).");
      return;
    }
    setUpdatingPrice(true);
    try {
      await apiFetch(`orders/${orderId}`, { method: "PUT", json: { SubtotalAmount: amount } });
      toast.success("Harga pesanan berhasil disimpan");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal menyimpan harga.");
    } finally {
      setUpdatingPrice(false);
    }
  };

  // Backend's GET /shipments/:id/track already scopes access to the
  // requester (merchant → only their own orders, admin → any order), so no
  // role check is needed here — this button behaves correctly for both.
  const markShipped = async () => {
    setShipping(true);
    try {
      await apiFetch(`orders/${orderId}/ship`, { method: "POST", json: {} });
      toast.success("Pesanan ditandai sedang dikirim");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal menandai pesanan dikirim.");
    } finally {
      setShipping(false);
    }
  };

  const trackShipment = async (shipmentId: string) => {
    setTrackingLoading((prev) => ({ ...prev, [shipmentId]: true }));
    try {
      const res = await apiFetch<TrackingResult>(`shipments/${shipmentId}/track`);
      setTracking((prev) => ({ ...prev, [shipmentId]: res.data }));
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal melacak pengiriman.");
    } finally {
      setTrackingLoading((prev) => ({ ...prev, [shipmentId]: false }));
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
        <div className="ml-auto flex items-center gap-2">
          {isPaid && (
            <Button variant="outline" size="sm" loading={downloadingInvoice} onClick={handleDownloadInvoice}>
              <FileText className="size-4" /> Unduh Invoice
            </Button>
          )}
          <Badge tone="info">{order.Status?.Name ?? "-"}</Badge>
        </div>
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
                <p className="text-xs font-semibold text-ink-soft">Pelanggan</p>
                <p className="mt-0.5 font-bold text-ink">
                  {order.Customer?.User?.FullName ?? order.Customer?.CompanyName ?? "-"}
                </p>
              </div>
              {isAdmin && (
                <div>
                  <p className="text-xs font-semibold text-ink-soft">Merchant</p>
                  <p className="mt-0.5 font-bold text-ink">
                    {order.Merchant?.Branch?.Name ?? order.Merchant?.Company?.Name ?? order.Merchant?.FullName ?? "-"}
                  </p>
                  {(order.Merchant?.Company?.Name || order.Merchant?.Phone || order.Merchant?.WhatsappNumber) && (
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {order.Merchant?.Branch?.Name && order.Merchant.Company?.Name}
                      {order.Merchant?.Branch?.Name && order.Merchant.Company?.Name && " · "}
                      {order.Merchant?.Phone ?? order.Merchant?.WhatsappNumber}
                    </p>
                  )}
                </div>
              )}
              {order.Rating != null && (
                <div>
                  <p className="text-xs font-semibold text-ink-soft">Rating</p>
                  <p className="mt-0.5 text-ink">{order.Rating} / 5</p>
                </div>
              )}
              {order.Rating != null && order.RatingNotes && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-ink-soft">Komentar Pelanggan</p>
                  <p className="mt-0.5 whitespace-pre-line text-ink">{order.RatingNotes}</p>
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

          {models.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="size-4" /> Hasil Generate 3D
                </CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-5">
                {models.map((model) => {
                  const previewUrl = model.Previews?.[0]?.PreviewPath;
                  const previewExpired = expiredPreviews.has(model.Id);
                  const files = model.Files ?? [];
                  const glbFile = files.find((f) => f.FileType?.toUpperCase() === "GLB");
                  return (
                    <div key={model.Id} className={`flex flex-col gap-3 ${glbFile ? "" : "sm:flex-row"}`}>
                      <div
                        className={`flex shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl bg-surface-muted ${
                          glbFile ? "h-80 w-full" : "size-40"
                        }`}
                      >
                        {glbFile ? (
                          <Model3DViewer
                            src={`/api/backend/ai/jobs/files/${glbFile.Id}`}
                            alt={model.ModelName ?? "Hasil 3D"}
                          />
                        ) : previewUrl && !previewExpired ? (
                          // eslint-disable-next-line @next/next/no-img-element -- external, per-signed Meshy CDN URL, not worth Next/Image's remote-pattern config for a single admin page
                          <img
                            src={previewUrl}
                            alt={model.ModelName ?? "Hasil 3D"}
                            className="size-full object-cover"
                            onError={() => setExpiredPreviews((prev) => new Set(prev).add(model.Id))}
                          />
                        ) : previewUrl ? (
                          <>
                            <Clock className="size-6 text-ink-faint" />
                            <p className="px-2 text-center text-[11px] text-ink-faint">Pratinjau kedaluwarsa</p>
                          </>
                        ) : (
                          <ImageOff className="size-6 text-ink-faint" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-2">
                        <p className="text-sm font-semibold text-ink">{model.ModelName ?? "Model 3D"}</p>
                        {model.Job?.Note && (
                          <div className="rounded-xl border border-brand-purple/20 bg-brand-purple/5 p-3">
                            <p className="text-xs font-semibold text-brand-purple">Catatan dari Customer</p>
                            <p className="mt-1 text-sm text-ink">{model.Job.Note}</p>
                          </div>
                        )}
                        {files.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {files.map((file) =>
                              file.FilePath ? (
                                <a
                                  key={file.Id}
                                  href={file.FilePath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted"
                                >
                                  <Download className="size-3.5" /> {file.FileType}
                                </a>
                              ) : null,
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-ink-soft">Belum ada file model.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          )}

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
                        <p className="text-xs text-ink-faint">{formatDateTime(h.CreatedAt)}</p>
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
                <User className="size-4" /> Pelanggan
              </CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3 text-sm">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-ink">
                    {order.Customer?.User?.FullName ?? order.Customer?.CompanyName ?? "-"}
                  </p>
                  {order.Customer?.User?.UserLevel && <Badge tone="brand">{order.Customer.User.UserLevel}</Badge>}
                </div>
                {order.Customer?.User?.Email && <p className="text-xs text-ink-soft">{order.Customer.User.Email}</p>}
                {(order.Customer?.User?.Phone || order.Customer?.User?.WhatsappNumber) && (
                  <p className="text-xs text-ink-soft">
                    {order.Customer?.User?.Phone ?? order.Customer?.User?.WhatsappNumber}
                  </p>
                )}
                {order.Customer?.User?.TotalSpent != null && (
                  <p className="mt-1 text-xs text-ink-soft">
                    Total belanja: <span className="font-semibold text-ink">{formatCurrency(order.Customer.User.TotalSpent)}</span>
                  </p>
                )}
              </div>
              <div className="border-t border-border pt-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                  <MapPin className="size-3.5" /> Alamat Pengiriman
                </p>
                {order.ShippingAddress ? (
                  <div className="text-ink-soft">
                    {order.ShippingAddress.RecipientName && (
                      <p className="font-semibold text-ink">{order.ShippingAddress.RecipientName}</p>
                    )}
                    {order.ShippingAddress.Phone && <p>{order.ShippingAddress.Phone}</p>}
                    {order.ShippingAddress.Address && <p>{order.ShippingAddress.Address}</p>}
                    <p>
                      {[order.ShippingAddress.City?.Name, order.ShippingAddress.Province?.Name, order.ShippingAddress.PostalCode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                ) : (
                  <p className="text-ink-faint">Alamat belum diisi.</p>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="size-4" /> Pengiriman
              </CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-2 text-sm">
              {order.Shipments && order.Shipments.length > 0 ? (
                order.Shipments.map((shipment) => (
                  <div key={shipment.Id} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-ink">
                        {shipment.CourierCompany || shipment.ShippingMethod?.Name || "-"}
                        {shipment.CourierServiceName ? ` · ${shipment.CourierServiceName}` : ""}
                      </p>
                      <Badge tone="brand">{shippingCategoryLabel(shipment.ShippingMethod?.ShippingType)}</Badge>
                    </div>
                    <p className="text-xs text-ink-soft">
                      Ongkir: <span className="font-semibold text-ink">{formatCurrency(shipment.ShippingCost)}</span>
                      {shipment.PackageWeight != null ? ` · ${shipment.PackageWeight} gram` : ""}
                    </p>
                    {shipment.TrackingNumber && (
                      <p className="text-xs text-ink-soft">No. Resi: {shipment.TrackingNumber}</p>
                    )}
                    <Badge tone={shipment.Status === "DELIVERED" ? "success" : "info"} className="w-fit">
                      {shipment.Status ?? "PENDING"}
                    </Badge>
                    {isPaid && (shipment.Status ?? "PENDING") === "PENDING" && (
                      <Button size="sm" className="w-fit" onClick={markShipped} loading={shipping}>
                        Tandai Sudah Dikirim
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => trackShipment(shipment.Id)}
                      loading={trackingLoading[shipment.Id]}
                    >
                      <RefreshCw className="size-3.5" /> Lacak Pengiriman
                    </Button>
                    {tracking[shipment.Id] && (
                      <div className="mt-1 flex flex-col gap-2 border-t border-border pt-2">
                        <p className="text-xs font-semibold text-ink-soft">
                          Status Biteship: <span className="text-ink">{tracking[shipment.Id].biteshipStatus}</span>
                        </p>
                        {tracking[shipment.Id].history.length > 0 ? (
                          <ol className="flex flex-col gap-2">
                            {tracking[shipment.Id].history.map((h, idx) => (
                              <li key={idx} className="flex gap-2 text-xs">
                                <div className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-purple" />
                                <div>
                                  <p className="font-semibold text-ink">{h.note || h.status || "-"}</p>
                                  {h.updated_at && <p className="text-ink-faint">{formatDateTime(h.updated_at)}</p>}
                                </div>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-xs text-ink-faint">Belum ada riwayat perjalanan dari kurir.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-ink-faint">Pelanggan belum memilih jasa kirim.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="size-4" /> Atur Harga
              </CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              {isPaid ? (
                <>
                  <p className="text-sm font-bold text-ink">{formatCurrency(order.TotalAmount)}</p>
                  <p className="text-xs text-ink-soft">
                    Pesanan ini sudah dibayar pelanggan sesuai harga di atas — harga tidak dapat diubah lagi.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-ink-soft">
                    {(order.TotalAmount ?? 0) <= 0
                      ? "Pelanggan menunggu harga ini sebelum bisa melanjutkan ke pembayaran & pengiriman."
                      : "Pelanggan sudah bisa melihat harga ini dan melanjutkan ke pembayaran."}
                  </p>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Contoh: 150000"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                  />
                  <p className="text-xs text-ink-soft">
                    Isi harga barang saja — PPN, biaya layanan aplikasi, dan diskon tier pelanggan ditambahkan otomatis.
                  </p>
                  <Button onClick={updatePrice} loading={updatingPrice} disabled={!priceInput}>
                    {(order.TotalAmount ?? 0) <= 0 ? "Kirim Harga" : "Simpan Perubahan"}
                  </Button>
                </>
              )}
            </CardBody>
          </Card>

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

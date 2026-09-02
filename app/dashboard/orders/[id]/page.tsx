"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { ArrowLeft, Package, History, FileText, Box, Download, ImageOff, Clock, User, MapPin, Tag } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Model3DViewer } from "@/components/Model3DViewer";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/resources/format";

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

interface AIModel {
  Id: string;
  ModelName: string | null;
  Previews?: AIModelPreview[];
  Files?: AIModelFile[];
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
}

interface OrderCustomer {
  Id: string;
  CompanyName: string | null;
  User?: CustomerUser | null;
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

interface OrderDetail {
  Id: string;
  OrderNumber: string | null;
  CustomerId: string | null;
  StatusId: number | null;
  TotalAmount: number | null;
  Notes: string | null;
  Rating: number | null;
  RatingNotes: string | null;
  CreatedAt: string | null;
  Status: OrderStatus | null;
  Items?: OrderItem[];
  StatusHistories?: StatusHistoryEntry[];
  Customer?: OrderCustomer | null;
  ShippingAddress?: ShippingAddress | null;
  Payments?: PaymentSummary[];
}

export default function OrderDetailPage() {
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

  // Keep the price field synced with the fetched order — re-runs after
  // mutate() too, so a successful save shows the newly-saved value back.
  useEffect(() => {
    const amount = data?.data.TotalAmount;
    setPriceInput(amount != null && amount > 0 ? String(amount) : "");
  }, [data?.data.TotalAmount]);

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
      await apiFetch(`orders/${orderId}`, { method: "PUT", json: { TotalAmount: amount } });
      toast.success("Harga pesanan berhasil disimpan");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal menyimpan harga.");
    } finally {
      setUpdatingPrice(false);
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
        <Badge tone="info" className="ml-auto">
          {order.Status?.Name ?? "-"}
        </Badge>
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
              {order.Rating != null && (
                <div>
                  <p className="text-xs font-semibold text-ink-soft">Rating</p>
                  <p className="mt-0.5 text-ink">{order.Rating} / 5</p>
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
                <p className="font-bold text-ink">
                  {order.Customer?.User?.FullName ?? order.Customer?.CompanyName ?? "-"}
                </p>
                {order.Customer?.User?.Email && <p className="text-xs text-ink-soft">{order.Customer.User.Email}</p>}
                {(order.Customer?.User?.Phone || order.Customer?.User?.WhatsappNumber) && (
                  <p className="text-xs text-ink-soft">
                    {order.Customer?.User?.Phone ?? order.Customer?.User?.WhatsappNumber}
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

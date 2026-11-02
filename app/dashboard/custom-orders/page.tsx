"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Search, FilePlus2, User, CheckCircle2, RotateCcw, Box, Download, Upload, Truck, RefreshCw, Send, Pencil, XCircle } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/resources/format";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatCurrency } from "@/lib/resources/format";
import { MasterPriceFields } from "@/components/pricing/MasterPriceFields";
import { PrintFileImages, printFileUrl } from "@/components/printfiles/PrintFileCard";
import { formatFileSize } from "@/components/merchants/MerchantDocumentsCard";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ITEM_CATEGORIES } from "@/lib/item-category";
import { ColorTypeSelect } from "@/components/orders/ColorTypeSelect";

interface PrintFileRow {
  Id: string;
  CustomerUserId: string;
  FileName: string;
  FileSize: number;
  MaterialName: string | null;
  Quantity: number;
  Notes: string | null;
  /** The customer ticked "Gunakan jasa edit" in the app. */
  EditServiceRequested?: boolean | null;
  /** Gambar referensi the customer sent with it. */
  Images?: { Id: string }[];
  /** The penawaran it's quoted in (until that becomes an order). */
  QuoteId?: string | null;
  CreatedAt: string;
  Customer?: CustomerUser | null;
}

interface CustomerUser {
  Id: string;
  FullName: string | null;
  Email: string | null;
  Phone: string | null;
  WhatsappNumber: string | null;
}

interface AddressOption {
  Id: string;
  Label: string | null;
  RecipientName: string | null;
  Address: string | null;
  IsDefault: boolean;
}

type QuoteStatus = "SENT" | "ACCEPTED" | "REJECTED" | "ORDERED" | "CANCELLED";

/** A penawaran (api-meshy CustomQuoteController quoteJson). */
interface Quote {
  Id: string;
  QuoteNumber: string;
  Status: QuoteStatus;
  StatusLabel: string;
  Revision: number;
  CustomerUserId: string;
  MaterialName: string | null;
  ColorType: string | null;
  Quantity: number;
  WeightGrams: number | null;
  PackageWeight: number | null;
  EditServiceFee: number | null;
  Notes: string | null;
  RejectReason: string | null;
  OrderId: string | null;
  UpdatedAt: string;
  Customer?: CustomerUser | null;
  PrintFiles?: { Id: string; FileName: string }[];
  Pricing: { PayableAmount: number; SubtotalAmount: number; EditServiceFee: number };
}

const QUOTE_TONE: Record<QuoteStatus, "warning" | "success" | "error" | "neutral" | "info"> = {
  SENT: "warning",
  ACCEPTED: "info",
  REJECTED: "error",
  ORDERED: "success",
  CANCELLED: "neutral",
};

/** One Biteship rate (same fields the app's checkout reads). */
// The customer picks the courier when paying, so the seller's Biteship
// courier picker is hidden (kept for later — set true to show it again).
const SELLER_PICKS_COURIER = false;

interface ShippingRate {
  key: string;
  courierCode: string;
  serviceCode: string;
  courierName: string;
  serviceName: string;
  price: number;
  duration: string | null;
}

function parseRate(raw: Record<string, unknown>): ShippingRate {
  const str = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (v !== undefined && v !== null && String(v) !== "") return String(v);
    }
    return null;
  };
  const courierCode = str("courier_code", "company", "courier_company") ?? "";
  const serviceCode = str("courier_service_code", "type", "courier_type") ?? "";
  const range = str("shipment_duration_range", "duration_range");
  const unit = str("shipment_duration_unit", "duration_unit");
  return {
    key: `${courierCode}:${serviceCode}`,
    courierCode,
    serviceCode,
    courierName: str("courier_name") ?? courierCode.toUpperCase(),
    serviceName: str("courier_service_name", "service_name") ?? serviceCode.toUpperCase(),
    price: Math.round(Number(raw.price ?? 0)) || 0,
    duration: str("duration") ?? (range ? `${range} ${unit === "hours" ? "jam" : "hari"}` : null),
  };
}

const PRINT_FILE_ACCEPT = ".stl,.obj,.3mf,.step,.stp";

// The seller types the package weight in kg; Biteship and the backend take grams.
const packageGrams = (kg: string) => Math.round(Number(kg) * 1000);

export default function CustomOrdersPage() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerUser | null>(null);
  const [addresses, setAddresses] = useState<AddressOption[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const [form, setForm] = useState({
    quantity: "1",
    materialName: "",
    colorType: "",
    itemWeight: "",
    packageWeight: "",
    shippingAddressId: "",
    notes: "",
    editServiceFee: "",
    sendToChat: true,
  });
  // Biteship rates for the chosen address + package weight. No rate picked =
  // the customer chooses the courier themselves when paying.
  const [rates, setRates] = useState<ShippingRate[] | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [rateKey, setRateKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Quote | null>(null);
  // Set while changing a sent / declined penawaran ("Ubah & Kirim Ulang").
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const { data: quotesData, mutate: mutateQuotes } = useSWR("custom-quotes", () => apiFetch<Quote[]>("custom-quotes"));
  const quotes = quotesData?.data ?? [];
  // Ready-to-print files this customer sent from the app (not yet in an order).
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const { data: filesData, mutate: mutateFiles } = useSWR(
    selectedCustomer ? ["print-files", selectedCustomer.Id] : null,
    () => apiFetch<PrintFileRow[]>("print-files", { query: { customerUserId: selectedCustomer!.Id, unlinked: 1 } }),
  );
  const customerFiles = filesData?.data ?? [];
  // A picked file asked for jasa edit: the store must price it before the order is made.
  const editRequested = customerFiles.some((f) => f.EditServiceRequested && selectedFileIds.includes(f.Id));
  const editFee = Math.round(Number(form.editServiceFee));

  async function editQuote(q: Quote) {
    if (!q.Customer) return;
    await pickCustomer(q.Customer);
    setEditingQuote(q);
    setSelectedFileIds((q.PrintFiles ?? []).map((f) => f.Id));
    setForm((prev) => ({
      ...prev,
      quantity: String(q.Quantity || 1),
      materialName: q.MaterialName || "",
      colorType: q.ColorType || "",
      itemWeight: q.WeightGrams != null ? String(q.WeightGrams) : "",
      packageWeight: q.PackageWeight ? String(q.PackageWeight / 1000) : "",
      notes: q.Notes || "",
      editServiceFee: q.EditServiceFee ? String(q.EditServiceFee) : "",
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function cancelQuote(q: Quote) {
    if (!window.confirm(`Batalkan penawaran ${q.QuoteNumber}? Bila sudah di keranjang customer, item itu ikut dihapus.`)) return;
    try {
      await apiFetch(`custom-quotes/${q.Id}/cancel`, { method: "POST" });
      toast.success("Penawaran dibatalkan.");
      await Promise.all([mutateQuotes(), mutateFiles()]);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal membatalkan penawaran.");
    }
  }

  useEffect(() => {
    const quoteId = new URLSearchParams(window.location.search).get("quoteId");
    if (!quoteId) return;
    apiFetch<Quote>(`custom-quotes/${quoteId}`)
      .then((res) => {
        if (res.data.Status === "SENT" || res.data.Status === "REJECTED") return editQuote(res.data);
        toast.info(`Penawaran ${res.data.QuoteNumber}: ${res.data.StatusLabel}`);
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Penawaran tidak ditemukan."));
    // Runs once, on arrival from the chat card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opened from a chat's "Buat Pesanan Manual" (?printFileId=): preselect
  // that customer and file, and prefill item, quantity and material.
  useEffect(() => {
    const printFileId = new URLSearchParams(window.location.search).get("printFileId");
    if (!printFileId) return;
    apiFetch<PrintFileRow>(`print-files/${printFileId}`)
      .then(async (res) => {
        const f = res.data;
        if (!f.Customer) return;
        await pickCustomer(f.Customer);
        setSelectedFileIds([f.Id]);
        setForm((prev) => ({
          ...prev,
          quantity: String(f.Quantity || 1),
          materialName: f.MaterialName || prev.materialName,
          notes: prev.notes || f.Notes || "",
        }));
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "File cetak tidak ditemukan."));
    // Runs once, on arrival from the chat link.
  }, []);

  // Rates follow the address and package weight (debounced while typing) —
  // only while the seller picks the courier (see SELLER_PICKS_COURIER).
  const ratesQueryKey = SELLER_PICKS_COURIER && selectedCustomer && form.shippingAddressId && Number(form.packageWeight) > 0
    ? `${selectedCustomer.Id}|${form.shippingAddressId}|${packageGrams(form.packageWeight)}`
    : "";
  useEffect(() => {
    if (!ratesQueryKey) return;
    const handle = setTimeout(() => {
      void loadRates();
    }, 600);
    return () => clearTimeout(handle);
    // loadRates reads the same inputs ratesQueryKey is built from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratesQueryKey]);

  async function loadRates() {
    if (!selectedCustomer || !form.shippingAddressId || !(Number(form.packageWeight) > 0)) return;
    setRatesLoading(true);
    setRatesError(null);
    try {
      const res = await apiFetch<Record<string, unknown>[]>("orders/custom-quote/shipping-rates", {
        method: "POST",
        json: {
          customerUserId: selectedCustomer.Id,
          userAddressId: form.shippingAddressId,
          packageWeight: packageGrams(form.packageWeight),
        },
      });
      const list = (res.data ?? []).map(parseRate).filter((r) => r.courierCode && r.price > 0).sort((a, b) => a.price - b.price);
      setRates(list);
      setRateKey((k) => (list.some((r) => r.key === k) ? k : ""));
    } catch (error) {
      setRates(null);
      setRateKey("");
      setRatesError(error instanceof ApiError ? error.message : "Gagal mengecek ongkir Biteship.");
    } finally {
      setRatesLoading(false);
    }
  }

  // The seller saves a file the customer sent as a plain chat attachment.
  async function uploadFile(file: File | undefined) {
    if (!file || !selectedCustomer) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("CustomerUserId", selectedCustomer.Id);
      body.append("Quantity", String(Math.max(1, Number(form.quantity) || 1)));
      if (form.materialName) body.append("MaterialName", form.materialName);
      const res = await apiFetch<PrintFileRow>("print-files", { method: "POST", formData: body });
      await mutateFiles();
      setSelectedFileIds((ids) => (ids.includes(res.data.Id) ? ids : [...ids, res.data.Id]));
      toast.success(`${file.name} diunggah dan dipilih untuk pesanan ini.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal mengunggah file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // A stale `customers` list from a previous query is harmless once search
  // is cleared — every read below is gated on `search.trim()` too.
  useEffect(() => {
    const term = search.trim();
    if (!term) return;
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiFetch<CustomerUser[]>("customers/search-users", { query: { search: term } });
        setCustomers(res.data);
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "Gagal mencari customer.");
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [search]);

  // Picking a customer loads their saved addresses so the merchant can choose
  // where this order ships (the default address is preselected).
  async function pickCustomer(customer: CustomerUser) {
    setSelectedCustomer(customer);
    setSelectedFileIds([]);
    setCreatedOrder(null);
    setEditingQuote(null);
    setForm((f) => ({ ...f, shippingAddressId: "" }));
    setRates(null);
    setRateKey("");
    setRatesError(null);
    setAddresses([]);
    setLoadingAddresses(true);
    try {
      const res = await apiFetch<AddressOption[]>(`user-addresses/user/${customer.Id}`);
      setAddresses(res.data);
      const preferred = res.data.find((a) => a.IsDefault) || res.data[0];
      if (preferred) setForm((f) => ({ ...f, shippingAddressId: preferred.Id }));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal memuat alamat customer.");
    } finally {
      setLoadingAddresses(false);
    }
  }

  const resetAll = () => {
    setSelectedFileIds([]);
    setSelectedCustomer(null);
    setAddresses([]);
    setCreatedOrder(null);
    setEditingQuote(null);
    setSearch("");
    setCustomers(null);
    setForm({
      quantity: "1",
      materialName: "",
      colorType: "",
      itemWeight: "",
      packageWeight: "",
      shippingAddressId: "",
      notes: "",
      editServiceFee: "",
      sendToChat: true,
    });
    setRates(null);
    setRateKey("");
    setRatesError(null);
  };

  // Package weight is required: the customer's courier quote at checkout is
  // based on it (customers never enter a weight themselves).
  const canSubmit =
    !!selectedCustomer &&
    form.materialName.length > 0 &&
    form.colorType.length > 0 &&
    Number(form.itemWeight) > 0 &&
    packageGrams(form.packageWeight) > 0 &&
    (!editRequested || editFee > 0) &&
    !submitting;

  // Sends the penawaran to the customer's chat (or the changed one again).
  // The order is only made once the customer agrees and checks out.
  const handleSubmit = async () => {
    if (!selectedCustomer) return;
    setSubmitting(true);
    try {
      const json = {
        customerUserId: selectedCustomer.Id,
        quantity: Number(form.quantity) || 1,
        materialName: form.materialName,
        colorType: form.colorType,
        itemWeight: Number(form.itemWeight),
        packageWeight: packageGrams(form.packageWeight),
        notes: form.notes || undefined,
        printFileIds: selectedFileIds,
        editServiceFee: editRequested ? editFee : undefined,
      };
      const res = editingQuote
        ? await apiFetch<Quote>(`custom-quotes/${editingQuote.Id}`, { method: "PUT", json })
        : await apiFetch<Quote>("custom-quotes", { method: "POST", json });
      setCreatedOrder(res.data);
      setEditingQuote(null);
      await Promise.all([mutateQuotes(), mutateFiles()]);
      toast.success(res.message || "Penawaran terkirim ke chat customer.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal mengirim penawaran.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Pesanan Custom (File Siap Print)</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Kirim penawaran harga untuk file siap cetak yang dikirim customer lewat chat. Harga dihitung otomatis dari bahan &
          berat (Master Harga). Customer menyetujui penawaran di chat sehingga masuk ke keranjangnya, lalu memilih jasa kirim
          dan membayar saat checkout — pesanan baru dibuat saat itu. Bila customer menolak, ubah harganya dan kirim ulang.
          Fee transaksi dan admin fee dipotong dari hasil jualan Anda.
        </p>
      </div>

      {createdOrder ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <h2 className="text-lg font-bold text-ink">Penawaran terkirim ke chat customer</h2>
            <p className="text-sm text-ink-soft">
              No. Penawaran <span className="font-semibold text-ink">{createdOrder.QuoteNumber}</span>
              {createdOrder.Revision > 1 ? ` (revisi ${createdOrder.Revision})` : ""}
            </p>
            <p className="text-2xl font-extrabold text-ink">{formatCurrency(createdOrder.Pricing.PayableAmount)}</p>
            <p className="text-xs text-ink-faint">Belum termasuk ongkir — dipilih customer saat checkout.</p>
            <Button variant="outline" className="mt-2" onClick={resetAll}>
              <RotateCcw className="size-4" /> Buat Penawaran Lain
            </Button>
          </CardBody>
        </Card>
      ) : !selectedCustomer ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="size-4" /> Cari Customer
            </CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, atau nomor HP customer..."
            />
            {searching && <FullPageSpinner />}
            {!searching && search.trim() && customers?.length === 0 && (
              <EmptyState icon={User} title="Tidak ditemukan" description="Tidak ada customer yang cocok dengan pencarian ini." />
            )}
            {!searching && customers && customers.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {customers.map((c) => (
                  <button
                    key={c.Id}
                    type="button"
                    onClick={() => pickCustomer(c)}
                    className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-brand-purple hover:bg-surface-muted"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                      <User className="size-5 text-ink-faint" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{c.FullName ?? "Customer"}</p>
                      <p className="truncate text-xs text-ink-soft">{c.Email ?? c.Phone ?? "-"}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!search.trim() && <p className="text-sm text-ink-faint">Ketik nama, email, atau nomor HP untuk mulai mencari.</p>}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilePlus2 className="size-4" /> {editingQuote ? `Ubah Penawaran ${editingQuote.QuoteNumber}` : "Penawaran Harga"}
            </CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-5">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface">
                <User className="size-5 text-ink-faint" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{selectedCustomer.FullName ?? "Customer"}</p>
                <p className="text-xs text-ink-soft">{selectedCustomer.Email ?? selectedCustomer.Phone ?? "-"}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedCustomer(null)}>
                Ganti
              </Button>
            </div>

            <div className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Box className="size-4 text-brand-purple" /> File cetak dari customer
                  </p>
                  <p className="text-xs text-ink-soft">
                    Centang file untuk pesanan ini. File yang dikirim customer sebagai lampiran chat biasa: unduh dari chat, lalu
                    unggah di sini.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4" /> Unggah File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={PRINT_FILE_ACCEPT}
                  className="hidden"
                  onChange={(e) => uploadFile(e.target.files?.[0])}
                />
              </div>
              {customerFiles.length === 0 ? (
                <p className="mt-2 text-xs text-ink-faint">Belum ada file. Format: STL, OBJ, 3MF, atau STEP (maks. 50 MB).</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {customerFiles.map((f) => (
                    <li key={f.Id} className="flex items-center gap-3 rounded-lg bg-surface-muted/60 px-3 py-2">
                      <Checkbox
                        disabled={!!f.QuoteId && f.QuoteId !== editingQuote?.Id}
                        checked={selectedFileIds.includes(f.Id)}
                        onChange={(e) =>
                          setSelectedFileIds((ids) => (e.target.checked ? [...ids, f.Id] : ids.filter((x) => x !== f.Id)))
                        }
                        aria-label={`Pakai ${f.FileName}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{f.FileName}</p>
                        <p className="text-xs text-ink-soft">
                          {formatFileSize(f.FileSize)} · {f.MaterialName ? `Bahan ${f.MaterialName}` : "Bahan belum dipilih"} ·{" "}
                          {f.Quantity} pcs{f.Notes ? ` · “${f.Notes}”` : ""}
                        </p>
                        {f.EditServiceRequested && (
                          <Badge tone="warning" className="mt-1">
                            Minta jasa edit
                          </Badge>
                        )}
                        {f.QuoteId && f.QuoteId !== editingQuote?.Id && (
                          <p className="mt-1 text-xs font-semibold text-ink-faint">
                            Sudah ada di penawaran {quotes.find((q) => q.Id === f.QuoteId)?.QuoteNumber ?? "lain"}
                          </p>
                        )}
                        <PrintFileImages printFileId={f.Id} imageIds={f.Images?.map((img) => img.Id)} size="sm" />
                      </div>
                      <a href={printFileUrl(f.Id)} download aria-label={`Unduh ${f.FileName}`}>
                        <Button type="button" size="icon" variant="ghost">
                          <Download className="size-4" />
                        </Button>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Nama Produk</FieldLabel>
                <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 text-sm text-ink">
                  {ITEM_CATEGORIES.PRINT_FILE} <Badge tone="brand">otomatis</Badge>
                </div>
              </div>
              <div>
                <FieldLabel required>Jumlah</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <MasterPriceFields
                  idPrefix="custom-order"
                  material={form.materialName}
                  onMaterial={(v) => setForm((f) => ({ ...f, materialName: v }))}
                  weight={form.itemWeight}
                  onWeight={(v) => setForm((f) => ({ ...f, itemWeight: v }))}
                  quantity={Math.max(1, Number(form.quantity) || 1)}
                />
              </div>
              <ColorTypeSelect
                id="custom-order-color"
                value={form.colorType}
                onChange={(colorType) => setForm((f) => ({ ...f, colorType }))}
              />
              <div>
                <FieldLabel required>Berat Paket (kg)</FieldLabel>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={form.packageWeight}
                  onChange={(e) => setForm((f) => ({ ...f, packageWeight: e.target.value }))}
                  placeholder="0.5"
                />
                <p className="mt-1 text-xs text-ink-faint">Total berat semua item termasuk kemasan — dipakai untuk ongkos kirim.</p>
              </div>
              {editRequested && (
                <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/10 p-3 sm:col-span-2">
                  <FieldLabel required>Harga Jasa Edit (Rp)</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    value={form.editServiceFee}
                    onChange={(e) => setForm((f) => ({ ...f, editServiceFee: e.target.value }))}
                    placeholder="25000"
                  />
                  <p className="mt-1 text-xs text-ink-soft">
                    Customer mencentang jasa edit untuk file ini. Harga jasa edit ditambahkan ke total penawaran (kena PPN) — customer
                    melihat totalnya di chat, lalu setuju (masuk keranjang) atau menolak.
                  </p>
                </div>
              )}
              {SELLER_PICKS_COURIER && <div className="sm:col-span-2">
                <FieldLabel>Alamat Pengiriman Customer</FieldLabel>
                {loadingAddresses ? (
                  <p className="text-sm text-ink-faint">Memuat alamat...</p>
                ) : addresses.length === 0 ? (
                  <p className="text-sm text-ink-faint">
                    Customer ini belum punya alamat tersimpan. Pesanan tetap bisa dibuat; customer melengkapi alamat saat checkout.
                  </p>
                ) : (
                  <Select
                    value={form.shippingAddressId}
                    onChange={(e) => setForm((f) => ({ ...f, shippingAddressId: e.target.value }))}
                  >
                    {addresses.map((a) => (
                      <option key={a.Id} value={a.Id}>
                        {a.Label ?? "Alamat"} — {a.RecipientName} — {a.Address}
                      </option>
                    ))}
                  </Select>
                )}
              </div>}
              {!SELLER_PICKS_COURIER && (
                <p className="flex items-center gap-2 rounded-xl bg-surface-muted/60 px-3 py-2 text-xs text-ink-soft sm:col-span-2">
                  <Truck className="size-4 shrink-0" /> Alamat & jasa kirim dipilih customer sendiri saat checkout, berdasarkan berat paket di atas.
                </p>
              )}
              {SELLER_PICKS_COURIER && <div className="sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Jasa Kirim (Biteship)</FieldLabel>
                  {ratesQueryKey && (
                    <button
                      type="button"
                      onClick={() => loadRates()}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline"
                    >
                      <RefreshCw className="size-3" /> Cek ulang
                    </button>
                  )}
                </div>
                {!ratesQueryKey ? (
                  <p className="text-sm text-ink-faint">Pilih alamat customer dan isi berat paket untuk melihat ongkir dari Biteship.</p>
                ) : ratesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-ink-soft">
                    <Spinner className="size-4" /> Mengecek ongkir Biteship...
                  </div>
                ) : ratesError ? (
                  <p className="text-sm text-error">{ratesError}</p>
                ) : (
                  <div className="max-h-72 space-y-1.5 overflow-y-auto">
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                        rateKey === "" ? "border-brand-purple bg-brand-purple/5" : "border-border"
                      }`}
                    >
                      <input type="radio" name="rate" checked={rateKey === ""} onChange={() => setRateKey("")} className="accent-brand-purple" />
                      <span className="flex-1 text-ink">Customer memilih kurir sendiri saat membayar</span>
                    </label>
                    {(rates ?? []).map((r) => (
                      <label
                        key={r.key}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                          rateKey === r.key ? "border-brand-purple bg-brand-purple/5" : "border-border"
                        }`}
                      >
                        <input
                          type="radio"
                          name="rate"
                          checked={rateKey === r.key}
                          onChange={() => setRateKey(r.key)}
                          className="accent-brand-purple"
                        />
                        <Truck className="size-4 shrink-0 text-ink-faint" />
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold text-ink">{r.courierName}</span>{" "}
                          <span className="text-ink-soft">{r.serviceName}</span>
                          {r.duration && <span className="block text-xs text-ink-faint">Estimasi {r.duration}</span>}
                        </span>
                        <span className="font-bold text-ink">{formatCurrency(r.price)}</span>
                      </label>
                    ))}
                    {rates?.length === 0 && <p className="text-sm text-ink-faint">Biteship tidak mengembalikan kurir untuk rute ini.</p>}
                  </div>
                )}
              </div>}
              <div className="sm:col-span-2">
                <FieldLabel>Catatan</FieldLabel>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Warna Hitam Glossy - Hasil Nego Chat"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetAll}>
                Batal
              </Button>
              <Button loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
                <Send className="size-4" /> {editingQuote ? "Kirim Ulang Penawaran" : "Kirim Penawaran ke Chat"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="size-4" /> Daftar Penawaran
          </CardTitle>
        </CardHeader>
        {quotes.length === 0 ? (
          <EmptyState icon={Send} title="Belum ada penawaran" description="Penawaran yang dikirim ke chat customer muncul di sini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="whitespace-nowrap px-4 py-3">Penawaran</th>
                  <th className="whitespace-nowrap px-4 py-3">Customer</th>
                  <th className="whitespace-nowrap px-4 py-3">Isi</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Total</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.Id} className="border-b border-border align-top last:border-0">
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-semibold text-ink">{q.QuoteNumber}</p>
                      <p className="text-xs text-ink-faint">
                        {formatDateTime(q.UpdatedAt)}
                        {q.Revision > 1 ? ` · revisi ${q.Revision}` : ""}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink">{q.Customer?.FullName ?? "-"}</td>
                    <td className="max-w-64 px-4 py-3 text-xs text-ink-soft">
                      {(q.PrintFiles ?? []).map((f) => f.FileName).join(", ") || ITEM_CATEGORIES.PRINT_FILE} · {q.MaterialName} · {q.Quantity} pcs
                      {q.Pricing.EditServiceFee > 0 && <span> · jasa edit {formatCurrency(q.Pricing.EditServiceFee)}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-ink">{formatCurrency(q.Pricing.PayableAmount)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={QUOTE_TONE[q.Status]}>{q.StatusLabel}</Badge>
                      {q.Status === "REJECTED" && q.RejectReason && <p className="mt-1 text-xs text-ink-soft">“{q.RejectReason}”</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {(q.Status === "SENT" || q.Status === "REJECTED") && (
                          <Button size="sm" variant={q.Status === "REJECTED" ? "primary" : "outline"} onClick={() => editQuote(q)}>
                            <Pencil className="size-4" /> Ubah & Kirim Ulang
                          </Button>
                        )}
                        {q.Status === "ORDERED" && q.OrderId && (
                          <Link href={`/dashboard/orders/${q.OrderId}`}>
                            <Button size="sm" variant="outline">Lihat Pesanan</Button>
                          </Link>
                        )}
                        {q.Status !== "ORDERED" && q.Status !== "CANCELLED" && (
                          <Button size="sm" variant="ghost" onClick={() => cancelQuote(q)} aria-label={`Batalkan ${q.QuoteNumber}`}>
                            <XCircle className="size-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

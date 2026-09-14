"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, FilePlus2, User, CheckCircle2, RotateCcw } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatCurrency } from "@/lib/resources/format";

interface CustomerUser {
  Id: string;
  FullName: string | null;
  Email: string | null;
  Phone: string | null;
  WhatsappNumber: string | null;
}

interface CreatedOrderSummary {
  OrderNumber: string | null;
  TotalAmount: number | null;
  SubtotalAmount: number | null;
  TaxAmount: number | null;
  AppFeeAmount: number | null;
}

const COURIER_OPTIONS = ["JNE", "SiCepat", "J&T", "Anteraja", "Gojek Instant", "Grab Instant", "Ambil di Toko"];

export default function CustomOrdersPage() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerUser | null>(null);

  const [form, setForm] = useState({
    itemName: "",
    quantity: "1",
    unitPrice: "",
    courierCompany: "",
    courierType: "REG",
    shippingCost: "0",
    notes: "",
    sendToChat: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrderSummary | null>(null);

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

  const resetAll = () => {
    setSelectedCustomer(null);
    setCreatedOrder(null);
    setSearch("");
    setCustomers(null);
    setForm({
      itemName: "",
      quantity: "1",
      unitPrice: "",
      courierCompany: "",
      courierType: "REG",
      shippingCost: "0",
      notes: "",
      sendToChat: true,
    });
  };

  const canSubmit = !!selectedCustomer && form.itemName.trim().length > 0 && Number(form.unitPrice) > 0 && !submitting;

  const handleSubmit = async () => {
    if (!selectedCustomer) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<CreatedOrderSummary>("orders/custom-quote", {
        method: "POST",
        json: {
          customerUserId: selectedCustomer.Id,
          itemName: form.itemName,
          quantity: Number(form.quantity) || 1,
          unitPrice: Number(form.unitPrice),
          courierCompany: form.courierCompany || undefined,
          courierType: form.courierType || undefined,
          shippingCost: Number(form.shippingCost) || 0,
          notes: form.notes || undefined,
          sendToChat: form.sendToChat,
        },
      });
      setCreatedOrder(res.data);
      toast.success(
        form.sendToChat ? "Pesanan dibuat dan kartu tagihan dikirim ke chat customer." : "Pesanan berhasil dibuat.",
      );
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal membuat pesanan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Pesanan Custom (Ready to Print)</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Buat pesanan produk manual/custom (Gantungan Kunci, Plakat, Stiker, dll) untuk customer setelah harga & ongkir
          disepakati lewat chat — sistem otomatis menghitung PPN 11%, biaya aplikasi, dan mengirim kartu tagihan ke chat.
        </p>
      </div>

      {createdOrder ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <h2 className="text-lg font-bold text-ink">Pesanan berhasil dibuat</h2>
            <p className="text-sm text-ink-soft">
              Nomor Pesanan <span className="font-semibold text-ink">{createdOrder.OrderNumber}</span>
            </p>
            <p className="text-2xl font-extrabold text-ink">{formatCurrency(createdOrder.TotalAmount)}</p>
            <p className="text-xs text-ink-faint">
              Subtotal {formatCurrency(createdOrder.SubtotalAmount)} · PPN {formatCurrency(createdOrder.TaxAmount)} ·
              Biaya Aplikasi {formatCurrency(createdOrder.AppFeeAmount)}
            </p>
            <Button variant="outline" className="mt-2" onClick={resetAll}>
              <RotateCcw className="size-4" /> Buat Pesanan Lain
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
                    onClick={() => {
                      setSelectedCustomer(c);
                      setCreatedOrder(null);
                    }}
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
              <FilePlus2 className="size-4" /> Detail Pesanan Custom
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel required>Nama Item</FieldLabel>
                <Input
                  value={form.itemName}
                  onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                  placeholder="Gantungan Kunci Custom Ready to Print"
                />
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
              <div>
                <FieldLabel required>Harga Satuan (Rp)</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={form.unitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  placeholder="15000"
                />
              </div>
              <div>
                <FieldLabel>Kurir</FieldLabel>
                <Input
                  list="courier-options"
                  value={form.courierCompany}
                  onChange={(e) => setForm((f) => ({ ...f, courierCompany: e.target.value }))}
                  placeholder="JNE"
                />
                <datalist id="courier-options">
                  {COURIER_OPTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <FieldLabel>Jenis Layanan Kurir</FieldLabel>
                <Input
                  value={form.courierType}
                  onChange={(e) => setForm((f) => ({ ...f, courierType: e.target.value }))}
                  placeholder="REG"
                />
              </div>
              <div>
                <FieldLabel>Ongkos Kirim (Rp)</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={form.shippingCost}
                  onChange={(e) => setForm((f) => ({ ...f, shippingCost: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Catatan</FieldLabel>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Warna Hitam Glossy - Hasil Nego Chat"
                />
              </div>
              <label className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  checked={form.sendToChat}
                  onChange={(e) => setForm((f) => ({ ...f, sendToChat: e.target.checked }))}
                />
                <span className="text-sm text-ink">Kirim kartu tagihan ke chat customer setelah pesanan dibuat</span>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
                Batal
              </Button>
              <Button loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
                Buat Pesanan
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

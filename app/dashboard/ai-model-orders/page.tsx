"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Sparkles, Box, CheckCircle2, RotateCcw } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatCurrency, toPublicAssetUrl } from "@/lib/resources/format";

interface AIJobUser {
  Id: string;
  FullName: string | null;
  Email: string | null;
  Phone: string | null;
  WhatsappNumber: string | null;
}

interface AIJobResult {
  Id: string;
  UserId: string;
  User?: AIJobUser;
  Prompt: string | null;
  Status: string;
  PreviewUrl: string | null;
  HasModel: boolean;
  AIModelId: string | null;
  Weight: number | null;
}

interface PrinterTypeOption {
  Id: number;
  Brand: string | null;
  Model: string | null;
  Technology: string | null;
  OperatingCostPerGram: number | null;
}

interface MaterialOption {
  Id: number;
  Name: string;
  PricePerGram: number | null;
}

interface PrintProfileOption {
  Id: number;
  Name: string;
}

interface AddressOption {
  Id: string;
  Label: string | null;
  RecipientName: string | null;
  Address: string | null;
  IsDefault: boolean;
}

interface CreatedOrderSummary {
  OrderNumber: string | null;
  TotalAmount: number | null;
  SubtotalAmount: number | null;
  TaxAmount: number | null;
  AppFeeAmount: number | null;
}

export default function AiModelOrdersPage() {
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState<AIJobResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedJob, setSelectedJob] = useState<AIJobResult | null>(null);

  const [printerTypes, setPrinterTypes] = useState<PrinterTypeOption[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [printProfiles, setPrintProfiles] = useState<PrintProfileOption[]>([]);
  const [addresses, setAddresses] = useState<AddressOption[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const [form, setForm] = useState({
    printerTypeId: "",
    materialId: "",
    printProfileId: "",
    quantity: "1",
    shippingAddressId: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrderSummary | null>(null);

  // Load dropdown master data once.
  useEffect(() => {
    (async () => {
      try {
        const [ptRes, matRes, ppRes] = await Promise.all([
          apiFetch<PrinterTypeOption[]>("printer-types", { query: { limit: 100 } }),
          apiFetch<MaterialOption[]>("materials", { query: { limit: 100 } }),
          apiFetch<PrintProfileOption[]>("print-profiles", { query: { limit: 100 } }),
        ]);
        setPrinterTypes(ptRes.data);
        setMaterials(matRes.data);
        setPrintProfiles(ppRes.data);
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "Gagal memuat data master (printer/material/profil cetak).");
      }
    })();
  }, []);

  // Debounced search across every customer's AI jobs. A stale `jobs` list
  // from a previous query is harmless once search is cleared — it's never
  // rendered because every read below is gated on `search.trim()` too.
  useEffect(() => {
    const term = search.trim();
    if (!term) return;
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiFetch<AIJobResult[]>("ai/jobs", { query: { search: term, onlyWithModel: true } });
        setJobs(res.data);
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "Gagal mencari AI Model.");
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [search]);

  const pickJob = async (job: AIJobResult) => {
    setSelectedJob(job);
    setCreatedOrder(null);
    setForm((f) => ({ ...f, shippingAddressId: "" }));
    setAddresses([]);
    setLoadingAddresses(true);
    try {
      const res = await apiFetch<AddressOption[]>(`user-addresses/user/${job.UserId}`);
      setAddresses(res.data);
      const defaultAddr = res.data.find((a) => a.IsDefault) || res.data[0];
      if (defaultAddr) setForm((f) => ({ ...f, shippingAddressId: defaultAddr.Id }));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal memuat alamat customer.");
    } finally {
      setLoadingAddresses(false);
    }
  };

  const resetAll = () => {
    setSelectedJob(null);
    setCreatedOrder(null);
    setSearch("");
    setJobs(null);
    setAddresses([]);
    setForm({ printerTypeId: "", materialId: "", printProfileId: "", quantity: "1", shippingAddressId: "", notes: "" });
  };

  const canSubmit =
    !!selectedJob?.AIModelId && !!form.printerTypeId && !!form.materialId && Number(form.quantity) > 0 && !submitting;

  const handleSubmit = async () => {
    if (!selectedJob?.AIModelId) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<CreatedOrderSummary>("orders/from-ai-model", {
        method: "POST",
        json: {
          AIModelId: selectedJob.AIModelId,
          PrinterTypeId: Number(form.printerTypeId),
          MaterialId: Number(form.materialId),
          PrintProfileId: form.printProfileId ? Number(form.printProfileId) : undefined,
          Quantity: Number(form.quantity),
          ShippingAddressId: form.shippingAddressId || undefined,
          Notes: form.notes || undefined,
        },
      });
      setCreatedOrder(res.data);
      toast.success("Pesanan dari AI Model berhasil dibuat.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal membuat pesanan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Pesanan dari AI Model</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Buatkan pesanan cetak 3D untuk customer berdasarkan model AI yang sudah dibahas lewat chat — sistem otomatis
          menghitung tarif mesin (FDM/SLA), material, PPN 11%, dan biaya aplikasi.
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
      ) : !selectedJob ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="size-4" /> Cari Model AI Customer
            </CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama customer, email, atau deskripsi model..."
            />
            {searching && <FullPageSpinner />}
            {!searching && search.trim() && jobs?.length === 0 && (
              <EmptyState icon={Sparkles} title="Tidak ditemukan" description="Tidak ada model AI yang cocok dengan pencarian ini." />
            )}
            {!searching && jobs && jobs.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {jobs.map((job) => (
                  <button
                    key={job.Id}
                    type="button"
                    onClick={() => pickJob(job)}
                    className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-brand-purple hover:bg-surface-muted"
                  >
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                      {job.PreviewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={toPublicAssetUrl(job.PreviewUrl) ?? job.PreviewUrl} alt={job.Prompt ?? "Model"} className="size-full object-cover" />
                      ) : (
                        <Box className="size-6 text-ink-faint" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{job.User?.FullName ?? "Customer"}</p>
                      <p className="truncate text-xs text-ink-soft">{job.Prompt ?? "-"}</p>
                      <p className="mt-1 truncate text-xs text-ink-faint">{job.User?.Email ?? job.User?.Phone ?? ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!search.trim() && (
              <p className="text-sm text-ink-faint">Ketik nama, email, atau deskripsi model untuk mulai mencari.</p>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" /> Detail Pesanan
            </CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-5">
            <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted p-3">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface">
                {selectedJob.PreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={toPublicAssetUrl(selectedJob.PreviewUrl) ?? selectedJob.PreviewUrl}
                    alt={selectedJob.Prompt ?? "Model"}
                    className="size-full object-cover"
                  />
                ) : (
                  <Box className="size-6 text-ink-faint" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{selectedJob.User?.FullName ?? "Customer"}</p>
                <p className="text-xs text-ink-soft">{selectedJob.Prompt ?? "-"}</p>
              </div>
              <Badge tone="brand">{selectedJob.Status}</Badge>
              <Button size="sm" variant="ghost" onClick={() => setSelectedJob(null)}>
                Ganti
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Tipe Printer (FDM/SLA)</FieldLabel>
                <Select value={form.printerTypeId} onChange={(e) => setForm((f) => ({ ...f, printerTypeId: e.target.value }))}>
                  <option value="">Pilih tipe printer...</option>
                  {printerTypes.map((pt) => (
                    <option key={pt.Id} value={pt.Id}>
                      {pt.Brand} {pt.Model} ({pt.Technology}) — {formatCurrency(pt.OperatingCostPerGram)}/g
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel>Material</FieldLabel>
                <Select value={form.materialId} onChange={(e) => setForm((f) => ({ ...f, materialId: e.target.value }))}>
                  <option value="">Pilih material...</option>
                  {materials.map((m) => (
                    <option key={m.Id} value={m.Id}>
                      {m.Name} — {formatCurrency(m.PricePerGram)}/g
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel>Profil Cetak</FieldLabel>
                <Select value={form.printProfileId} onChange={(e) => setForm((f) => ({ ...f, printProfileId: e.target.value }))}>
                  <option value="">(Opsional) Pilih profil cetak...</option>
                  {printProfiles.map((pp) => (
                    <option key={pp.Id} value={pp.Id}>
                      {pp.Name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel>Jumlah</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Alamat Pengiriman Customer</FieldLabel>
                {loadingAddresses ? (
                  <p className="text-sm text-ink-faint">Memuat alamat...</p>
                ) : addresses.length === 0 ? (
                  <p className="text-sm text-ink-faint">Customer ini belum punya alamat tersimpan.</p>
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
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Catatan</FieldLabel>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Contoh: infill 20%, warna hitam"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedJob(null)}>
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

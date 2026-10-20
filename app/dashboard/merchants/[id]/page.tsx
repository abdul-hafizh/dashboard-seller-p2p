"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Package, ShieldAlert, ShoppingCart, Store, CalendarDays, LogIn, FolderOpen } from "lucide-react";
import { DocumentRow, type MerchantDocument } from "@/components/merchants/MerchantDocumentsCard";
import { OperatingHoursCard } from "@/components/merchants/OperatingHoursCard";
import { MerchantBankInfo } from "@/components/merchants/BankAccountCard";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatCurrency, formatDate, formatDateTime, toPublicAssetUrl } from "@/lib/resources/format";
import {
  MerchantApprovalActions,
  MerchantAvatar,
  MerchantStatusBadge,
  storeName,
  type MerchantRow,
} from "@/components/merchants/merchant-ui";

interface MerchantProduct {
  Id: string;
  ProductName: string | null;
  Price: number | null;
  Stock: number | null;
  Weight: number | null;
  ThumbnailPath: string | null;
  IsPublished: number | boolean | null;
  CreatedAt: string | null;
  Category?: { Name: string | null } | null;
}

interface MerchantDetail extends MerchantRow {
  Products: MerchantProduct[];
  Documents?: MerchantDocument[];
  PayoutBankName?: string | null;
  PayoutAccountNumber?: string | null;
  PayoutAccountName?: string | null;
}

export default function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, loading } = useAuth();
  const { data, error, isLoading, mutate } = useSWR(isAdmin ? ["admin-merchant", id] : null, () =>
    apiFetch<MerchantDetail>(`admin/merchants/${id}`),
  );

  if (loading || (isAdmin && isLoading)) return <FullPageSpinner />;
  if (!isAdmin) {
    return (
      <EmptyState icon={ShieldAlert} title="Akses terbatas" description="Halaman ini hanya bisa diakses oleh Super Admin." />
    );
  }
  const merchant = data?.data;
  if (error || !merchant) {
    return <EmptyState icon={Store} title="Merchant tidak ditemukan" description="Merchant ini tidak ada atau sudah dihapus." />;
  }

  const products = merchant.Products ?? [];
  const publishedCount = products.filter((p) => p.IsPublished === true || p.IsPublished === 1).length;
  const store = storeName(merchant);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/merchants"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Kembali ke daftar merchant
      </Link>

      <Card>
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <MerchantAvatar merchant={merchant} size="size-16" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-extrabold text-ink">{store ?? merchant.FullName ?? "-"}</h1>
              <MerchantStatusBadge merchant={merchant} />
            </div>
            {store && <p className="text-sm text-ink-soft">Pemilik: {merchant.FullName ?? "-"}</p>}
            {merchant.ApprovalStatus === "PENDING" && (
              <p className="mt-2 text-sm text-brand-orange-deep">
                Merchant ini belum bisa masuk ke dashboard sampai pendaftarannya disetujui.
              </p>
            )}
            <div className="mt-3 flex justify-start">
              <MerchantApprovalActions merchant={merchant} onChanged={() => mutate()} size="md" />
            </div>
            <div className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-ink-soft sm:grid-cols-2">
              <span className="flex items-center gap-2">
                <Mail className="size-4 shrink-0" /> {merchant.Email ?? "-"}
              </span>
              <span className="flex items-center gap-2">
                <Phone className="size-4 shrink-0" /> {merchant.Phone || merchant.WhatsappNumber || "-"}
              </span>
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4 shrink-0" /> Bergabung {formatDate(merchant.CreatedAt)}
              </span>
              <span className="flex items-center gap-2">
                <LogIn className="size-4 shrink-0" /> Login terakhir {formatDateTime(merchant.LastLogin)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-64">
            <div className="rounded-2xl bg-surface-muted p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                <Package className="size-3.5" /> Produk
              </p>
              <p className="mt-1 text-xl font-extrabold text-ink">{products.length}</p>
              <p className="text-xs text-ink-soft">{publishedCount} tayang</p>
            </div>
            <div className="rounded-2xl bg-surface-muted p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                <ShoppingCart className="size-3.5" /> Pesanan
              </p>
              <p className="mt-1 text-xl font-extrabold text-ink">{merchant.OrderCount ?? 0}</p>
              <p className="text-xs text-ink-soft">total masuk</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <MerchantBankInfo
        bankName={merchant.PayoutBankName}
        accountNumber={merchant.PayoutAccountNumber}
        accountName={merchant.PayoutAccountName}
      />

      <OperatingHoursCard merchantId={id} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="size-4" /> Dokumen Usaha
          </CardTitle>
        </CardHeader>
        <CardBody>
          {merchant.Documents && merchant.Documents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {(["NPWP", "BUILDING_PHOTO", "SUPPORTING"] as const).map((type) => {
                const items = merchant.Documents!.filter((d) => d.DocType === type);
                const label = { NPWP: "NPWP", BUILDING_PHOTO: "Foto Gedung / Tempat Usaha", SUPPORTING: "Surat Pendukung" }[type];
                return (
                  <div key={type} className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                      {label} ({items.length})
                    </p>
                    {items.length > 0 ? (
                      <ul className="space-y-2">
                        {items.map((doc) => (
                          <DocumentRow key={doc.Id} doc={doc} />
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-ink-faint">Belum diunggah.</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-ink-soft">Merchant ini belum mengunggah dokumen apa pun.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-4" /> Produk Merchant
          </CardTitle>
        </CardHeader>
        {products.length === 0 ? (
          <EmptyState icon={Package} title="Belum ada produk" description="Merchant ini belum menambahkan produk." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="whitespace-nowrap px-4 py-3">Produk</th>
                  <th className="whitespace-nowrap px-4 py-3">Kategori</th>
                  <th className="whitespace-nowrap px-4 py-3">Harga</th>
                  <th className="whitespace-nowrap px-4 py-3">Stok</th>
                  <th className="whitespace-nowrap px-4 py-3">Berat</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-4 py-3">Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const thumb = toPublicAssetUrl(p.ThumbnailPath);
                  const published = p.IsPublished === true || p.IsPublished === 1;
                  return (
                    <tr key={p.Id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="flex size-full items-center justify-center text-ink-faint">
                                <Package className="size-5" />
                              </div>
                            )}
                          </div>
                          <span className="font-semibold text-ink">{p.ProductName ?? "-"}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{p.Category?.Name ?? "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink">{formatCurrency(p.Price)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink">{p.Stock ?? "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{p.Weight ? `${p.Weight} g` : "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {published ? <Badge tone="success">Tayang</Badge> : <Badge tone="neutral">Draf</Badge>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatDate(p.CreatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

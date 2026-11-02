"use client";

import Link from "next/link";
import { Box, Download, FilePlus2, PencilRuler } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatFileSize } from "@/components/merchants/MerchantDocumentsCard";

export interface PrintFileInfo {
  id: string;
  fileName: string;
  fileSize?: number | null;
  materialName?: string | null;
  quantity?: number | null;
  notes?: string | null;
  orderNumber?: string | null;
  /** The customer ticked "Gunakan jasa edit" — the store prices it in Pesanan Custom. */
  editServiceRequested?: boolean | null;
  /** Gambar referensi the customer sent with the file. */
  imageIds?: string[] | null;
}

/** Downloaded through the authenticated `/api/backend` proxy — the file
 * lives in a private folder on the API server, never at a public URL. */
export const printFileUrl = (id: string) => `/api/backend/print-files/${id}/file`;
export const printFileImageUrl = (id: string, imageId: string) => `/api/backend/print-files/${id}/images/${imageId}`;

/** The customer's reference photos for a print file — click one to open it full size. */
export function PrintFileImages({ printFileId, imageIds, size = "md" }: { printFileId: string; imageIds?: string[] | null; size?: "sm" | "md" }) {
  if (!imageIds?.length) return null;
  return (
    <div className="mt-2">
      <p className="mb-1 text-[11px] font-semibold text-ink-soft">Gambar referensi ({imageIds.length})</p>
      <div className="flex flex-wrap gap-1.5">
        {imageIds.map((imageId) => (
          <a key={imageId} href={printFileImageUrl(printFileId, imageId)} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- private file behind the authenticated proxy */}
            <img
              src={printFileImageUrl(printFileId, imageId)}
              alt="Gambar referensi"
              className={`${size === "sm" ? "size-10" : "size-14"} rounded-lg border border-border object-cover`}
            />
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * A ready-to-print file a customer sent from the app's chat: download it,
 * and (in chat) start the manual order for it in "Pesanan Custom".
 */
export function PrintFileCard({ file, showCreateOrder = false }: { file: PrintFileInfo; showCreateOrder?: boolean }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-3 text-left">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
          <Box className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-purple">File siap print</p>
          <p className="truncate text-sm font-semibold text-ink" title={file.fileName}>
            {file.fileName}
          </p>
          <p className="text-xs text-ink-soft">
            {[
              file.fileSize ? formatFileSize(file.fileSize) : null,
              file.materialName ? `Bahan ${file.materialName}` : "Bahan belum dipilih",
              `${file.quantity ?? 1} pcs`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {file.notes && <p className="mt-1 text-xs italic text-ink-soft">“{file.notes}”</p>}
          {file.editServiceRequested && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-brand-orange/10 px-1.5 py-0.5 text-xs font-semibold text-brand-orange-deep">
              <PencilRuler className="size-3" /> Minta jasa edit — isi harganya saat membuat pesanan
            </p>
          )}
          {file.orderNumber && <p className="mt-1 text-xs font-semibold text-success">Pesanan {file.orderNumber}</p>}
          <PrintFileImages printFileId={file.id} imageIds={file.imageIds} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={printFileUrl(file.id)} download>
          <Button type="button" size="sm" variant="outline">
            <Download className="size-4" /> Unduh File
          </Button>
        </a>
        {showCreateOrder && !file.orderNumber && (
          <Link href={`/dashboard/custom-orders?printFileId=${encodeURIComponent(file.id)}`}>
            <Button type="button" size="sm">
              <FilePlus2 className="size-4" /> Buat Penawaran
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

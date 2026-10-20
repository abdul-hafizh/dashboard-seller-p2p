"use client";

import Link from "next/link";
import { Box, Download, FilePlus2 } from "lucide-react";
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
}

/** Downloaded through the authenticated `/api/backend` proxy — the file
 * lives in a private folder on the API server, never at a public URL. */
export const printFileUrl = (id: string) => `/api/backend/print-files/${id}/file`;

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
          {file.orderNumber && <p className="mt-1 text-xs font-semibold text-success">Pesanan {file.orderNumber}</p>}
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
              <FilePlus2 className="size-4" /> Buat Pesanan Manual
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { FileText, ImageIcon, Upload, Trash2, ExternalLink, FolderOpen } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/resources/format";

export interface MerchantDocument {
  Id: string;
  DocType: string;
  DocTypeLabel?: string;
  FileName: string;
  MimeType: string;
  FileSize: number;
  CreatedAt: string | null;
}

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;

const SECTIONS = [
  { key: "NPWP", label: "NPWP", hint: "Foto atau scan kartu NPWP usaha/pemilik.", max: 2 },
  { key: "BUILDING_PHOTO", label: "Foto Gedung / Tempat Usaha", hint: "Tampak depan dan dalam tempat usaha.", max: 10 },
  { key: "SUPPORTING", label: "Surat Pendukung", hint: "NIB, SIUP, akta usaha, atau surat lain yang relevan.", max: 10 },
] as const;

export function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Opened in a new tab through the authenticated `/api/backend` proxy (the
 * session cookie goes along), so the private file never needs a public URL. */
export function documentFileUrl(id: string) {
  return `/api/backend/merchant-documents/${id}/file`;
}

export function DocumentRow({ doc, onDelete }: { doc: MerchantDocument; onDelete?: () => void }) {
  const isPdf = doc.MimeType === "application/pdf";
  const Icon = isPdf ? FileText : ImageIcon;
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{doc.FileName}</p>
        <p className="text-xs text-ink-soft">
          {isPdf ? "PDF" : "Gambar"} · {formatFileSize(doc.FileSize)} · {formatDate(doc.CreatedAt)}
        </p>
      </div>
      <a href={documentFileUrl(doc.Id)} target="_blank" rel="noopener noreferrer">
        <Button variant="ghost" size="sm" type="button">
          <ExternalLink className="size-4" /> Lihat
        </Button>
      </a>
      {onDelete && (
        <Button variant="ghost" size="sm" type="button" onClick={onDelete} aria-label={`Hapus ${doc.FileName}`}>
          <Trash2 className="size-4 text-error" />
        </Button>
      )}
    </li>
  );
}

/** "Dokumen Usaha" on the merchant's own profile page: upload / view / delete
 * NPWP, premises photos and supporting letters (PDF or images, max 10 MB). */
export function MerchantDocumentsCard() {
  const { data, isLoading, mutate } = useSWR("merchant-documents", () =>
    apiFetch<MerchantDocument[]>("merchant-documents"),
  );
  const docs = data?.data ?? [];
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const pendingType = useRef<string | null>(null);
  const [toDelete, setToDelete] = useState<MerchantDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pickFile = (docType: string) => {
    pendingType.current = docType;
    inputRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    const docType = pendingType.current;
    if (inputRef.current) inputRef.current.value = "";
    if (!file || !docType) return;
    if (file.size > MAX_BYTES) {
      toast.error("Ukuran file maksimal 10 MB.");
      return;
    }
    const formData = new FormData();
    formData.append("docType", docType);
    formData.append("file", file);
    setUploadingType(docType);
    try {
      await apiFetch("merchant-documents", { method: "POST", formData });
      toast.success("Dokumen berhasil diunggah");
      await mutate();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal mengunggah dokumen.");
    } finally {
      setUploadingType(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`merchant-documents/${toDelete.Id}`, { method: "DELETE" });
      toast.success("Dokumen dihapus");
      setToDelete(null);
      await mutate();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal menghapus dokumen.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="size-4" /> Dokumen Usaha
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <p className="text-xs text-ink-soft">
          Unggah dokumen pendukung usaha kamu dalam format <b>PDF, JPG, PNG, atau WEBP</b> (maks. 10 MB per file).
          Dokumen hanya bisa dilihat oleh kamu dan admin.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-5" />
          </div>
        ) : (
          SECTIONS.map((section) => {
            const items = docs.filter((d) => d.DocType === section.key);
            const full = items.length >= section.max;
            return (
              <div key={section.key} className="space-y-2.5 border-t border-border pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">
                      {section.label}{" "}
                      <span className="font-normal text-ink-faint">
                        ({items.length}/{section.max})
                      </span>
                    </p>
                    <p className="text-xs text-ink-soft">{section.hint}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => pickFile(section.key)}
                    loading={uploadingType === section.key}
                    disabled={full || uploadingType !== null}
                  >
                    <Upload className="size-4" /> Unggah
                  </Button>
                </div>
                {items.length > 0 ? (
                  <ul className="space-y-2">
                    {items.map((doc) => (
                      <DocumentRow key={doc.Id} doc={doc} onDelete={() => setToDelete(doc)} />
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-border px-3 py-3 text-center text-xs text-ink-faint">
                    Belum ada file.
                  </p>
                )}
              </div>
            );
          })
        )}
      </CardBody>

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus dokumen?"
        description={toDelete ? `${toDelete.FileName} akan dihapus permanen.` : undefined}
        confirmLabel="Hapus"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Card>
  );
}

"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Box, Download, FolderOpen, ImagePlus, RefreshCw, Trash2, Upload } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/resources/format";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatFileSize } from "@/components/merchants/MerchantDocumentsCard";

interface ReferenceFile {
  Id: string;
  FileName: string;
  Kind: "MODEL" | "IMAGE";
  FileSize: number | null;
  UploadedAt: string | null;
}

type Kind = ReferenceFile["Kind"];

const MODEL_ACCEPT = ".stl,.3mf,.obj,.step,.stp";
const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";

/**
 * File referensi on a File Siap Print / File Via Prompt order: the store's own
 * 3D files (STL, 3MF, …) and any number of photos — upload, replace, delete.
 * Only the store and admins see them; they're served through the
 * authenticated `/api/backend` proxy from a private folder.
 */
export function ReferenceFilesCard({ orderId }: { orderId: string }) {
  const base = `orders/${orderId}/reference-files`;
  const { data, isLoading, mutate } = useSWR(["order-reference-files", orderId], () => apiFetch<ReferenceFile[]>(base));
  const files = data?.data ?? [];
  const models = files.filter((f) => f.Kind === "MODEL");
  const images = files.filter((f) => f.Kind === "IMAGE");

  const [busy, setBusy] = useState<string | null>(null); // "upload-MODEL" | "upload-IMAGE" | file id
  const [deleting, setDeleting] = useState<ReferenceFile | null>(null);
  const uploadInputs = { MODEL: useRef<HTMLInputElement>(null), IMAGE: useRef<HTMLInputElement>(null) };
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState<ReferenceFile | null>(null);

  const fileUrl = (f: ReferenceFile, download = false) =>
    `/api/backend/${base}/${f.Id}/file?v=${encodeURIComponent(f.UploadedAt ?? "")}${download ? "&download=1" : ""}`;

  const send = async (method: "POST" | "PUT", path: string, picked: FileList | File[], kind: Kind) => {
    const fd = new FormData();
    for (const file of Array.from(picked)) fd.append("files", file);
    fd.append("Kind", kind);
    const res = await apiFetch(path, { method, formData: fd });
    toast.success(res.message || "Tersimpan");
    await mutate();
  };

  const upload = async (kind: Kind, picked: FileList | null) => {
    if (!picked?.length) return;
    setBusy(`upload-${kind}`);
    try {
      await send("POST", base, picked, kind);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal mengunggah file");
    } finally {
      setBusy(null);
      const input = uploadInputs[kind].current;
      if (input) input.value = "";
    }
  };

  const replace = async (picked: FileList | null) => {
    const target = replacing;
    if (!target || !picked?.length) return;
    setBusy(target.Id);
    try {
      await send("PUT", `${base}/${target.Id}`, [picked[0]], target.Kind);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal mengganti file");
    } finally {
      setBusy(null);
      setReplacing(null);
      if (replaceInput.current) replaceInput.current.value = "";
    }
  };

  const startReplace = (f: ReferenceFile) => {
    setReplacing(f);
    const input = replaceInput.current;
    if (!input) return;
    input.accept = f.Kind === "MODEL" ? MODEL_ACCEPT : IMAGE_ACCEPT;
    input.click();
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(deleting.Id);
    try {
      await apiFetch(`${base}/${deleting.Id}`, { method: "DELETE" });
      toast.success("File dihapus");
      setDeleting(null);
      await mutate();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menghapus file");
    } finally {
      setBusy(null);
    }
  };

  const actions = (f: ReferenceFile) => (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => startReplace(f)} loading={busy === f.Id} disabled={busy !== null}>
        <RefreshCw className="size-3.5" /> Ganti
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setDeleting(f)} disabled={busy !== null} aria-label={`Hapus ${f.FileName}`}>
        <Trash2 className="size-4 text-error" />
      </Button>
    </>
  );

  const uploadButton = (kind: Kind, label: string, Icon: typeof Upload) => (
    <>
      <input
        ref={uploadInputs[kind]}
        type="file"
        multiple
        accept={kind === "MODEL" ? MODEL_ACCEPT : IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => void upload(kind, e.target.files)}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => uploadInputs[kind].current?.click()}
        loading={busy === `upload-${kind}`}
        disabled={busy !== null}
      >
        <Icon className="size-4" /> {label}
      </Button>
    </>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="size-4" /> File Referensi Toko
        </CardTitle>
        <p className="mt-0.5 text-xs text-ink-soft">
          File 3D dan gambar untuk referensi toko — hanya terlihat oleh toko dan admin, tidak ditampilkan ke customer.
        </p>
      </CardHeader>
      <CardBody className="space-y-6">
        <input ref={replaceInput} type="file" className="hidden" onChange={(e) => void replace(e.target.files)} />

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">File 3D</p>
            {uploadButton("MODEL", "Upload File 3D", Upload)}
          </div>
          {models.length === 0 ? (
            <p className="text-xs text-ink-faint">{isLoading ? "Memuat..." : "Belum ada file 3D. Format STL, 3MF, OBJ, atau STEP — maks 50 MB per file."}</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {models.map((f) => (
                <li key={f.Id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                    <Box className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink" title={f.FileName}>
                      {f.FileName}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {[f.FileSize ? formatFileSize(f.FileSize) : null, f.UploadedAt ? formatDateTime(f.UploadedAt) : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a href={fileUrl(f, true)} download>
                      <Button type="button" size="sm" variant="outline">
                        <Download className="size-3.5" /> Unduh
                      </Button>
                    </a>
                    {actions(f)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Gambar Referensi</p>
            {uploadButton("IMAGE", "Tambah Gambar", ImagePlus)}
          </div>
          {images.length === 0 ? (
            <p className="text-xs text-ink-faint">{isLoading ? "Memuat..." : "Belum ada gambar. Bisa pilih beberapa sekaligus — JPG, PNG, atau WEBP, maks 10 MB per gambar."}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((f) => (
                <div key={f.Id} className="overflow-hidden rounded-xl border border-border">
                  <a href={fileUrl(f)} target="_blank" rel="noreferrer" title={f.FileName} className="block aspect-square bg-surface-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element -- private file behind the authenticated API proxy */}
                    <img src={fileUrl(f)} alt={f.FileName} className="size-full object-cover" loading="lazy" />
                  </a>
                  <div className="flex items-center gap-1 p-1.5">
                    <p className="min-w-0 flex-1 truncate px-1 text-[11px] text-ink-soft" title={f.FileName}>
                      {f.FileName}
                    </p>
                    {actions(f)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </CardBody>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus file referensi?"
        description={deleting ? `${deleting.FileName} akan dihapus permanen.` : undefined}
        confirmLabel="Hapus"
        loading={Boolean(deleting) && busy === deleting?.Id}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      />
    </Card>
  );
}

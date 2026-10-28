"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";

export interface DownloadFormat {
  Code: string;
  Label: string;
  Description?: string | null;
}

/**
 * Download buttons for an AI design, one per active type in Aktivitas Meshy ›
 * Tipe File Unduhan (same list as the app). Each opens a 5-minute link from
 * the backend, which also builds 3MF from the STL.
 */
export function ModelDownloadButtons({ jobId, formats }: { jobId: string | null | undefined; formats: DownloadFormat[] | undefined }) {
  const [busy, setBusy] = useState<string | null>(null);

  if (!jobId || !formats || formats.length === 0) {
    return <p className="text-xs text-ink-soft">Belum ada file yang bisa diunduh (lihat Aktivitas Meshy AI › Tipe File Unduhan).</p>;
  }

  const download = async (code: string) => {
    setBusy(code);
    try {
      const res = await apiFetch<{ path: string; token: string }>(`ai/jobs/${jobId}/download-link`, {
        method: "POST",
        json: { format: code },
      });
      window.open(`/api/backend${res.data.path}?token=${encodeURIComponent(res.data.token)}`, "_blank", "noopener");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal mengunduh file.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {formats.map((f) => (
        <button
          key={f.Code}
          type="button"
          title={f.Description ?? undefined}
          disabled={busy !== null}
          onClick={() => download(f.Code)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-60"
        >
          {busy === f.Code ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} {f.Label}
        </button>
      ))}
    </div>
  );
}

"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { Palette, ExternalLink, Unlink } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatDateTime } from "@/lib/resources/format";
import { useState } from "react";

interface CanvaStatus {
  isConnected: boolean;
  canvaUserId: string | null;
  expiresAt?: string;
}

interface ImportedDesign {
  Id: string;
  CanvaDesignId: string;
  Title: string | null;
  Format: string;
  PrintQualityDPI: number;
  FileUrl: string | null;
  ThumbnailUrl: string | null;
  CreatedAt: string;
}

export default function CanvaPage() {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const { data: status, isLoading: statusLoading, mutate: mutateStatus } = useSWR(
    ["canva-status"],
    () => apiFetch<CanvaStatus>("canva/status").then((r) => r.data),
  );

  const { data: designs, isLoading: designsLoading } = useSWR(
    status?.isConnected ? ["canva-print-designs"] : null,
    () => apiFetch<ImportedDesign[]>("canva/print-designs").then((r) => r.data),
  );

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await apiFetch<{ authUrl: string }>("canva/auth-url");
      window.open(res.data.authUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal membuka halaman koneksi Canva");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiFetch("canva/disconnect", { method: "POST" });
      toast.success("Koneksi Canva diputuskan");
      await mutateStatus();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal memutuskan koneksi");
    } finally {
      setDisconnecting(false);
    }
  };

  if (statusLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrasi Canva</CardTitle>
        </CardHeader>
        <CardBody className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone={status?.isConnected ? "success" : "neutral"}>
                {status?.isConnected ? "Terhubung" : "Belum Terhubung"}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-ink-faint">
              {status?.isConnected
                ? "Akun Canva Anda terhubung — Anda dapat mengimpor desain cetak 2D siap cetak (300 DPI) langsung dari Canva."
                : "Hubungkan akun Canva Anda untuk mengimpor desain cetak 2D siap cetak."}
            </p>
          </div>
          {status?.isConnected ? (
            <Button variant="outline" onClick={handleDisconnect} loading={disconnecting}>
              <Unlink className="size-4" /> Putuskan
            </Button>
          ) : (
            <Button onClick={handleConnect} loading={connecting}>
              <ExternalLink className="size-4" /> Hubungkan Canva
            </Button>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Desain Cetak yang Diimpor</CardTitle>
        </CardHeader>
        <CardBody>
          {!status?.isConnected ? (
            <EmptyState
              icon={Palette}
              title="Belum terhubung"
              description="Hubungkan akun Canva Anda terlebih dahulu untuk melihat desain yang telah diimpor."
            />
          ) : designsLoading ? (
            <FullPageSpinner />
          ) : !designs?.length ? (
            <EmptyState
              icon={Palette}
              title="Belum ada desain"
              description="Desain cetak 2D yang Anda impor dari Canva akan muncul di sini."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {designs.map((design) => (
                <div key={design.Id} className="overflow-hidden rounded-xl border border-border">
                  <div className="aspect-square bg-surface-muted">
                    {design.ThumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={design.ThumbnailUrl} alt={design.Title ?? "Desain"} className="size-full object-cover" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-ink">{design.Title || "Tanpa judul"}</p>
                    <p className="text-xs text-ink-faint">
                      {design.Format} · {design.PrintQualityDPI} DPI
                    </p>
                    <p className="text-xs text-ink-faint">{formatDateTime(design.CreatedAt)}</p>
                    {design.FileUrl && (
                      <a
                        href={design.FileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs font-semibold text-brand-purple hover:underline"
                      >
                        Buka file
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

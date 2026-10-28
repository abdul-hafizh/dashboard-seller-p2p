"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Eye, EyeOff, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

async function fetchLabel(orderId: string, download: boolean): Promise<Blob> {
  const res = await fetch(`/api/backend/orders/${orderId}/label-resi${download ? "?download=1" : ""}`);
  if (!res.ok) {
    let message = "Gagal membuat label resi.";
    try {
      const payload = await res.json();
      if (payload?.message) message = payload.message;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }
  return res.blob();
}

/**
 * "Lihat Label" (the 100 × 150 mm PDF shown right in the card), "Cetak Label
 * Resi" (opens it in a new tab, ready for the browser's print dialog) and
 * "Unduh" — for a courier shipment booked through Biteship (real waybill +
 * barcode). Store and admin only (backend).
 */
export function ShippingLabelButtons({ orderId, orderNumber }: { orderId: string; orderNumber?: string | null }) {
  const [busy, setBusy] = useState<"view" | "print" | "download" | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Free the preview's blob when it's closed or the page goes away.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const togglePreview = async () => {
    if (previewUrl) {
      setPreviewUrl(null);
      return;
    }
    setBusy("view");
    try {
      setPreviewUrl(URL.createObjectURL(await fetchLabel(orderId, false)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat label resi.");
    } finally {
      setBusy(null);
    }
  };

  const print = async () => {
    // Opened right away (still inside the click) so the browser doesn't block it as a pop-up.
    const tab = window.open("", "_blank");
    setBusy("print");
    try {
      const url = URL.createObjectURL(await fetchLabel(orderId, false));
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      tab?.close();
      toast.error(error instanceof Error ? error.message : "Gagal membuat label resi.");
    } finally {
      setBusy(null);
    }
  };

  const download = async () => {
    setBusy("download");
    try {
      const url = URL.createObjectURL(await fetchLabel(orderId, true));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Label-Resi-${orderNumber ?? orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunduh label resi.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="w-fit" onClick={togglePreview} loading={busy === "view"} disabled={busy !== null && busy !== "view"}>
          {previewUrl ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {previewUrl ? "Tutup Label" : "Lihat Label"}
        </Button>
        <Button size="sm" className="w-fit" onClick={print} loading={busy === "print"} disabled={busy !== null}>
          <Printer className="size-3.5" /> Cetak Label Resi
        </Button>
        <Button variant="outline" size="sm" className="w-fit" onClick={download} loading={busy === "download"} disabled={busy !== null}>
          <Download className="size-3.5" /> Unduh
        </Button>
      </div>
      {previewUrl && (
        // 100 × 150 mm label — a 2:3 frame.
        <iframe
          src={previewUrl}
          title={`Label resi ${orderNumber ?? orderId}`}
          className="aspect-[2/3] w-full max-w-sm rounded-xl border border-border bg-white"
        />
      )}
    </div>
  );
}

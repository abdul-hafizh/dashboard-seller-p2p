"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { toPublicAssetUrl } from "@/lib/resources/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/** A merchant account as returned by `GET /admin/merchants`. */
export interface MerchantRow {
  Id: string;
  FullName: string | null;
  Email: string | null;
  Phone: string | null;
  WhatsappNumber: string | null;
  Avatar: string | null;
  StorePhoto?: string | null;
  IsActive: number | boolean | null;
  LastLogin: string | null;
  /** 'PENDING' | 'APPROVED' | 'REJECTED' — null = approved (older accounts). */
  ApprovalStatus: string | null;
  CreatedAt: string | null;
  Company?: { Name: string | null } | null;
  Branch?: { Name: string | null } | null;
  ProductCount?: number;
  PublishedProductCount?: number;
  OrderCount?: number;
}

/** Store name: the branch/company the merchant belongs to, if any. */
export function storeName(m: Pick<MerchantRow, "Branch" | "Company">): string | null {
  return m.Branch?.Name || m.Company?.Name || null;
}

export function isMerchantActive(m: Pick<MerchantRow, "IsActive">): boolean {
  return !(m.IsActive === false || m.IsActive === 0);
}

/** Approval state first (pending/rejected), then active/inactive. */
export function MerchantStatusBadge({ merchant }: { merchant: MerchantRow }) {
  if (merchant.ApprovalStatus === "PENDING") return <Badge tone="warning">Menunggu Persetujuan</Badge>;
  if (merchant.ApprovalStatus === "REJECTED") return <Badge tone="error">Ditolak</Badge>;
  return isMerchantActive(merchant) ? <Badge tone="success">Aktif</Badge> : <Badge tone="neutral">Nonaktif</Badge>;
}

/** Setujui / Tolak buttons for a merchant sign-up that isn't approved yet
 * (pending, or rejected earlier and being reconsidered). Renders nothing
 * for approved merchants. */
export function MerchantApprovalActions({
  merchant,
  onChanged,
  size = "sm",
}: {
  merchant: MerchantRow;
  onChanged: () => void;
  size?: "sm" | "md";
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const pending = merchant.ApprovalStatus === "PENDING";
  const rejected = merchant.ApprovalStatus === "REJECTED";
  if (!pending && !rejected) return null;

  const run = async (action: "approve" | "reject") => {
    setBusy(action);
    try {
      const res = await apiFetch(`admin/merchants/${merchant.Id}/${action}`, { method: "POST" });
      toast.success(res.message || (action === "approve" ? "Merchant disetujui." : "Pendaftaran ditolak."));
      setConfirmReject(false);
      onChanged();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal memperbarui status merchant.");
    } finally {
      setBusy(null);
    }
  };

  const name = storeName(merchant) || merchant.FullName || merchant.Email || "merchant ini";

  return (
    <div className="flex items-center justify-end gap-2">
      <Button size={size} onClick={() => run("approve")} loading={busy === "approve"} disabled={busy !== null}>
        <Check className="size-4" /> Setujui
      </Button>
      {pending && (
        <Button size={size} variant="outline" onClick={() => setConfirmReject(true)} disabled={busy !== null}>
          <X className="size-4" /> Tolak
        </Button>
      )}
      <ConfirmDialog
        open={confirmReject}
        title="Tolak pendaftaran merchant?"
        description={`${name} tidak akan bisa masuk ke dashboard. Kamu masih bisa menyetujuinya nanti dari tab Ditolak.`}
        confirmLabel="Tolak"
        loading={busy === "reject"}
        onConfirm={() => run("reject")}
        onCancel={() => setConfirmReject(false)}
      />
    </div>
  );
}

export function MerchantAvatar({ merchant, size = "size-9" }: { merchant: MerchantRow; size?: string }) {
  const src = toPublicAssetUrl(merchant.Avatar);
  const initial = (merchant.FullName || merchant.Email || "?").trim().charAt(0).toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-brand-purple/10 text-sm font-bold text-brand-purple-deep`}
    >
      {initial}
    </div>
  );
}

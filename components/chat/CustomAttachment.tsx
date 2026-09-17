"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, Package, Receipt } from "lucide-react";
import { Attachment as DefaultAttachment, type AttachmentProps } from "stream-chat-react";
import type { Attachment as StreamAttachment } from "stream-chat";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatCurrency, toPublicAssetUrl } from "@/lib/resources/format";
import { Modal } from "@/components/ui/Modal";

/** `stream-chat`'s `Attachment` type carries no custom fields by default
 * (`CustomAttachmentData` is an empty interface) — this widens it locally for
 * the `PRODUCT_LINK`/`ORDER_LINK` fields this app actually sends. Exported so
 * `ShareActions` (which constructs these when sending) can reuse the same
 * shape instead of re-declaring it. */
export type LinkAttachment = StreamAttachment & {
  productId?: string;
  productName?: string;
  thumbnailPath?: string | null;
  price?: number;
  orderId?: string;
  orderNumber?: string;
  totalAmount?: number;
};

/** Renders `PRODUCT_LINK`/`ORDER_LINK` attachments (sent from this dashboard's
 * [ShareActions] or from the Flutter customer app) as tappable cards, and
 * falls back to the SDK's own `Attachment` for everything else (images,
 * files, link previews, ...). Installed via `ComponentProvider` in
 * `app/dashboard/chat/page.tsx`. */
export function CustomAttachment(props: AttachmentProps) {
  const linkAttachments = props.attachments.filter(
    (a): a is LinkAttachment => (a as StreamAttachment).type === "PRODUCT_LINK" || (a as StreamAttachment).type === "ORDER_LINK",
  );
  const rest = props.attachments.filter((a) => !linkAttachments.includes(a as LinkAttachment));

  if (linkAttachments.length === 0) return <DefaultAttachment {...props} />;

  return (
    <div className="flex flex-col gap-2">
      {linkAttachments.map((a, i) =>
        a.type === "PRODUCT_LINK" ? (
          <ProductLinkCard key={i} attachment={a} />
        ) : (
          <OrderLinkCard key={i} attachment={a} />
        ),
      )}
      {rest.length > 0 && <DefaultAttachment {...props} attachments={rest} />}
    </div>
  );
}

interface ProductPreview {
  Id: string;
  ProductName: string;
  Description?: string | null;
  Price?: number;
  ThumbnailPath?: string | null;
  Stock?: number;
}

function ProductLinkCard({ attachment }: { attachment: LinkAttachment }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductPreview | null>(null);

  const productId = attachment.productId;
  const name = attachment.productName ?? "Produk";
  const price = attachment.price;
  const thumbUrl = toPublicAssetUrl(attachment.thumbnailPath);

  const handleOpen = async () => {
    if (!productId) return;
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ProductPreview>(`products/${productId}`);
      setProduct(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Produk tidak ditemukan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-60 items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 text-left transition-colors hover:bg-surface-muted"
      >
        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-muted">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- externally-hosted upload
            <img src={thumbUrl} alt="" className="size-full object-cover" />
          ) : (
            <ImageOff className="size-4 text-ink-faint" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{name}</p>
          {price !== undefined && <p className="text-xs font-semibold text-orange-600">{formatCurrency(price)}</p>}
        </div>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Detail Produk" size="sm">
        {loading ? (
          <p className="text-sm text-ink-soft">Memuat...</p>
        ) : error ? (
          <p className="text-sm text-error">{error}</p>
        ) : product ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-muted">
                {toPublicAssetUrl(product.ThumbnailPath) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={toPublicAssetUrl(product.ThumbnailPath)!} alt="" className="size-full object-cover" />
                ) : (
                  <Package className="size-5 text-ink-faint" />
                )}
              </div>
              <div>
                <p className="font-bold text-ink">{product.ProductName}</p>
                {product.Price !== undefined && (
                  <p className="text-sm font-semibold text-orange-600">{formatCurrency(product.Price)}</p>
                )}
                {product.Stock !== undefined && <p className="text-xs text-ink-soft">Stok: {product.Stock}</p>}
              </div>
            </div>
            {product.Description && <p className="text-sm text-ink-soft">{product.Description}</p>}
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function OrderLinkCard({ attachment }: { attachment: LinkAttachment }) {
  const router = useRouter();
  const orderId = attachment.orderId;
  const orderNumber = attachment.orderNumber ?? "Pesanan";
  const totalAmount = attachment.totalAmount;

  return (
    <button
      type="button"
      onClick={() => orderId && router.push(`/dashboard/orders/${orderId}`)}
      className="flex w-60 items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 text-left transition-colors hover:bg-surface-muted"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-100">
        <Receipt className="size-5 text-purple-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">#{orderNumber}</p>
        {totalAmount !== undefined && <p className="text-xs font-semibold text-orange-600">{formatCurrency(totalAmount)}</p>}
      </div>
    </button>
  );
}

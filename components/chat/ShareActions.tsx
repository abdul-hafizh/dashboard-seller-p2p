"use client";

import { useState } from "react";
import { Package, Receipt, ImageOff, Loader2 } from "lucide-react";
import { useChannelStateContext, useChatContext } from "stream-chat-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, toPublicAssetUrl } from "@/lib/resources/format";
import { Modal } from "@/components/ui/Modal";
import type { LinkAttachment } from "./CustomAttachment";

interface ProductRow {
  Id: string;
  ProductName: string;
  Price?: number;
  ThumbnailPath?: string | null;
  SellerId?: string | null;
}

interface OrderRow {
  Id: string;
  OrderNumber?: string | null;
  TotalAmount?: number | null;
}

/** Installed as `AdditionalMessageComposerActions` via `ComponentProvider` in
 * `app/dashboard/chat/page.tsx` — a slot with no props, so it reads the
 * active channel/user from context itself. Lets the merchant share one of
 * their own products, or one of the current customer's orders, as a tappable
 * link message (rendered by `CustomAttachment` on both this dashboard and
 * the Flutter customer app). */
export function ShareActions() {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const { user } = useAuth();
  const [picker, setPicker] = useState<"product" | "order" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [sending, setSending] = useState(false);

  const otherUserId = () => {
    const myId = client.userID;
    const members = channel.state.members ?? {};
    return Object.keys(members).find((id) => id !== myId);
  };

  const openProductPicker = async () => {
    if (!user) return;
    setPicker("product");
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ProductRow[]>("products", { query: { limit: 200 } });
      setProducts(res.data.filter((p) => p.SellerId === user.Id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal memuat produk.");
    } finally {
      setLoading(false);
    }
  };

  const openOrderPicker = async () => {
    const customerUserId = otherUserId();
    setPicker("order");
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<OrderRow[]>("orders", { query: { customerUserId, limit: 100 } });
      setOrders(res.data.filter((o) => o.TotalAmount));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal memuat pesanan.");
    } finally {
      setLoading(false);
    }
  };

  const sendProduct = async (product: ProductRow) => {
    setSending(true);
    try {
      const attachment: LinkAttachment = {
        type: "PRODUCT_LINK",
        productId: product.Id,
        productName: product.ProductName,
        thumbnailPath: product.ThumbnailPath ?? null,
        price: product.Price,
      };
      await channel.sendMessage({ text: `🔗 Produk: ${product.ProductName}`, attachments: [attachment] });
      setPicker(null);
    } finally {
      setSending(false);
    }
  };

  const sendOrder = async (order: OrderRow) => {
    setSending(true);
    try {
      const attachment: LinkAttachment = {
        type: "ORDER_LINK",
        orderId: order.Id,
        orderNumber: order.OrderNumber ?? order.Id,
        totalAmount: order.TotalAmount ?? undefined,
      };
      await channel.sendMessage({ text: `🔗 Pesanan #${order.OrderNumber ?? order.Id}`, attachments: [attachment] });
      setPicker(null);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openProductPicker}
        title="Kirim Produk"
        className="flex size-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <Package className="size-4.5" />
      </button>
      <button
        type="button"
        onClick={openOrderPicker}
        title="Kirim Pesanan"
        className="flex size-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <Receipt className="size-4.5" />
      </button>

      <Modal
        open={picker !== null}
        onClose={() => setPicker(null)}
        title={picker === "product" ? "Pilih Produk" : "Pilih Pesanan"}
        size="sm"
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-ink-faint" />
          </div>
        ) : error ? (
          <p className="text-sm text-error">{error}</p>
        ) : picker === "product" ? (
          products.length === 0 ? (
            <p className="text-sm text-ink-soft">Kamu belum punya produk.</p>
          ) : (
            <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p.Id}
                  type="button"
                  disabled={sending}
                  onClick={() => sendProduct(p)}
                  className="flex items-center gap-3 rounded-xl border border-border p-2.5 text-left transition-colors hover:bg-surface-muted disabled:opacity-50"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                    {toPublicAssetUrl(p.ThumbnailPath) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={toPublicAssetUrl(p.ThumbnailPath)!} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff className="size-4 text-ink-faint" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{p.ProductName}</p>
                    {p.Price !== undefined && <p className="text-xs text-ink-soft">{formatCurrency(p.Price)}</p>}
                  </div>
                </button>
              ))}
            </div>
          )
        ) : orders.length === 0 ? (
          <p className="text-sm text-ink-soft">Belum ada pesanan berharga dari customer ini.</p>
        ) : (
          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {orders.map((o) => (
              <button
                key={o.Id}
                type="button"
                disabled={sending}
                onClick={() => sendOrder(o)}
                className="flex items-center gap-3 rounded-xl border border-border p-2.5 text-left transition-colors hover:bg-surface-muted disabled:opacity-50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                  <Receipt className="size-4 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">#{o.OrderNumber ?? o.Id}</p>
                  {o.TotalAmount !== undefined && o.TotalAmount !== null && (
                    <p className="text-xs text-ink-soft">{formatCurrency(o.TotalAmount)}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

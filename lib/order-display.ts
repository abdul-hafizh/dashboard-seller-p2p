import { ITEM_CATEGORIES } from "./item-category";

/** The slice of an `/orders` list row needed to label it. The backend's list
 * include carries each item's Product and AIModel (with previews + the AI
 * job's owner). */
export interface OrderDisplaySource {
  Notes?: string | null;
  Customer?: { UserId?: string | null; User?: { Id?: string | null } | null } | null;
  Items?: Array<{
    Product?: { ProductName?: string | null; ThumbnailPath?: string | null } | null;
    AIModel?: {
      ModelName?: string | null;
      Previews?: Array<{ PreviewPath?: string | null }> | null;
      Job?: { UserId?: string | null; Prompt?: string | null } | null;
    } | null;
  }> | null;
}

export interface OrderDisplay {
  kind: "product" | "aiDesign" | "custom";
  title: string;
  /** Raw path/URL — pass through `toPublicAssetUrl` to render. */
  thumbnailPath: string | null;
}

/** Title + picture for an order, mirroring `PhysicalOrder.display` in the
 * Flutter app: a marketplace product, the customer's own AI design, or a
 * custom/manual order (named only in its notes). Older custom orders were
 * saved with an unrelated placeholder AI model, so a model whose job belongs
 * to someone other than the order's customer counts as custom. */
export function orderDisplay(order: OrderDisplaySource): OrderDisplay {
  // Non-product items are named after their category (see lib/item-category.ts).
  const item = order.Items?.[0];

  const product = item?.Product;
  if (product) {
    return {
      kind: "product",
      title: product.ProductName?.trim() || "Produk",
      thumbnailPath: product.ThumbnailPath || null,
    };
  }

  const model = item?.AIModel;
  const owner = model?.Job?.UserId?.toLowerCase();
  const customerUserId = (order.Customer?.UserId ?? order.Customer?.User?.Id)?.toLowerCase();
  if (model && (!owner || !customerUserId || owner === customerUserId)) {
    return {
      kind: "aiDesign",
      title: ITEM_CATEGORIES.PROMPT,
      thumbnailPath: model.Previews?.[0]?.PreviewPath || null,
    };
  }

  return { kind: "custom", title: ITEM_CATEGORIES.PRINT_FILE, thumbnailPath: null };
}

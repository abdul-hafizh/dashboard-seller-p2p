/** Same rules as the backend's utils/itemCategory.js. */
export const ITEM_CATEGORIES = {
  READY: "Barang Jadi",
  PROMPT: "File Via Prompt",
  PRINT_FILE: "File Siap Print",
} as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[keyof typeof ITEM_CATEGORIES];

interface CategorizableItem {
  ProductId?: string | null;
  Product?: { ProductName?: string | null } | null;
  AIModelId?: string | null;
  /** Only its Job.UserId (when loaded) is read. */
  AIModel?: object | null;
}

const sameId = (a?: string | null, b?: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/**
 * Barang Jadi (a Produk-menu product), File Via Prompt (a Meshy design) or
 * File Siap Print (Pesanan Custom). `customerUserId` catches old custom
 * orders that point at someone else's AI model as a placeholder.
 */
export function itemCategory(item: CategorizableItem | null | undefined, customerUserId?: string | null): ItemCategory {
  if (!item) return ITEM_CATEGORIES.PRINT_FILE;
  if (item.ProductId || item.Product) return ITEM_CATEGORIES.READY;
  if (item.AIModelId || item.AIModel) {
    const owner = (item.AIModel as { Job?: { UserId?: string | null } | null } | null | undefined)?.Job?.UserId;
    if (owner && customerUserId && !sameId(owner, customerUserId)) return ITEM_CATEGORIES.PRINT_FILE;
    return ITEM_CATEGORIES.PROMPT;
  }
  return ITEM_CATEGORIES.PRINT_FILE;
}

/** The product's name for ready-made goods, otherwise the category itself. */
export function itemDisplayName(item: CategorizableItem | null | undefined, customerUserId?: string | null): string {
  const category = itemCategory(item, customerUserId);
  return category === ITEM_CATEGORIES.READY ? item?.Product?.ProductName?.trim() || category : category;
}

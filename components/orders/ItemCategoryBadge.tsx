import { Badge } from "@/components/ui/Badge";
import { ITEM_CATEGORIES, itemCategory, type ItemCategory } from "@/lib/item-category";

const TONE: Record<ItemCategory, "success" | "brand" | "info"> = {
  [ITEM_CATEGORIES.READY]: "success",
  [ITEM_CATEGORIES.PROMPT]: "brand",
  [ITEM_CATEGORIES.PRINT_FILE]: "info",
};

export function ItemCategoryBadge({ category }: { category: ItemCategory }) {
  return <Badge tone={TONE[category]}>{category}</Badge>;
}

/** Every distinct category among an order's items (an order from the cart can mix them). */
export function orderCategories(
  items: Parameters<typeof itemCategory>[0][] | null | undefined,
  customerUserId?: string | null,
): ItemCategory[] {
  const list = (items ?? []).map((it) => itemCategory(it, customerUserId));
  return [...new Set(list.length ? list : [ITEM_CATEGORIES.PRINT_FILE])];
}

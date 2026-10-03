import type { CartItem } from '@/types/domain';

/** A position is one product, canonical variant and store, regardless of units. */
export function countActiveCartLines(items: readonly CartItem[]) {
  const identities = new Set<string>();
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) continue;
    identities.add(
      JSON.stringify([
        item.productId,
        item.variantId ?? 'default',
        item.storeId,
      ]),
    );
  }
  return identities.size;
}

export function selectCartLineCount(state: { items: CartItem[] }) {
  return countActiveCartLines(state.items);
}

export function formatCartBadge(count: number) {
  return count > 0 ? (count > 99 ? '99+' : String(count)) : undefined;
}

export function formatCartAccessibilityLabel(count: number) {
  if (count === 0) return 'Кошик, порожній';
  const lastTwo = count % 100;
  const last = count % 10;
  const unit =
    lastTwo >= 11 && lastTwo <= 14
      ? 'товарів'
      : last === 1
        ? 'товар'
        : last >= 2 && last <= 4
          ? 'товари'
          : 'товарів';
  return `Кошик, ${count} ${unit}`;
}

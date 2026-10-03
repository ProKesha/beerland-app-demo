import type { CartItem } from '@/types/domain';
import { useCartStore } from './cart';
import { useSelectedStore } from './selectedStore';

/** No async boundary: publish cart first so new selection never sees old lines. */
export function commitCartTransfer(items: CartItem[], storeId: string) {
  if (items.some((item) => item.storeId !== storeId))
    throw new Error('Transfer must belong to one store');
  useCartStore.setState({ items });
  useSelectedStore.getState().select(storeId);
}

/** Before exposing hydrated UI, repair a torn two-key write using cart identity.
 * A nonempty single-store cart is authoritative. Never delete or merge mixed carts.
 */
export function reconcileCartStore() {
  const ids = new Set(
    useCartStore.getState().items.map((item) => item.storeId),
  );
  if (ids.size === 1) {
    const id = [...ids][0];
    if (useSelectedStore.getState().storeId !== id)
      useSelectedStore.getState().select(id);
  }
}

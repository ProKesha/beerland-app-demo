import type { Product } from '@/types/domain';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { sessionOwner, useSessionStore } from '@/stores/session';
import { productVariants, variantOffer } from './variants';
import {
  adjacentServing,
  canChangeServing,
  firstAvailableVariant,
  productCartLine,
  quantityLimit,
  stepProductCartLine,
} from './cartActions';

export function useProductCartControl(product: Product, disabled: boolean) {
  const items = useCartStore((s) => s.items);
  const storeId = useSelectedStore((s) => s.storeId) ?? undefined;
  const hydrated = useSessionStore((s) => s.hydrated);
  const owner = useSessionStore(sessionOwner);
  const item = productCartLine(product, items, storeId);
  const variant = item
    ? productVariants(product).find(
        (v) => v.id === (item.variantId ?? 'default'),
      )
    : storeId
      ? (firstAvailableVariant(product, storeId) ?? productVariants(product)[0])
      : undefined;
  const offer = variant && variantOffer(product, variant, storeId);
  const draft = variant?.servingType === 'draft';
  const canOrder = hydrated && !disabled;
  return {
    item,
    variant,
    offer,
    draft,
    otherLines: items.filter(
      (i) => i.storeId === storeId && i.productId === product.id && i !== item,
    ).length,
    previous: item && draft ? adjacentServing(product, item, -1) : undefined,
    next: item && draft ? adjacentServing(product, item, 1) : undefined,
    incrementDisabled:
      !item ||
      !variant ||
      !canOrder ||
      (draft
        ? !adjacentServing(product, item, 1) ||
          !canChangeServing(product, item, 1, items)
        : offer?.availability !== 'available' ||
          item.quantity >= quantityLimit(product, variant, item.storeId)),
    decrementDisabled:
      !hydrated ||
      !!(
        item &&
        draft &&
        (!canChangeServing(product, item, -1, items) ||
          (!canOrder && adjacentServing(product, item, -1)))
      ),
    step: (direction: -1 | 1) => {
      const session = useSessionStore.getState();
      if (!hydrated || !session.hydrated || owner !== sessionOwner(session))
        return;
      if (storeId) stepProductCartLine(product, storeId, direction, canOrder);
    },
  };
}

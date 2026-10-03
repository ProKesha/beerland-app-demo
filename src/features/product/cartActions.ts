import type { CartItem, Product, ProductVariant } from '@/types/domain';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import { checkoutRules } from '@/features/cart/pricing';
import { productVariants, variantOffer } from './variants';

export function quantityLimit(
  product: Product,
  variant: ProductVariant,
  storeId: string,
) {
  return Math.min(
    checkoutRules.maxQuantity,
    variantOffer(product, variant, storeId).maxQuantity ??
      checkoutRules.maxQuantity,
  );
}

/** Sorting repository sizes never creates a new serving or changes its price. */
export function shoppingVariants(product: Product) {
  const variants = productVariants(product);
  return product.servingType === 'draft'
    ? variants
        .filter(
          (v) =>
            v.servingType === 'draft' && v.volume.unit === product.volume.unit,
        )
        .sort(
          (a, b) => a.volume.value - b.volume.value || a.id.localeCompare(b.id),
        )
    : variants;
}

export function firstAvailableVariant(product: Product, storeId: string) {
  return shoppingVariants(product).find(
    (v) => variantOffer(product, v, storeId).availability === 'available',
  );
}

export function productCartLine(
  product: Product,
  items: CartItem[],
  storeId?: string,
  variantId?: string,
) {
  if (!storeId) return undefined;
  const lines = items.filter(
    (i) => i.productId === product.id && i.storeId === storeId,
  );
  return variantId !== undefined
    ? lines.find((i) => (i.variantId ?? 'default') === variantId)
    : shoppingVariants(product).flatMap((v) =>
        lines.filter((i) => (i.variantId ?? 'default') === v.id),
      )[0];
}

export function adjacentServing(
  product: Product,
  item: CartItem,
  direction: -1 | 1,
) {
  const variants = shoppingVariants(product);
  const index = variants.findIndex(
    (v) => v.id === (item.variantId ?? 'default'),
  );
  if (index < 0) return undefined;
  const candidates =
    direction < 0
      ? variants.slice(0, index).reverse()
      : variants.slice(index + 1);
  return candidates.find(
    (v) =>
      (direction < 0
        ? v.volume.value < variants[index].volume.value
        : v.volume.value > variants[index].volume.value) &&
      variantOffer(product, v, item.storeId).availability === 'available',
  );
}

function isCurrentWorkspace(storeId: string) {
  return (
    useSessionStore.getState().hydrated &&
    useSelectedStore.getState().storeId === storeId
  );
}

export type AddResult = 'added' | 'unavailable' | 'limit' | 'stale';
export function addProductToCart(
  product: Product,
  storeId: string,
  canOrder: boolean,
): AddResult {
  const variant = firstAvailableVariant(product, storeId);
  if (!variant) return 'unavailable';
  return addProductVariantToCart(
    product,
    variant,
    storeId,
    1,
    canOrder,
    'implicit',
  );
}

export function addProductVariantToCart(
  product: Product,
  variant: ProductVariant,
  storeId: string,
  quantity: number,
  canOrder: boolean,
  defaultIdentity: 'implicit' | 'explicit' = 'explicit',
): AddResult {
  if (!isCurrentWorkspace(storeId)) return 'stale';
  if (
    !canOrder ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    variantOffer(product, variant, storeId).availability !== 'available'
  )
    return 'unavailable';
  const existing =
    productCartLine(product, useCartStore.getState().items, storeId, variant.id)
      ?.quantity ?? 0;
  if (existing + quantity > quantityLimit(product, variant, storeId))
    return 'limit';
  useCartStore.getState().addItem({
    productId: product.id,
    storeId,
    ...(variant.id === 'default' && defaultIdentity === 'implicit'
      ? {}
      : { variantId: variant.id }),
    quantity,
  });
  return 'added';
}

export function canChangeServing(
  product: Product,
  item: CartItem,
  direction: -1 | 1,
  items: CartItem[],
) {
  const next = adjacentServing(product, item, direction);
  if (!next) return direction < 0;
  const target = productCartLine(product, items, item.storeId, next.id);
  return (
    item.quantity + (target?.quantity ?? 0) <=
    quantityLimit(product, next, item.storeId)
  );
}

/** Portion counts remain integer even when a serving changes in the same event batch. */
export function stepCartPortionCount(
  product: Product | null,
  item: CartItem,
  direction: -1 | 1,
  canOrder: boolean,
  variantId = item.variantId ?? 'default',
) {
  if (!useSessionStore.getState().hydrated) return;
  const cart = useCartStore.getState();
  const live = cart.items.find(
    (entry) =>
      entry.productId === item.productId &&
      entry.storeId === item.storeId &&
      (entry.variantId ?? 'default') === variantId,
  );
  if (!live) return;
  const next = live.quantity + direction;
  if (next < 1) return;
  const variant =
    product && productVariants(product).find((entry) => entry.id === variantId);
  if (
    direction > 0 &&
    (!isCurrentWorkspace(item.storeId) ||
      !canOrder ||
      !product ||
      !variant ||
      variantOffer(product, variant, item.storeId).availability !==
        'available' ||
      next > quantityLimit(product, variant, item.storeId))
  )
    return;
  cart.setQuantity(item.productId, item.storeId, next, live.variantId);
}

/** Re-read the source and target synchronously: events from any card share one truth. */
export function stepProductCartLine(
  product: Product,
  storeId: string,
  direction: -1 | 1,
  canOrder: boolean,
  variantId?: string,
) {
  if (!isCurrentWorkspace(storeId)) return false;
  const cart = useCartStore.getState();
  const item = productCartLine(product, cart.items, storeId, variantId);
  if (!item) return false;
  const variant = productVariants(product).find(
    (v) => v.id === (item.variantId ?? 'default'),
  );
  if (!variant) return false;
  if (variant.servingType === 'draft') {
    const next = adjacentServing(product, item, direction);
    if (!next && direction < 0) {
      cart.removeItem(product.id, storeId, item.variantId);
      return true;
    }
    if (
      !next ||
      !canOrder ||
      !canChangeServing(product, item, direction, cart.items)
    )
      return false;
    cart.replaceVariant(product.id, storeId, next.id, item.variantId);
    return next.id;
  }
  const next = item.quantity + direction;
  if (
    direction > 0 &&
    (!canOrder ||
      variantOffer(product, variant, storeId).availability !== 'available' ||
      next > quantityLimit(product, variant, storeId))
  )
    return false;
  cart.setQuantity(product.id, storeId, next, item.variantId);
  return true;
}

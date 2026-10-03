import type { Order, CartItem, Money } from '@/types/domain';
import type { ProductRepository } from '@/repositories/contracts';
import { productVariants, variantOffer } from '@/features/product/variants';
import { checkoutRules } from '@/features/cart/pricing';
export interface ReorderResult {
  availableItems: CartItem[];
  unavailableItems: {
    productId: string;
    variantId?: string;
    quantity: number;
    reason: 'missing' | 'unavailable' | 'limit';
  }[];
  changedPrices: { productId: string; currentPrice: Money }[];
  storeConflict: boolean;
}
/** Always resolves current products and offers. Historic prices never enter the cart. */
export async function prepareReorder(
  order: Order,
  storeId: string,
  products: ProductRepository,
  cart: CartItem[] = [],
): Promise<ReorderResult> {
  const result: ReorderResult = {
    availableItems: [],
    unavailableItems: [],
    changedPrices: [],
    storeConflict: cart.some((i) => i.storeId !== storeId),
  };
  const resolved = await Promise.all(
    order.items.map((item) => products.getById(item.productId)),
  );
  order.items.forEach((item, index) => {
    const product = resolved[index];
    const variant =
      product &&
      productVariants(product).find(
        (v) => v.id === (item.variantId ?? 'default'),
      );
    if (!product || !variant) {
      result.unavailableItems.push({ ...item, reason: 'missing' });
      return;
    }
    const offer = variantOffer(product, variant, storeId);
    if (offer.availability !== 'available') {
      result.unavailableItems.push({ ...item, reason: 'unavailable' });
      return;
    }
    const existing = [...cart, ...result.availableItems]
      .filter(
        (i) =>
          i.productId === item.productId &&
          i.storeId === storeId &&
          (i.variantId ?? 'default') === variant.id,
      )
      .reduce((n, i) => n + i.quantity, 0);
    const quantity = Math.max(
      0,
      Math.min(
        item.quantity,
        (offer.maxQuantity ?? checkoutRules.maxQuantity) - existing,
      ),
    );
    if (quantity < item.quantity)
      result.unavailableItems.push({
        ...item,
        quantity: item.quantity - quantity,
        reason: 'limit',
      });
    if (quantity > 0) {
      result.availableItems.push({
        productId: item.productId,
        ...(variant.id === 'default' ? {} : { variantId: variant.id }),
        storeId,
        quantity,
      });
      const historic = (item as CartItem & { unitPrice?: Money }).unitPrice;
      if (
        historic &&
        (historic.amount !== offer.price.amount ||
          historic.currency !== offer.price.currency)
      )
        result.changedPrices.push({
          productId: item.productId,
          currentPrice: offer.price,
        });
    }
  });
  return result;
}

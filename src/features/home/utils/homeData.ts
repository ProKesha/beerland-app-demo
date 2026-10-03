import type { Order, Product, Store } from '@/types/domain';
import type { FulfillmentMethod } from '@/stores/fulfillment';

export function resolveFulfillment(
  method: FulfillmentMethod,
  store?: Store,
): FulfillmentMethod | null {
  if (!store) return method;
  if (method === 'delivery' && store.deliveryAvailable) return method;
  if (method === 'pickup' && store.pickupAvailable) return method;
  return store.pickupAvailable
    ? 'pickup'
    : store.deliveryAvailable
      ? 'delivery'
      : null;
}

export function deriveHomeProducts(products: Product[]) {
  return {
    popularProducts: products
      .filter((product) => product.isPopular)
      .slice(0, 5),
    ownBreweryProducts: products
      .filter((product) => product.isOwnBrewery)
      .slice(0, 3),
    snackProducts: products
      .filter((product) => product.category === 'snacks')
      .slice(0, 3),
  };
}

/** Repeat only complete, currently orderable orders for the selected location. */
export function findReorder(
  orders: Order[],
  products: Product[],
  storeId?: string,
) {
  if (!storeId) return undefined;
  const available = new Set(
    products
      .filter(
        (p) => p.availability === 'available' && p.storeIds.includes(storeId),
      )
      .map((p) => p.id),
  );
  return orders
    .filter(
      (order) =>
        order.storeId === storeId &&
        order.status === 'completed' &&
        Number.isFinite(Date.parse(order.createdAt)) &&
        order.items.length > 0 &&
        order.items.every(
          (item) =>
            item.storeId === storeId &&
            available.has(item.productId) &&
            Number.isSafeInteger(item.quantity) &&
            item.quantity > 0,
        ),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
}

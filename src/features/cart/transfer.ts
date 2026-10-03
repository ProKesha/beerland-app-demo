import type { CartItem } from '@/types/domain';
import type { Repositories } from '@/repositories/contracts';
import type { FulfillmentMethod } from '@/stores/fulfillment';
import { createQuote, resolveCartLine } from './pricing';

/** Resolve once, preserve every requested SKU/quantity, and never mutate state. */
export async function prepareCartTransfer(
  items: CartItem[],
  targetId: string,
  method: FulfillmentMethod,
  repositories: Repositories,
) {
  const ids = [...new Set(items.map((item) => item.productId))];
  const [store, entries] = await Promise.all([
    repositories.stores.getById(targetId),
    Promise.all(
      ids.map(
        async (id) => [id, await repositories.products.getById(id)] as const,
      ),
    ),
  ]);
  if (
    !store ||
    store.temporarilyClosed ||
    (!store.pickupAvailable && !store.deliveryAvailable)
  )
    throw new Error('Target store unavailable');
  const products = Object.fromEntries(entries);
  const transferred = items.map((item) => ({ ...item, storeId: store.id }));
  const quote = createQuote(
    transferred,
    items.map((item) => products[item.productId]),
    store,
    method,
  );
  const changedPrices = quote.lines.filter((line, index) => {
    const previous = resolveCartLine(
      items[index],
      products[items[index].productId],
      items[index].storeId,
    );
    return (
      line.priceKnown &&
      previous.priceKnown &&
      (line.unitPrice.amount !== previous.unitPrice.amount ||
        line.unitPrice.currency !== previous.unitPrice.currency)
    );
  });
  return {
    items: transferred,
    quote,
    changedPrices,
    resources: { store, products },
  };
}

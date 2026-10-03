import { useQuery } from '@tanstack/react-query';
import type { Repositories, RequestOptions } from '@/repositories/contracts';
import { useRepositories } from '@/repositories/RepositoryProvider';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import {
  useFulfillmentStore,
  type FulfillmentMethod,
} from '@/stores/fulfillment';
import { useSessionStore } from '@/stores/session';
import type { CartItem, Product, Store } from '@/types/domain';
import { createQuote } from './pricing';
export interface CartResources {
  products: Record<string, Product | null>;
  store: Store | null;
}
export function cartResourceKey(items: CartItem[], storeId: string | null) {
  return [
    'cart',
    'resources',
    [...new Set(items.map((item) => item.productId))].sort(),
    storeId,
  ] as const;
}
async function fetchResources(
  repositories: Repositories,
  ids: string[],
  storeId: string | null,
  options?: RequestOptions,
): Promise<CartResources> {
  const [entries, store] = await Promise.all([
    Promise.all(
      ids.map(
        async (id) =>
          [id, await repositories.products.getById(id, options)] as const,
      ),
    ),
    storeId
      ? repositories.stores.getById(storeId, options)
      : Promise.resolve(null),
  ]);
  return { products: Object.fromEntries(entries), store };
}
function quoteFromResources(
  resources: CartResources,
  items: CartItem[],
  method: FulfillmentMethod,
) {
  return createQuote(
    items,
    items.map((item) => resources.products[item.productId] ?? null),
    resources.store,
    method,
  );
}
export async function fetchCartQuote(
  repositories: Repositories,
  items: CartItem[],
  storeId: string | null,
  method: FulfillmentMethod,
  options?: RequestOptions,
) {
  const resources = await fetchResources(
    repositories,
    [...new Set(items.map((item) => item.productId))],
    storeId,
    options,
  );
  return quoteFromResources(resources, items, method);
}
/** Quantities and fulfillment recalculate synchronously; only inventory is queried. */
export function useCartQuote() {
  const repositories = useRepositories();
  const items = useCartStore((s) => s.items);
  const storeId = useSelectedStore((s) => s.storeId);
  const method = useFulfillmentStore((s) => s.method);
  const hydrated = useSessionStore((s) => s.hydrated);
  const query = useQuery({
    queryKey: cartResourceKey(items, storeId),
    enabled: hydrated,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: ({ signal }) =>
      fetchResources(
        repositories,
        [...new Set(items.map((item) => item.productId))],
        storeId,
        { signal },
      ),
  });
  return {
    ...query,
    data: query.data
      ? quoteFromResources(query.data, items, method)
      : undefined,
    refetch: async (options?: { throwOnError?: boolean }) => {
      const result = await query.refetch(options);
      return {
        ...result,
        data: result.data
          ? quoteFromResources(result.data, items, method)
          : undefined,
      };
    },
  };
}

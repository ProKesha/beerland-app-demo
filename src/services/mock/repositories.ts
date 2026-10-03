import {
  createLocalUserRepository,
  demoLoyalty,
  demoAddresses,
} from './account';
import { createMockOrderRepository, type MockOrderOptions } from './orders';
import type { Repositories, RequestOptions } from '@/repositories/contracts';
import { products, stores, promotions } from './fixtures';
import { searchProducts } from './searchProducts';
import { productAtStore } from '@/utils/productOffer';
import { productRecommendations } from './productRecommendations';
import { createMockAuthRepository } from './auth';
async function respond<T>(value: T, options?: RequestOptions): Promise<T> {
  if (options?.signal?.aborted) {
    const error = new Error('Request aborted');
    error.name = 'AbortError';
    throw error;
  }
  // Clone results so consumers cannot mutate the shared fixtures.
  return JSON.parse(JSON.stringify(value)) as T;
}
export function createMockRepositories(
  orderOptions?: MockOrderOptions,
): Repositories {
  return {
    auth: createMockAuthRepository({
      enabled: orderOptions?.authEnabled ?? false,
      storage: orderOptions?.storage,
    }),
    products: {
      recommendations: (id, storeId, options) =>
        respond(productRecommendations(products, id, storeId), options),
      searchProducts: (request, options) =>
        respond(searchProducts(products, promotions, request), options),
      catalogMetadata: (options) =>
        respond(
          {
            breweries: [
              ...new Set(
                products.flatMap((p) => (p.brewery ? [p.brewery] : [])),
              ),
            ].sort(),
          },
          options,
        ),
      list: (filters, options) =>
        respond(
          products
            .map((p) => productAtStore(p, filters?.storeId))
            .filter(
              (product) =>
                (!filters?.storeId ||
                  product.storeIds.includes(filters.storeId)) &&
                (!filters?.servingType ||
                  product.servingType === filters.servingType) &&
                (!filters?.availability ||
                  product.availability === filters.availability),
            ),
          options,
        ),
      getById: (id, options) =>
        respond(products.find((product) => product.id === id) ?? null, options),
    },
    stores: {
      list: (options) => respond(stores, options),
      getById: (id, options) =>
        respond(stores.find((store) => store.id === id) ?? null, options),
    },
    orders: createMockOrderRepository(orderOptions),
    promotions: {
      list: (filters, options) =>
        respond(
          promotions.filter((promotion) => {
            const time = Date.parse(filters.activeAt);
            return (
              Date.parse(promotion.startsAt) <= time &&
              (!promotion.endsAt || time < Date.parse(promotion.endsAt)) &&
              (promotion.storeIds.length === 0 ||
                (!!filters.storeId &&
                  promotion.storeIds.includes(filters.storeId)))
            );
          }),
          options,
        ),
    },
    users: orderOptions?.demoAccount
      ? createLocalUserRepository(orderOptions?.storage, demoAddresses)
      : {
          getCurrent: (options) => respond(null, options),
          updateCurrent: createLocalUserRepository(orderOptions?.storage)
            .updateCurrent,
        },
    loyalty: {
      getCurrent: (options) =>
        respond(orderOptions?.demoAccount ? demoLoyalty : null, options),
    },
  };
}

import type {
  ProductFilters,
  PromotionFilters,
} from '@/repositories/contracts';
export const queryKeys = {
  products: {
    all: ['products'] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    list: (filters: ProductFilters = {}) =>
      ['products', 'list', filters] as const,
  },
  stores: { all: ['stores'] as const, list: () => ['stores', 'list'] as const },
  promotions: {
    active: (storeId?: string) => ['promotions', 'active', storeId] as const,
    list: (filters: PromotionFilters) => ['promotions', filters] as const,
  },
  orders: { list: () => ['orders', 'list'] as const },
};

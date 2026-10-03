import { useEffect, useState } from 'react';
import type { CommerceGroup } from '@/types/domain';
import type {
  CatalogRequest,
  CatalogFilters,
  CatalogCategory,
  CatalogSort,
} from './model';
export function useDiscoveryState(initial: CatalogRequest) {
  const [state, setState] = useState(initial);
  const [query, setQuery] = useState(initial.query ?? '');
  useEffect(() => {
    const timer = setTimeout(
      () => setState((s) => ({ ...s, query: query.trim() })),
      250,
    );
    return () => clearTimeout(timer);
  }, [query]);
  return {
    state,
    query,
    setQuery,
    setGroup: (group?: CommerceGroup) =>
      setState((s) => ({
        ...s,
        group,
        subcategory: undefined,
        category: 'all',
      })),
    setSubcategory: (subcategory?: string) =>
      setState((s) => ({ ...s, subcategory })),
    setCategory: (category: CatalogCategory) =>
      setState((s) => ({ ...s, category })),
    setFilters: (filters: CatalogFilters) =>
      setState((s) => ({ ...s, filters })),
    setSort: (sort: CatalogSort) => setState((s) => ({ ...s, sort })),
    clearPromotion: () => setState((s) => ({ ...s, promotionId: undefined })),
    clearFilters: () =>
      setState((s) => ({
        ...s,
        filters: {},
        category: 'all',
        subcategory: undefined,
        promotionId: undefined,
      })),
  };
}

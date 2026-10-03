import { useEffect, useState } from 'react';
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
        promotionId: undefined,
      })),
  };
}

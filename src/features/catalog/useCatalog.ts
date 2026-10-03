import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/RepositoryProvider';
import type { CatalogRequest } from './model';
export function useCatalog(request: CatalogRequest, enabled: boolean) {
  const { products } = useRepositories();
  return useInfiniteQuery({
    queryKey: ['products', 'catalog', request],
    enabled,
    initialPageParam: 0,
    queryFn: ({ signal, pageParam }) =>
      products.searchProducts(
        { ...request, offset: pageParam, limit: 36 },
        { signal },
      ),
    getNextPageParam: (page) => page.nextOffset,
  });
}
export function useCatalogMetadata(enabled: boolean) {
  const { products } = useRepositories();
  return useQuery({
    queryKey: ['products', 'catalog-metadata'],
    enabled,
    queryFn: ({ signal }) => products.catalogMetadata({ signal }),
    staleTime: 300_000,
  });
}
export function useCatalogCount(request: CatalogRequest) {
  const { products } = useRepositories();
  return useQuery({
    queryKey: ['products', 'catalog-count', request],
    queryFn: ({ signal }) =>
      products.searchProducts({ ...request, offset: 0, limit: 1 }, { signal }),
  });
}

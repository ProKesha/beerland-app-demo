import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { useRepositories } from '@/repositories/RepositoryProvider';
import type { Product } from '@/types/domain';

export interface FavoriteProduct {
  id: string;
  product: Product | null;
}

/** Keep each favorite cached independently so removal never reloads the list. */
export function useFavoriteProducts(
  ids: string[],
  { enabled = true }: { enabled?: boolean } = {},
) {
  const repositories = useRepositories();
  const queries = useQueries({
    queries: ids.map((id) => ({
      enabled,
      queryKey: queryKeys.products.detail(id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        repositories.products.getById(id, { signal }),
    })),
  });
  return {
    data: ids.map((id, index): FavoriteProduct => ({
      id,
      product: queries[index].data ?? null,
    })),
    isPending: queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { useRepositories } from '@/repositories/RepositoryProvider';
import type { ProductFilters } from '@/repositories/contracts';
export function useProducts(
  filters: ProductFilters = {},
  { enabled = true }: { enabled?: boolean } = {},
) {
  const repositories = useRepositories();
  return useQuery({
    enabled,
    queryKey: queryKeys.products.list(filters),
    queryFn: ({ signal }) => repositories.products.list(filters, { signal }),
  });
}

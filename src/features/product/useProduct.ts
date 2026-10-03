import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/RepositoryProvider';
import { queryKeys } from '@/constants/queryKeys';

export function useProduct(id: string) {
  const { products } = useRepositories();
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: ({ signal }) => products.getById(id, { signal }),
    enabled: !!id,
  });
}
export function useProductRecommendations(id: string, storeId?: string) {
  const { products } = useRepositories();
  return useQuery({
    queryKey: ['products', 'recommendations', id, storeId],
    queryFn: ({ signal }) => products.recommendations(id, storeId, { signal }),
  });
}

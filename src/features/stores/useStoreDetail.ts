import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/RepositoryProvider';
import { useProducts } from '@/features/catalog/useProducts';
export function useStoreDetail(id: string) {
  const repositories = useRepositories();
  const store = useQuery({
    queryKey: ['stores', 'detail', id],
    queryFn: ({ signal }) => repositories.stores.getById(id, { signal }),
  });
  const products = useProducts(
    { storeId: id, availability: 'available' },
    { enabled: !!store.data },
  );
  const onTap = useProducts(
    { storeId: id, availability: 'available', servingType: 'draft' },
    { enabled: !!store.data },
  );
  return {
    store,
    products,
    onTap,
    popular: (products.data ?? []).filter((p) => p.isPopular).slice(0, 4),
  };
}

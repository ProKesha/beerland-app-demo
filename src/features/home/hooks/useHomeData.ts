import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/RepositoryProvider';
import { queryKeys } from '@/constants/queryKeys';
import { useProducts } from '@/features/catalog/useProducts';
import { useStores } from '@/features/stores/useStores';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useSessionStore } from '@/stores/session';
import { useOrders } from '@/features/profile/queries';
import {
  deriveHomeProducts,
  findReorder,
  resolveFulfillment,
} from '../utils/homeData';

export function useHomeData() {
  const repositories = useRepositories();
  const hydrated = useSessionStore((state) => state.hydrated);
  const storeId = useSelectedStore((state) => state.storeId);
  const method = useFulfillmentStore((state) => state.method);
  const selectMethod = useFulfillmentStore((state) => state.select);
  const stores = useStores();
  const selectedStore = stores.data?.find((store) => store.id === storeId);
  const ready = hydrated && stores.isSuccess;
  const effectiveMethod = resolveFulfillment(method, selectedStore);
  useEffect(() => {
    if (ready && effectiveMethod && effectiveMethod !== method)
      selectMethod(effectiveMethod);
  }, [ready, effectiveMethod, method, selectMethod]);

  const products = useProducts(
    {
      ...(selectedStore ? { storeId: selectedStore.id } : {}),
      availability: 'available',
    },
    { enabled: ready },
  );
  const onTap = useProducts(
    {
      storeId: selectedStore?.id,
      servingType: 'draft',
      availability: 'available',
    },
    { enabled: ready && !!selectedStore },
  );
  // Refresh active promotions while Home remains mounted, including expiry boundaries.
  const promotions = useQuery({
    queryKey: queryKeys.promotions.active(selectedStore?.id),
    enabled: ready,
    refetchInterval: 60_000,
    queryFn: ({ signal }) =>
      repositories.promotions.list(
        { storeId: selectedStore?.id, activeAt: new Date().toISOString() },
        { signal },
      ),
  });
  const orders = useOrders({ enabled: ready });
  const assortment = products.data ?? [];
  return {
    hydrated,
    stores,
    selectedStore,
    effectiveMethod,
    products,
    onTap,
    promotions,
    ...deriveHomeProducts(assortment),
    reorder: findReorder(orders.data ?? [], assortment, selectedStore?.id),
    loading:
      !hydrated || stores.isPending || (stores.isSuccess && products.isPending),
    error: stores.isError || products.isError,
    retry: () => {
      void stores.refetch();
      if (ready) void products.refetch();
    },
  };
}

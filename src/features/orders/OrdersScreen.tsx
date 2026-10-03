import { router } from 'expo-router';
import { ErrorState } from '@/components/ui';
import { EmptyState } from '@/components/common/EmptyState';
import { AccountList } from '@/features/profile/AccountList';
import { useOrders } from '@/features/profile/queries';
import { useStores } from '@/features/stores/useStores';
import { OrderCard, OrderCardSkeleton } from './OrderCard';
export function OrdersScreen() {
  const query = useOrders();
  const stores = useStores();
  return (
    <AccountList
      title="Замовлення"
      items={query.isError ? [] : (query.data ?? [])}
      keyExtractor={(order) => order.id}
      renderItem={({ item: order }) => (
        <OrderCard
          order={order}
          storeName={stores.data?.find((s) => s.id === order.storeId)?.name}
        />
      )}
      empty={
        query.isPending ? (
          <>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </>
        ) : query.isError ? (
          <ErrorState
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <EmptyState
            variant="orders"
            action={{ onPress: () => router.push('/catalog') }}
          />
        )
      }
    />
  );
}

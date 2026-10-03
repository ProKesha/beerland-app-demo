import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  ErrorState,
  ProductCardSkeleton,
} from '@/components/ui';
import { EmptyState } from '@/components/common/EmptyState';
import { AccountList } from '@/features/profile/AccountList';
import { useFavoritesStore } from '@/stores/favorites';
import { useSelectedStore } from '@/stores/selectedStore';
import { useRepositories } from '@/repositories/RepositoryProvider';
import { useStores } from '@/features/stores/useStores';
import { ProductCard } from '@/features/product/components/ProductCard';
import { useHomeActions } from '@/features/home/hooks/useHomeActions';
import { productVariants, variantOffer } from '@/features/product/variants';
import type { Product } from '@/types/domain';
import { useSessionStore } from '@/stores/session';
function favoriteOffer(product: Product, storeId?: string) {
  const variant = productVariants(product)[0];
  const offer = variantOffer(product, variant, storeId);
  return {
    ...product,
    price: offer.price,
    availability: offer.availability,
    volume: variant.volume,
  };
}
export function FavoritesScreen() {
  const ids = useFavoritesStore((s) => s.productIds);
  const storeId = useSelectedStore((s) => s.storeId);
  const r = useRepositories();
  const hydrated = useSessionStore((state) => state.hydrated);
  const stores = useStores();
  const store = stores.data?.find((s) => s.id === storeId);
  const actions = useHomeActions(
    storeId ?? undefined,
    !!store &&
      !store.temporarilyClosed &&
      (store.pickupAvailable || store.deliveryAvailable),
    () => router.push('/stores'),
  );
  const query = useQuery({
    queryKey: ['favorites', 'products', ids],
    enabled: hydrated && ids.length > 0,
    queryFn: ({ signal }) =>
      Promise.all(
        ids.map(async (id) => ({
          id,
          product: await r.products.getById(id, { signal }),
        })),
      ),
  });
  return (
    <AccountList
      title="Обране"
      items={query.isError ? [] : (query.data ?? [])}
      keyExtractor={(entry) => entry.id}
      header={
        !storeId && (
          <Button
            label="Обрати магазин"
            variant="outline"
            onPress={() => router.push('/stores')}
          />
        )
      }
      empty={
        !ids.length ? (
          <EmptyState
            variant="favorites"
            title="Тут ще немає улюблених"
            description="Зберігайте напої, до яких хочеться повернутися."
            action={{
              label: 'Перейти до каталогу',
              onPress: () => router.push('/catalog'),
            }}
          />
        ) : query.isPending ? (
          <ProductCardSkeleton />
        ) : query.isError ? (
          <ErrorState
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : null
      }
      renderItem={({ item: { id, product } }) =>
        product ? (
          <ProductCard
            key={product.id}
            product={favoriteOffer(product, storeId ?? undefined)}
            shop
            isFavorited
            onFavorite={actions.favorite}
            onOpen={actions.openProduct}
            onAddToCart={actions.add}
            disabled={
              !!storeId &&
              (!store ||
                store.temporarilyClosed ||
                (!store.pickupAvailable && !store.deliveryAvailable))
            }
          />
        ) : (
          <Card key={id}>
            <AppText>Товар більше недоступний</AppText>
            <Button
              label="Видалити з обраного"
              onPress={() => useFavoritesStore.getState().toggle(id)}
            />
          </Card>
        )
      }
    />
  );
}

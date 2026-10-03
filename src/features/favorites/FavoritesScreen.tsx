import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  Button,
  Card,
  Container,
  ErrorState,
  Icon,
  ProductCardSkeleton,
  Screen,
} from '@/components/ui';
import { EmptyState } from '@/components/common/EmptyState';
import { ShopPageBanner } from '@/components/common/ShopPageBanner';
import { HomeHeader } from '@/features/home/components/HomeHeader';
import { ProductCard } from '@/features/product/components/ProductCard';
import { useStores } from '@/features/stores/useStores';
import { useFavoritesStore } from '@/stores/favorites';
import { useSelectedStore } from '@/stores/selectedStore';
import { sessionOwner, useSessionStore } from '@/stores/session';
import { layout, shopPalette, spacing } from '@/theme/tokens';
import { useFavoriteProducts } from './useFavoriteProducts';
import { useFavoriteActions } from './useFavoriteActions';

export function FavoritesScreen() {
  const ids = useFavoritesStore((state) => state.productIds);
  const storeId = useSelectedStore((state) => state.storeId) ?? undefined;
  const hydrated = useSessionStore((state) => state.hydrated);
  const owner = useSessionStore(sessionOwner);
  const stores = useStores({ enabled: hydrated });
  const store = stores.data?.find((entry) => entry.id === storeId);
  const canOrder =
    !!store &&
    !store.temporarilyClosed &&
    (store.pickupAvailable || store.deliveryAvailable);
  const actions = useFavoriteActions(storeId, canOrder);
  const products = useFavoriteProducts(ids, { enabled: hydrated });
  const pending = !hydrated || products.isPending;
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableWidth = Math.min(
    width - insets.left - insets.right,
    layout.maxShopWidth,
  );
  const columns =
    fontScale < 1.3
      ? availableWidth >= 1040
        ? 4
        : availableWidth >= 740
          ? 3
          : availableWidth >= 380
            ? 2
            : 1
      : 1;
  const cardWidth =
    (availableWidth - spacing.lg * 2 - spacing.md * (columns - 1)) / columns;

  return (
    <Screen scroll={false} chrome="none" includeBottomInset>
      <HomeHeader home={false} />
      <FlatList
        key={`${owner}-${columns}`}
        testID="favorites-results"
        data={pending || products.isError ? [] : products.data}
        numColumns={columns}
        keyExtractor={(entry) => entry.id}
        style={styles.list}
        contentContainerStyle={styles.page}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        contentInsetAdjustmentBehavior="never"
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        ListHeaderComponent={
          <Container style={styles.header}>
            <Button
              label="Назад"
              testID="favorites-back"
              variant="ghost"
              size="compact"
              leftIcon={<Icon name="arrow-left" size="sm" />}
              style={styles.back}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/catalog')
              }
            />
            <ShopPageBanner
              title="Обране"
              label="BEERLAND / ВАШІ ВПОДОБАННЯ"
              subtitle="Зберігайте улюблені смаки та додавайте їх у кошик."
            />
            {hydrated && ids.length > 0 && (
              <View style={styles.store}>
                <Button
                  label={store?.name ?? 'Обрати магазин'}
                  accessibilityLabel={
                    store ? 'Змінити магазин' : 'Обрати магазин'
                  }
                  testID="favorites-store"
                  variant="outline"
                  leftIcon={<Icon name="map-pin" size="sm" />}
                  onPress={() => router.push('/stores')}
                />
                <AppText variant="caption" color="textSubtle">
                  {!storeId
                    ? 'Оберіть магазин, щоб додати товари в кошик.'
                    : store && !canOrder
                      ? 'Цей магазин зараз не приймає замовлення.'
                      : 'Ціни та наявність залежать від обраного магазину.'}
                </AppText>
                {stores.isError && (
                  <Button
                    label="Оновити магазини"
                    variant="ghost"
                    onPress={() => {
                      void stores.refetch();
                    }}
                  />
                )}
                <AppText variant="label" accessibilityLiveRegion="polite">
                  Збережено товарів: {ids.length}
                </AppText>
              </View>
            )}
          </Container>
        }
        ListEmptyComponent={
          products.isError && hydrated ? (
            <ErrorState
              title="Не вдалося завантажити обране"
              onRetry={() => {
                void products.refetch();
              }}
            />
          ) : pending ? (
            <View testID="favorites-loading" style={styles.skeletons}>
              {Array.from({ length: columns * 2 }, (_, index) => (
                <View key={index} style={{ width: cardWidth }}>
                  <ProductCardSkeleton />
                </View>
              ))}
            </View>
          ) : !ids.length ? (
            <EmptyState
              variant="favorites"
              title="Тут ще немає улюблених"
              description="Зберігайте напої, до яких хочеться повернутися."
              action={{
                label: 'Перейти до каталогу',
                onPress: () => router.push('/catalog'),
              }}
            />
          ) : null
        }
        renderItem={({ item: { id, product } }) => (
          <View
            testID={`favorite-${id}`}
            style={[styles.cell, { width: cardWidth }]}
          >
            {product ? (
              <ProductCard
                product={product}
                shop
                isFavorited
                onFavorite={actions.favorite}
                onOpen={actions.openProduct}
                onAddToCart={actions.add}
                disabled={!!storeId && !canOrder}
                unavailableLabel={
                  storeId ? 'Немає в цьому магазині' : undefined
                }
              />
            ) : (
              <Card style={styles.unavailable}>
                <Icon name="package" />
                <AppText variant="title">Товар більше недоступний</AppText>
                <Button
                  label="Видалити з обраного"
                  testID={`remove-unavailable-favorite-${id}`}
                  variant="outline"
                  onPress={() => actions.remove(id)}
                />
              </Card>
            )}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, minHeight: 0 },
  page: {
    width: '100%',
    maxWidth: layout.maxShopWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.md,
    backgroundColor: shopPalette.white,
  },
  header: { padding: 0, paddingTop: spacing.lg, gap: spacing.md },
  back: { alignSelf: 'flex-start' },
  store: { gap: spacing.sm },
  row: { gap: spacing.md },
  cell: { minWidth: 0 },
  unavailable: { flex: 1, gap: spacing.md },
  skeletons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});

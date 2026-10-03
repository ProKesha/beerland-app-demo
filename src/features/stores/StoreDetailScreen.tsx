import { useSessionStore } from '@/stores/session';
import { useMemo, useState } from 'react';
import { Image, Linking, Platform, View } from 'react-native';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  Container,
  ErrorState,
  Icon,
  IconButton,
  Screen,
  SectionSkeleton,
  useToast,
} from '@/components/ui';
import { radius, spacing } from '@/theme/tokens';
import { useSelectedStore } from '@/stores/selectedStore';
import { Price } from '@/components/ui/Price';
import type { Product } from '@/types/domain';
import { useStoreDetail } from './useStoreDetail';
import { useStores } from './useStores';
import { useStoreSelection } from './useStoreSelection';
import { useStoreClock } from './useStoreClock';
import { getStoreStatus, storeLocalTime, weekDays } from './hours';
import { directionsUrl, phoneUrl } from './location';
import { StoreCapabilities } from './components/StoreCard';
import { SafeStoreMap } from './map/SafeStoreMap';
import { ShopPageBanner } from '@/components/common/ShopPageBanner';
export function StoreDetailScreen({ id }: { id: string }) {
  const data = useStoreDetail(id);
  const stores = useStores();
  const { storeId, select } = useSelectedStore();
  const selection = useStoreSelection(stores.data ?? [], (store) =>
    select(store.id),
  );
  const now = useStoreClock();
  const hydrated = useSessionStore((state) => state.hydrated);
  const toast = useToast();
  const [mapFailed, setMapFailed] = useState(false);
  const store = data.store.data;
  const storeStatus = store ? getStoreStatus(store, now) : null;
  const today = store ? storeLocalTime(store, now).day : null;
  const mapStores = useMemo(() => (store ? [store] : []), [store]);
  const openLink = async (url: string | null) => {
    try {
      if (!url) throw new Error('Invalid link');
      await Linking.openURL(url);
    } catch {
      toast.show('Не вдалося відкрити посилання. Спробуйте ще раз.');
    }
  };
  const catalog = (draft = false) => {
    if (store)
      selection.choose(store, () =>
        router.push({
          pathname: '/catalog',
          params: {
            ...(draft ? { category: 'draft' } : {}),
            availableOnly: 'true',
          },
        }),
      );
  };
  const productRows = (products: Product[]) =>
    products.map((product) => (
      <Card
        key={product.id}
        style={{
          padding: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="title">{product.name}</AppText>
          <Price currentPrice={product.price} volume={product.volume} />
        </View>
        <IconButton
          icon={<Icon name="chevron-right" />}
          accessibilityLabel={`Про товар: ${product.name}`}
          onPress={() =>
            selection.choose(store!, () =>
              router.push({
                pathname: '/product/[id]',
                params: { id: product.id },
              }),
            )
          }
        />
      </Card>
    ));
  return (
    <Screen includeBottomInset>
      <Container style={{ gap: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Button
          label="До магазинів"
          variant="ghost"
          onPress={() => router.replace('/stores')}
        />
        {!hydrated || data.store.isPending ? (
          <SectionSkeleton />
        ) : data.store.isError ? (
          <ErrorState
            onRetry={() => {
              void data.store.refetch();
            }}
          />
        ) : !store ? (
          <>
            <AppText variant="h1" accessibilityRole="header">
              Магазин не знайдено
            </AppText>
            <Button
              label="Переглянути магазини"
              onPress={() => router.replace('/stores')}
            />
          </>
        ) : (
          <>
            {store.image ? (
              <Image
                source={{ uri: store.image }}
                accessibilityLabel={store.name}
                style={{ width: '100%', height: 140, borderRadius: radius.lg }}
              />
            ) : (
              <AppText variant="caption" color="primary">
                BEERLAND · МІСЦЕ ЗУСТРІЧІ СМАКІВ
              </AppText>
            )}
            <ShopPageBanner
              title={store.name}
              subtitle={`${store.city} · ${store.address}`}
              label="BEERLAND / МАГАЗИНИ"
            />
            {store.description && <AppText>{store.description}</AppText>}
            <AppText color={storeStatus?.isOpen ? 'success' : 'textSubtle'}>
              {storeStatus?.label}
            </AppText>
            <Button
              label={storeId === id ? 'Ваш магазин' : 'Обрати цей магазин'}
              variant="accent"
              accessibilityState={{ selected: storeId === id }}
              onPress={() => selection.choose(store)}
            />
            <StoreCapabilities store={store} />
            <Card>
              <AppText variant="title">Години роботи</AppText>
              <AppText variant="caption" color="textSubtle">
                Час магазину · {store.timezone ?? 'Europe/Kyiv'}
              </AppText>
              {weekDays.map((day, i) => (
                <View
                  key={day}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: spacing.sm,
                  }}
                >
                  <AppText color={today === i + 1 ? 'primary' : 'textSubtle'}>
                    {day}
                    {today === i + 1 ? ' · сьогодні' : ''}
                  </AppText>
                  <AppText variant="bodySmall">
                    {store.openingHours
                      .filter((h) => h.day === i + 1)
                      .map((h) => `${h.opens}–${h.closes}`)
                      .join(', ') || 'Зачинено'}
                  </AppText>
                </View>
              ))}
            </Card>
            <AppText variant="h2">Сьогодні на кранах</AppText>
            {data.onTap.isPending ? (
              <SectionSkeleton />
            ) : data.onTap.isError ? (
              <ErrorState
                onRetry={() => {
                  void data.onTap.refetch();
                }}
              />
            ) : data.onTap.data?.length ? (
              productRows(data.onTap.data.slice(0, 4))
            ) : (
              <AppText color="textSubtle">На кранах поки порожньо.</AppText>
            )}
            <Button
              label="Дивитися всі"
              accessibilityLabel="Дивитися всі: Сьогодні на кранах"
              variant="outline"
              onPress={() => catalog(true)}
            />
            <AppText variant="h2">Популярне тут</AppText>
            {data.products.isPending ? (
              <SectionSkeleton />
            ) : data.products.isError ? (
              <ErrorState
                onRetry={() => {
                  void data.products.refetch();
                }}
              />
            ) : data.popular.length ? (
              productRows(data.popular)
            ) : (
              <AppText color="textSubtle">
                Популярні товари скоро з’являться.
              </AppText>
            )}
            <Button label="Переглянути асортимент" onPress={() => catalog()} />
            {store.phone && (
              <Card>
                <AppText>{store.phone}</AppText>
                <Button
                  label="Зателефонувати"
                  onPress={() => {
                    void openLink(phoneUrl(store.phone!));
                  }}
                />
              </Card>
            )}
            <AppText variant="h2">Як нас знайти</AppText>
            {mapFailed ? (
              <>
                <AppText accessibilityRole="alert">
                  Карта недоступна. Скористайтеся адресою або маршрутом.
                </AppText>
                <Button
                  label="Повторити завантаження карти"
                  variant="outline"
                  onPress={() => setMapFailed(false)}
                />
              </>
            ) : (
              <SafeStoreMap
                stores={mapStores}
                selectedStoreId={storeId}
                highlightedStoreId={id}
                onSelectStore={() => undefined}
                onError={() => setMapFailed(true)}
              />
            )}
            <Button
              label="Прокласти маршрут"
              variant="outline"
              onPress={() => {
                void openLink(directionsUrl(store, Platform.OS));
              }}
            />
          </>
        )}
      </Container>
      {selection.confirmation}
    </Screen>
  );
}

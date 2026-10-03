import { useSessionStore } from '@/stores/session';
import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  Container,
  ErrorState,
  ListSkeleton,
  Screen,
} from '@/components/ui';
import { spacing } from '@/theme/tokens';
import { useSelectedStore } from '@/stores/selectedStore';
import { useStoreDiscovery } from '@/stores/storeDiscovery';
import { StoreCard } from './components/StoreCard';
import { SafeStoreMap } from './map/SafeStoreMap';
import { useStores } from './useStores';
import { useStoreSelection } from './useStoreSelection';
import { useStoreClock } from './useStoreClock';
import { sortStores, type Coordinates } from './location';
import { ShopPageBanner } from '@/components/common/ShopPageBanner';
export function StoresScreen({ location }: { location?: Coordinates }) {
  const query = useStores();
  const now = useStoreClock();
  const hydrated = useSessionStore((state) => state.hydrated);
  const { storeId, select } = useSelectedStore();
  const { view, setView } = useStoreDiscovery();
  const [highlight, setHighlight] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const stores = query.data ?? [];
  const selection = useStoreSelection(stores, (store) => select(store.id));
  const preview =
    stores.find((s) => s.id === (highlight ?? storeId)) ?? stores[0];
  const card = (store: (typeof stores)[number]) => (
    <StoreCard
      key={store.id}
      store={store}
      now={now}
      selected={storeId === store.id}
      location={location}
      onSelect={() => selection.choose(store)}
      onOpen={() =>
        router.push({ pathname: '/store/[id]', params: { id: store.id } })
      }
    />
  );
  return (
    <Screen>
      <Container style={{ gap: spacing.lg, paddingBottom: spacing.xxxl }}>
        <ShopPageBanner
          title="Магазини Beerland"
          subtitle="Оберіть зручну точку поруч"
          label="BEERLAND / МАГАЗИНИ"
        />
        <AppText variant="caption" color="textSubtle">
          Демонстраційні локації · не реальні магазини
        </AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['map', 'list'] as const).map((mode) => (
            <Button
              key={mode}
              label={mode === 'map' ? 'Карта' : 'Список'}
              accessibilityLabel={
                mode === 'map' ? 'Показати карту' : 'Показати список'
              }
              accessibilityState={{ selected: view === mode }}
              variant={view === mode ? 'primary' : 'outline'}
              onPress={() => setView(mode)}
            />
          ))}
        </View>
        {query.isSuccess && (
          <AppText variant="caption" color="textSubtle">
            Демонстраційних магазинів: {stores.length}
          </AppText>
        )}
        {!hydrated || query.isPending ? (
          <ListSkeleton />
        ) : query.isError ? (
          <ErrorState
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : !stores.length ? (
          <>
            <AppText>Магазинів поки немає</AppText>
            <Button
              label="Оновити магазини"
              variant="outline"
              onPress={() => {
                void query.refetch();
              }}
            />
          </>
        ) : (
          <>
            {storeId && stores.some((s) => s.id === storeId) && (
              <AppText variant="bodySmall">
                Ваш магазин: {stores.find((s) => s.id === storeId)!.name}
              </AppText>
            )}
            {view === 'map' && !mapFailed ? (
              <>
                <SafeStoreMap
                  stores={stores}
                  selectedStoreId={storeId}
                  highlightedStoreId={preview?.id}
                  onSelectStore={setHighlight}
                  onError={() => setMapFailed(true)}
                />
                <AppText variant="caption">
                  ✓ Ваш магазин · × Зачинено · торкніться позначки
                </AppText>
                {preview && card(preview)}
              </>
            ) : (
              <>
                {view === 'map' && mapFailed && (
                  <>
                    <AppText accessibilityRole="alert">
                      Карта недоступна. Оберіть магазин у списку.
                    </AppText>
                    <Button
                      label="Повторити завантаження карти"
                      variant="outline"
                      onPress={() => setMapFailed(false)}
                    />
                  </>
                )}
                {sortStores(stores, storeId, location).map(card)}
              </>
            )}
          </>
        )}
      </Container>
      {selection.confirmation}
    </Screen>
  );
}

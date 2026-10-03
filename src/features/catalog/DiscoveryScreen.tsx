import { useRef, useState } from 'react';
import {
  FlatList,
  ScrollView,
  View,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  Button,
  FilterChip,
  Icon,
  IconButton,
  Modal,
  Screen,
  SearchInput,
  ErrorState,
  ProductCardSkeleton,
} from '@/components/ui';
import { EmptyState } from '@/components/common/EmptyState';
import { ProductCard } from '@/features/product/components/ProductCard';
import { StorePicker } from '@/features/home/components/StoreSelectorCard';
import { HomeHeader } from '@/features/home/components/HomeHeader';
import { useHomeActions } from '@/features/home/hooks/useHomeActions';
import { useStores } from '@/features/stores/useStores';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import { useDiscoveryPreferences } from '@/stores/discoveryPreferences';
import { componentHeights, layout, shopPalette, spacing } from '@/theme/tokens';
import type { Product } from '@/types/domain';
import {
  catalogCategories,
  activeFilters,
  removeFilter,
  sortOptions,
  productCount,
  type CatalogRequest,
} from './model';
import { useCatalog } from './useCatalog';
import { useDiscoveryState } from './useDiscoveryState';
import { CatalogFilters } from './components/CatalogFilters';
import { CatalogMasthead } from './components/CatalogMasthead';
import { CommerceGroupFilters } from './components/CommerceGroupFilters';
import { ShopPageBanner } from '@/components/common/ShopPageBanner';

export function DiscoveryScreen({
  initial,
  searchMode = false,
}: {
  initial: CatalogRequest;
  searchMode?: boolean;
}) {
  const discovery = useDiscoveryState(initial);
  const { state, query, setQuery } = discovery;
  const hydrated = useSessionStore((s) => s.hydrated);
  const storeId = useSelectedStore((s) => s.storeId) ?? undefined;
  const stores = useStores({ enabled: hydrated });
  const store = stores.data?.find((s) => s.id === storeId);
  const canOrder =
    !!store &&
    !store.temporarilyClosed &&
    (store.pickupAvailable || store.deliveryAvailable);
  const [picker, setPicker] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const preferences = useDiscoveryPreferences();
  const list = useRef<FlatList<Product>>(null);
  const request = { ...state, storeId };
  const chips = activeFilters(state.filters ?? {});
  const suggested =
    searchMode &&
    !query.trim() &&
    state.category === 'all' &&
    !chips.length &&
    !state.promotionId &&
    !state.group;
  const result = useCatalog(request, hydrated && !suggested);
  const actions = useHomeActions(storeId, canOrder, () => setPicker(true));
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableWidth = Math.min(width, layout.maxShopWidth);
  const columns =
    preferences.viewMode === 'grid' && fontScale < 1.3
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
  const compact = preferences.viewMode === 'list';
  const pending =
    !hydrated ||
    (!suggested && (result.isPending || query.trim() !== state.query));
  const items =
    pending || suggested
      ? []
      : (result.data?.pages.flatMap((page) => page.items) ?? []);
  const bottomContentInset = searchMode
    ? spacing.xxl + insets.bottom
    : componentHeights.tabBar + insets.bottom + spacing.md;
  const resetScroll = () =>
    list.current?.scrollToOffset({ offset: 0, animated: false });
  const repeat = (value: string) => {
    setQuery(value);
    preferences.remember(value);
    resetScroll();
  };
  const header = (
    <View style={styles.header}>
      {!searchMode && <CatalogMasthead />}
      {searchMode && (
        <>
          <IconButton
            accessibilityLabel="Назад"
            icon={<Icon name="arrow-left" />}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/catalog')
            }
          />
          <ShopPageBanner title="Пошук" label="BEERLAND / КАТАЛОГ" />
        </>
      )}
      <View>
        <Button
          variant="ghost"
          size="compact"
          label={store?.name ?? 'Оберіть магазин'}
          accessibilityLabel={store ? 'Змінити магазин' : 'Оберіть магазин'}
          leftIcon={<Icon name="map-pin" size="sm" />}
          onPress={() => setPicker(true)}
          style={styles.store}
        />
        {!store && (
          <AppText variant="caption" color="textSubtle">
            Оберіть магазин, щоб побачити актуальний асортимент
          </AppText>
        )}
        {stores.isError && (
          <Button
            variant="ghost"
            label="Оновити магазини"
            onPress={() => {
              void stores.refetch();
            }}
          />
        )}
      </View>
      <SearchInput
        value={query}
        onChangeText={setQuery}
        maxLength={100}
        placeholder="Пиво, стиль або броварня"
        onSearch={repeat}
        autoFocus={searchMode}
        onBlur={() => {
          if (query.trim()) preferences.remember(query);
        }}
      />
      <CommerceGroupFilters
        request={state}
        storeName={store?.name}
        enabled={hydrated}
        onGroup={(group) => {
          discovery.setGroup(group);
          resetScroll();
        }}
        onSubcategory={(subcategory) => {
          discovery.setSubcategory(subcategory);
          resetScroll();
        }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {catalogCategories.map((c) => (
          <FilterChip
            key={c.id}
            label={c.label}
            accessibilityLabel={`Категорія: ${c.label}`}
            selected={state.category === c.id}
            onPress={() => {
              discovery.setCategory(c.id);
              resetScroll();
            }}
          />
        ))}
      </ScrollView>
      <View style={styles.toolbar}>
        <Button
          label={`Фільтри${chips.length ? ` · ${chips.length}` : ''}`}
          accessibilityLabel={`Фільтри${chips.length ? ` · ${chips.length}` : ''}`}
          variant="outline"
          size="compact"
          leftIcon={<Icon name="sliders" size="sm" />}
          onPress={() => setFiltersOpen(true)}
        />
        <IconButton
          accessibilityLabel={`Сортування: ${sortOptions.find((s) => s.id === state.sort)?.label}`}
          icon={<Icon name="arrow-down" />}
          onPress={() => setSortOpen(true)}
        />
        <View style={styles.spacer} />
        {(width >= 380 || preferences.viewMode !== 'grid') && (
          <IconButton
            accessibilityLabel="Сітка"
            accessibilityState={{ selected: preferences.viewMode === 'grid' }}
            icon={<Icon name="grid" />}
            onPress={() => preferences.setViewMode('grid')}
          />
        )}
        {(width >= 380 || preferences.viewMode !== 'list') && (
          <IconButton
            accessibilityLabel="Список"
            accessibilityState={{ selected: preferences.viewMode === 'list' }}
            icon={<Icon name="list" />}
            onPress={() => preferences.setViewMode('list')}
          />
        )}
      </View>
      {!!chips.length || state.promotionId ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {chips.map((chip) => (
            <FilterChip
              key={`${chip.key}-${chip.value ?? ''}`}
              label={`${chip.label} ×`}
              accessibilityLabel={`Прибрати фільтр: ${chip.label}`}
              onPress={() =>
                discovery.setFilters(
                  removeFilter(state.filters ?? {}, chip.key, chip.value),
                )
              }
            />
          ))}
          {state.promotionId && (
            <FilterChip
              label="Обрана добірка ×"
              onPress={discovery.clearPromotion}
            />
          )}
          <Button
            label="Скинути все"
            variant="ghost"
            size="compact"
            onPress={discovery.clearFilters}
          />
        </ScrollView>
      ) : null}
      {!suggested && !pending && result.data && (
        <View style={styles.count}>
          <AppText variant="label" accessibilityLiveRegion="polite">
            {productCount(result.data.pages[0].total)}
          </AppText>
          <AppText variant="caption" color="textSubtle">
            {sortOptions.find((s) => s.id === state.sort)?.label}
          </AppText>
        </View>
      )}
      {suggested && (
        <View style={styles.suggestions}>
          {!!preferences.recent.length && (
            <>
              <AppText variant="title">Нещодавні пошуки</AppText>
              {preferences.recent.map((q) => (
                <View key={q} style={styles.titleRow}>
                  <Button
                    label={q}
                    variant="ghost"
                    onPress={() => repeat(q)}
                    style={styles.spacer}
                  />
                  <IconButton
                    accessibilityLabel={`Видалити пошук: ${q}`}
                    icon={<Icon name="x" />}
                    onPress={() => preferences.remove(q)}
                  />
                </View>
              ))}
              <Button
                label="Очистити історію"
                variant="ghost"
                onPress={preferences.clear}
              />
            </>
          )}
          <AppText variant="title">Знайдіть свій смак</AppText>
          <AppText variant="bodySmall" color="textSubtle">
            Оберіть категорію вище або почніть із цих смаків.
          </AppText>
          <View style={styles.toolbar}>
            {['IPA', 'Лагер', 'Beerland'].map((q) => (
              <FilterChip key={q} label={q} onPress={() => repeat(q)} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
  return (
    <Screen scroll={false} keyboardAware chrome={searchMode ? 'full' : 'none'}>
      {!searchMode && <HomeHeader home={false} />}
      <FlatList
        ref={list}
        key={`${columns}-${compact}`}
        testID="discovery-results"
        data={items}
        numColumns={columns}
        keyExtractor={(p) => p.id}
        extraData={actions.favorites}
        keyboardShouldPersistTaps="handled"
        // Screen's KeyboardAvoidingView already reserves keyboard space.
        automaticallyAdjustKeyboardInsets={false}
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="never"
        style={styles.results}
        contentContainerStyle={[
          styles.page,
          { paddingBottom: bottomContentInset },
        ]}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        ListHeaderComponent={header}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        renderItem={({ item }) => (
          <View
            style={[styles.cell, columns > 1 && { width: cardWidth }]}
            testID={`catalog-${item.id}`}
          >
            <ProductCard
              product={item}
              variant={compact ? 'compact' : 'standard'}
              disabled={!!storeId && !canOrder}
              unavailableLabel={storeId ? 'Немає в цьому магазині' : undefined}
              isFavorited={actions.favorites.includes(item.id)}
              onFavorite={actions.favorite}
              onAddToCart={actions.add}
              onOpen={(product) => {
                if (query.trim()) preferences.remember(query);
                actions.openProduct(product);
              }}
              shop={!compact}
            />
          </View>
        )}
        ListEmptyComponent={
          suggested ? null : pending ? (
            <View testID="catalog-loading" style={styles.skeletons}>
              {[0, 1, 2, 3].map((id) => (
                <View
                  key={id}
                  style={columns > 1 ? { width: cardWidth } : styles.full}
                >
                  <ProductCardSkeleton
                    variant={compact ? 'compact' : 'standard'}
                  />
                </View>
              ))}
            </View>
          ) : result.isError ? (
            <ErrorState
              onRetry={() => {
                void result.refetch();
              }}
            />
          ) : (
            <EmptyState
              variant="search"
              title={
                state.group === 'onTap' && !storeId
                  ? 'Оберіть магазин для асортименту на кранах'
                  : query.trim()
                    ? 'Не знайшли такого смаку'
                    : chips.length || state.promotionId
                      ? 'За цими фільтрами нічого не знайшлося'
                      : 'У цій категорії поки порожньо'
              }
              action={{
                label:
                  query.trim() && !(state.group === 'onTap' && !storeId)
                    ? 'Очистити пошук'
                    : state.group === 'onTap' && !storeId
                      ? 'Обрати магазин'
                      : chips.length
                        ? 'Скинути фільтри'
                        : 'Усі товари',
                onPress: () => {
                  if (state.group === 'onTap' && !storeId) setPicker(true);
                  else if (query.trim()) setQuery('');
                  else if (chips.length || state.subcategory)
                    discovery.clearFilters();
                  else {
                    discovery.clearFilters();
                    discovery.setGroup();
                  }
                },
              }}
            />
          )
        }
        ListFooterComponent={
          result.hasNextPage ? (
            <Button
              label={
                result.isFetchingNextPage
                  ? 'Завантажуємо…'
                  : result.isFetchNextPageError
                    ? 'Повторити завантаження'
                    : 'Показати ще'
              }
              variant="outline"
              disabled={result.isFetchingNextPage}
              onPress={() => {
                void result.fetchNextPage();
              }}
            />
          ) : null
        }
      />
      {filtersOpen && (
        <CatalogFilters
          request={request}
          onClose={() => setFiltersOpen(false)}
          onApply={(filters) => {
            discovery.setFilters(filters);
            setFiltersOpen(false);
            resetScroll();
          }}
        />
      )}
      <Modal
        visible={sortOpen}
        title="Сортування"
        onClose={() => setSortOpen(false)}
      >
        {sortOptions.map((option) => (
          <FilterChip
            key={option.id}
            label={option.label}
            selected={state.sort === option.id}
            onPress={() => {
              discovery.setSort(option.id);
              setSortOpen(false);
              resetScroll();
            }}
          />
        ))}
      </Modal>
      <StorePicker
        visible={picker}
        stores={stores.data ?? []}
        selectedId={storeId}
        onClose={() => setPicker(false)}
        onSelect={(selected) => {
          useSelectedStore.getState().select(selected.id);
          setPicker(false);
          resetScroll();
        }}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  results: { flex: 1, minHeight: 0 },
  page: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    backgroundColor: shopPalette.white,
  },
  header: {
    gap: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xs,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  store: { alignSelf: 'flex-start', maxWidth: '100%' },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 0,
  },
  spacer: { flex: 1 },
  count: { gap: spacing.xs },
  suggestions: { gap: spacing.sm, paddingVertical: spacing.lg },
  row: { gap: spacing.md },
  cell: { width: '100%', minWidth: 0 },
  skeletons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  full: { width: '100%' },
});

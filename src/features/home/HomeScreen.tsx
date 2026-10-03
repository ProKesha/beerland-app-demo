import { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  Container,
  ErrorState,
  Screen,
  SearchInput,
  SectionHeader,
  ProductCardSkeleton,
} from '@/components/ui';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { colors, spacing } from '@/theme/tokens';
import { HomeHeader } from './components/HomeHeader';
import { StorePicker, StoreSelectorCard } from './components/StoreSelectorCard';
import { FulfillmentSelector } from './components/FulfillmentSelector';
import { PromoHero } from './components/PromoHero';
import { CategoryRow } from './components/CategoryRow';
import { ProductSection } from './components/ProductSection';
import { BreweryFeature } from './components/BreweryFeature';
import { PromotionCard } from './components/PromotionCard';
import { HomeSkeleton } from './components/HomeSkeleton';
import { useHomeData } from './hooks/useHomeData';
import { useHomeActions } from './hooks/useHomeActions';
export function HomeScreen() {
  const { width } = useWindowDimensions();
  const home = useHomeData();
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState('');
  const selectStore = useSelectedStore((state) => state.select);
  const selectMethod = useFulfillmentStore((state) => state.select);
  const actions = useHomeActions(
    home.selectedStore?.id,
    !!home.effectiveMethod,
    () => setPicker(true),
  );
  const catalog = (params: Record<string, string> = {}) =>
    router.push({ pathname: '/catalog', params });
  const productActions = {
    favorites: actions.favorites,
    onFavorite: actions.favorite,
    onAdd: actions.add,
    onOpen: actions.openProduct,
    disabled: !!home.selectedStore && !home.effectiveMethod,
  };
  const promotions = home.promotions.data ?? [];
  const hero = promotions[0];
  return (
    <Screen scroll={false} chrome="none">
      <HomeHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="never"
      >
        <Container style={styles.page}>
          {home.error ? (
            <ErrorState onRetry={home.retry} />
          ) : home.loading ? (
            <HomeSkeleton />
          ) : (
            <>
              <PromoHero
                promotion={hero}
                onPress={() => catalog(hero ? { promotionId: hero.id } : {})}
              />
              <View style={[styles.intro, width >= 740 && styles.introWide]}>
                <View style={styles.introCell}>
                  <StoreSelectorCard
                    store={home.selectedStore}
                    onChoose={() => setPicker(true)}
                  />
                </View>
                <View style={styles.introCell}>
                  <FulfillmentSelector
                    store={home.selectedStore}
                    method={home.effectiveMethod}
                    onChange={selectMethod}
                  />
                  <SearchInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Пиво, стиль або броварня"
                    onFocus={() => router.push('/search')}
                    onSearch={(q) => catalog({ q: q.trim() })}
                  />
                </View>
              </View>
              <CategoryRow onSelect={(category) => catalog({ category })} />
              {home.selectedStore && (
                <View testID="home-on-tap-state" style={styles.onTap}>
                  {home.onTap.isPending ? (
                    <View style={styles.section}>
                      <SectionHeader
                        title="Сьогодні на кранах"
                        subtitle={home.selectedStore.name}
                      />
                      <ProductCardSkeleton />
                    </View>
                  ) : home.onTap.isError ? (
                    <Card>
                      <AppText variant="title">Сьогодні на кранах</AppText>
                      <AppText variant="bodySmall">
                        Не вдалося оновити асортимент на кранах.
                      </AppText>
                      <Button
                        label="Оновити крани"
                        variant="outline"
                        onPress={() => {
                          void home.onTap.refetch();
                        }}
                      />
                    </Card>
                  ) : home.onTap.data?.length ? (
                    <ProductSection
                      id="on-tap"
                      title="Сьогодні на кранах"
                      subtitle={home.selectedStore.name}
                      products={home.onTap.data.slice(0, 5)}
                      {...productActions}
                      onViewAll={() => catalog({ category: 'draft' })}
                    />
                  ) : (
                    <View style={styles.section}>
                      <SectionHeader
                        title="Сьогодні на кранах"
                        subtitle={home.selectedStore.name}
                      />
                      <AppText variant="bodySmall" color="textSubtle">
                        На кранах поки порожньо. Перегляньте інші смаки в
                        каталозі.
                      </AppText>
                    </View>
                  )}
                </View>
              )}
              <ProductSection
                id="popular"
                title="Популярне зараз"
                products={home.popularProducts}
                {...productActions}
                onViewAll={() => catalog({ collection: 'popular' })}
              />
              <BreweryFeature
                id="brewery"
                title="Від нашої броварні"
                products={home.ownBreweryProducts}
                {...productActions}
                onViewAll={() => catalog({ collection: 'brewery' })}
              />
              {promotions.length > 1 && (
                <View style={styles.section} testID="home-promotions">
                  <SectionHeader title="Для вас сьогодні" />
                  {promotions.slice(1, 3).map((promotion) => (
                    <PromotionCard
                      key={promotion.id}
                      promotion={promotion}
                      onPress={() => catalog({ promotionId: promotion.id })}
                    />
                  ))}
                </View>
              )}
              <ProductSection
                id="snacks"
                title="До пива"
                products={home.snackProducts}
                compact
                {...productActions}
                onViewAll={() => catalog({ category: 'snacks' })}
              />
              {home.reorder && (
                <Card testID="home-reorder">
                  <AppText variant="title">Повторити замовлення</AppText>
                  <AppText variant="bodySmall" color="textSubtle">
                    Знайомі смаки знову доступні у вашому магазині. Ціни —
                    актуальні.
                  </AppText>
                  <Button
                    label="Додати товари знову"
                    disabled={!home.effectiveMethod || actions.reordering}
                    onPress={() => actions.reorder(home.reorder!)}
                  />
                </Card>
              )}
              <Button
                label="Переглянути весь каталог"
                variant="outline"
                onPress={() => catalog()}
              />
            </>
          )}
        </Container>
      </ScrollView>
      {actions.reorderFeedback}
      <StorePicker
        visible={picker}
        stores={home.stores.data ?? []}
        selectedId={home.selectedStore?.id}
        onClose={() => setPicker(false)}
        onSelect={(store) => {
          selectStore(store.id);
          setPicker(false);
        }}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  page: {
    gap: spacing.xxxl,
    paddingBottom: spacing.xxxl,
    width: '100%',
    alignSelf: 'center',
  },
  intro: { gap: spacing.lg },
  introWide: { flexDirection: 'row', alignItems: 'stretch' },
  introCell: { flex: 1, gap: spacing.md, minWidth: 0 },
  section: { gap: spacing.md },
  onTap: {
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
    paddingLeft: spacing.sm,
  },
});

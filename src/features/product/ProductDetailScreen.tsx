import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  Badge,
  Button,
  ErrorState,
  FilterChip,
  Icon,
  IconButton,
  Price,
  QuantityControl,
  Screen,
} from '@/components/ui';
import { useFavoritesStore } from '@/stores/favorites';
import { useSelectedStore } from '@/stores/selectedStore';
import { StorePicker } from '@/features/home/components/StoreSelectorCard';
import { colors, shopPalette, spacing } from '@/theme/tokens';
import { getBeerStyleTheme } from '@/theme/beerStyles';
import { resolveProductImage } from '@/assets/images';
import { formatVolume } from '@/utils/format';
import { getBitternessLevel } from '@/features/catalog/model';
import type { Product } from '@/types/domain';
import { ProductImage } from './components/ProductImage';
import { FlavorProfile } from './components/FlavorProfile';
import { BitternessIndicator } from './components/BitternessIndicator';
import { ProductDetailSkeleton } from './components/ProductDetailSkeleton';
import { ProductRecommendations } from './components/ProductRecommendations';
import { useProduct } from './useProduct';
import { useProductPurchase } from './useProductPurchase';
import { variantLabel, variantOffer } from './variants';

const goBack = () =>
  router.canGoBack() ? router.back() : router.replace('/catalog');
const servingLabels = {
  draft: 'Розливне',
  bottle: 'Пляшка',
  can: 'Банка',
  other: 'Порція',
};

export function ProductDetailScreen({ id }: { id: string }) {
  const query = useProduct(id);
  if (query.data) return <ProductDetail key={id} product={query.data} />;
  return (
    <Screen includeBottomInset>
      <Button label="Назад" variant="ghost" onPress={goBack} />
      {id && query.isPending ? (
        <ProductDetailSkeleton />
      ) : query.isError ? (
        <ErrorState
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <View style={styles.content}>
          <AppText variant="h1">Товар не знайдено</AppText>
          <Button
            label="Повернутися до каталогу"
            onPress={() => router.replace('/catalog')}
          />
        </View>
      )}
    </Screen>
  );
}

function ProductDetail({ product }: { product: Product }) {
  const purchase = useProductPurchase(product);
  const { variant, offer, store, storeId } = purchase;
  const insets = useSafeAreaInsets();
  const favorite = useFavoritesStore((s) => s.productIds.includes(product.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const snack = product.category === 'snacks';
  const beer = !snack && product.category !== 'cider';
  const profile = [
    product.bitternessLevel,
    product.sweetnessLevel,
    product.acidityLevel,
    product.fullnessLevel,
  ].some((v) => v !== undefined);
  const unavailable = offer.availability !== 'available';
  const badges = [
    product.isOwnBrewery && 'Власна броварня',
    offer.oldPrice &&
      offer.oldPrice.currency === offer.price.currency &&
      offer.oldPrice.amount > offer.price.amount &&
      'Акція',
    product.isNew && 'Новинка',
    product.isPopular && 'Популярне',
  ]
    .filter((label): label is string => typeof label === 'string')
    .slice(0, 3);
  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel="Назад"
          icon={<Icon name="arrow-left" />}
          onPress={goBack}
        />
        <AppText variant="label" style={styles.grow}>
          {snack ? 'До вашого смаку' : 'Знайдіть свій смак'}
        </AppText>
        <IconButton
          accessibilityLabel={`${favorite ? 'Видалити з обраного' : 'Додати в обране'}: ${product.name}`}
          accessibilityState={{ selected: favorite }}
          icon={
            <Icon
              name="heart"
              color={favorite ? colors.amber : colors.primary}
            />
          }
          onPress={() => toggleFavorite(product.id)}
        />
      </View>
      <ScrollView
        testID="product-detail-scroll"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.heroArt}>
          <ProductImage
            source={resolveProductImage(product.image)}
            label={product.name}
            styleName={product.beerStyle ?? product.category}
            shop
          />
        </View>
        <View style={styles.section}>
          <View style={styles.wrap}>
            {badges.map((label) => (
              <Badge key={label} label={label} />
            ))}
          </View>
          <AppText variant="label" color="textSubtle">
            {getBeerStyleTheme(product.beerStyle ?? product.category).label}
          </AppText>
          <AppText
            variant="h1"
            accessibilityRole="header"
            style={styles.productTitle}
          >
            {product.name}
          </AppText>
          <AppText variant="bodySmall" color="textSubtle">
            {[product.brewery, product.country].filter(Boolean).join(' · ')}
          </AppText>
          <View style={styles.wrap} testID="product-metadata">
            {!snack && product.abv !== undefined && (
              <AppText variant="bodySmall">
                {product.abv.toLocaleString('uk-UA')}% ABV
              </AppText>
            )}
            {beer && product.ibu !== undefined && (
              <AppText variant="bodySmall">{product.ibu} IBU</AppText>
            )}
            <AppText variant="bodySmall">
              {servingLabels[variant.servingType]}
            </AppText>
            <AppText variant="bodySmall">
              {formatVolume(variant.volume)}
            </AppText>
          </View>
        </View>
        <View style={styles.section}>
          <Button
            variant="ghost"
            label={store?.name ?? 'Оберіть магазин'}
            accessibilityLabel={
              store ? `Змінити магазин: ${store.name}` : 'Оберіть магазин'
            }
            leftIcon={<Icon name="map-pin" />}
            onPress={() => purchase.setPickerOpen(true)}
          />
          <AppText
            accessibilityLiveRegion="polite"
            color={unavailable ? 'textSubtle' : 'success'}
          >
            {!storeId
              ? 'Оберіть магазин, щоб перевірити ціну та наявність'
              : unavailable
                ? 'Немає в цьому магазині'
                : 'В наявності'}
          </AppText>
          {storeId && unavailable && (
            <Button
              label="Обрати інший магазин"
              variant="outline"
              onPress={() => purchase.setPickerOpen(true)}
            />
          )}
          {storeId && !purchase.canOrder && !purchase.stores.isPending && (
            <AppText variant="bodySmall">
              Замовлення в цьому магазині зараз недоступне
            </AppText>
          )}
          {purchase.stores.isError && (
            <Button
              label="Оновити магазини"
              variant="ghost"
              onPress={() => {
                void purchase.stores.refetch();
              }}
            />
          )}
        </View>
        <View style={styles.section}>
          <AppText variant="title">{snack ? 'Вага' : 'Об’єм'}</AppText>
          <View style={styles.wrap}>
            {purchase.variants.map((item) => {
              const disabled =
                variantOffer(product, item, storeId).availability !==
                'available';
              const label = variantLabel(item);
              return (
                <FilterChip
                  key={item.id}
                  label={`${label}${disabled ? ' · недоступно' : ''}`}
                  accessibilityLabel={`Варіант: ${label}${disabled ? ', недоступно' : ''}`}
                  selected={variant.id === item.id}
                  disabled={disabled}
                  onPress={() => purchase.selectVariant(item)}
                />
              );
            })}
          </View>
        </View>
        {beer && product.ibu !== undefined && (
          <View style={styles.section}>
            <AppText variant="title">Гіркота</AppText>
            <BitternessIndicator level={getBitternessLevel(product.ibu)!} />
          </View>
        )}
        {beer && profile && (
          <View testID="product-flavor" style={styles.section}>
            <AppText variant="title">Профіль смаку</AppText>
            <FlavorProfile
              values={{
                bitterness: product.bitternessLevel,
                sweetness: product.sweetnessLevel,
                acidity: product.acidityLevel,
                fullness: product.fullnessLevel,
              }}
            />
          </View>
        )}
        {!!product.flavorProfile.length && (
          <View style={styles.wrap}>
            {product.flavorProfile.map((tag) => (
              <Badge key={tag} label={tag} />
            ))}
          </View>
        )}
        <View style={styles.section}>
          <AppText variant="h2">{snack ? 'Про продукт' : 'Про напій'}</AppText>
          <AppText>{product.description}</AppText>
        </View>
        {beer && product.brewery && (
          <View
            style={[styles.section, product.isOwnBrewery && styles.brewery]}
          >
            <AppText variant="label">Броварня</AppText>
            <AppText variant="title">{product.brewery}</AppText>
          </View>
        )}
        <ProductRecommendations
          id={product.id}
          storeId={storeId}
          canOrder={purchase.canOrder}
          chooseStore={() => purchase.setPickerOpen(true)}
        />
      </ScrollView>
      {/* A non-overlaid sibling reserves its measured height, including the safe area. */}
      <View
        testID="product-purchase-bar"
        style={[styles.purchase, { paddingBottom: spacing.md + insets.bottom }]}
      >
        <View style={styles.purchaseRow}>
          <View style={styles.grow}>
            <Price
              currentPrice={offer.price}
              oldPrice={offer.oldPrice}
              volume={variant.volume}
            />
          </View>
          <QuantityControl
            value={purchase.quantity}
            min={1}
            max={Math.max(1, purchase.remaining)}
            disabled={!purchase.canBuy}
            onChange={purchase.setQuantity}
          />
        </View>
        {purchase.remaining === 0 && (
          <AppText variant="caption">
            Максимальну кількість уже додано в кошик
          </AppText>
        )}
        <Button
          testID="product-add"
          label={storeId ? 'Додати в кошик' : 'Обрати магазин'}
          variant="accent"
          disabled={!purchase.hydrated || (!!storeId && !purchase.canBuy)}
          onPress={purchase.add}
        />
      </View>
      <StorePicker
        visible={purchase.pickerOpen}
        stores={purchase.stores.data ?? []}
        selectedId={storeId}
        onClose={() => purchase.setPickerOpen(false)}
        onSelect={(selected) => {
          useSelectedStore.getState().select(selected.id);
          purchase.setPickerOpen(false);
        }}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  grow: { flex: 1, minWidth: 0 },
  scroll: { flex: 1, minHeight: 0 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xxl,
  },
  section: { gap: spacing.md },
  heroArt: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderRadius: spacing.md,
    overflow: 'hidden',
  },
  productTitle: { color: shopPalette.navy, textTransform: 'uppercase' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  brewery: {
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
    paddingLeft: spacing.md,
  },
  purchase: {
    flexShrink: 0,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  purchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});

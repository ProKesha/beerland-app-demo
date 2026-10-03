import {
  View,
  Pressable,
  StyleSheet,
  type ImageSourcePropType,
} from 'react-native';
import type { Product } from '@/types/domain';
import { getBeerStyleTheme } from '@/theme/beerStyles';
import { colors, layout, shopPalette, spacing } from '@/theme/tokens';
import { resolveProductImage } from '@/assets/images';
import {
  AppText,
  Badge,
  Button,
  Card,
  Icon,
  IconButton,
  Price,
} from '@/components/ui';
import { ProductImage } from './ProductImage';
export interface ProductCardProps {
  product: Product;
  variant?: 'standard' | 'compact';
  isFavorited?: boolean;
  onFavorite: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onOpen?: (product: Product) => void;
  imageSource?: ImageSourcePropType;
  showIbu?: boolean;
  adding?: boolean;
  disabled?: boolean;
  unavailableLabel?: string;
  shop?: boolean;
}
export function ProductCard({
  product,
  variant = 'standard',
  isFavorited = false,
  onFavorite,
  onAddToCart,
  onOpen,
  imageSource,
  showIbu = true,
  adding = false,
  disabled = false,
  unavailableLabel = 'Немає в наявності',
  shop = false,
}: ProductCardProps) {
  const compact = variant === 'compact';
  const theme = getBeerStyleTheme(product.beerStyle ?? product.category);
  const source = imageSource ?? resolveProductImage(product.image);
  const hasBadges = product.isNew || product.isPopular || product.isOwnBrewery;
  const unavailable = product.availability !== 'available';
  return (
    <Card style={[styles.root, compact && styles.compact, shop && styles.shop]}>
      <View style={!compact && styles.image}>
        <ProductImage
          label={product.name}
          source={source}
          styleName={product.beerStyle ?? product.category}
          compact={compact}
          shop={shop}
        />
        {!compact && <View style={styles.favorite}>{favorite()}</View>}
      </View>
      <View style={[styles.content, shop && styles.shopContent]}>
        {hasBadges && (
          <View style={styles.badges}>
            {product.isNew && <Badge kind="new" />}
            {product.isPopular && <Badge kind="popular" />}
            {product.isOwnBrewery && <Badge kind="ownBrewery" />}
          </View>
        )}
        <AppText variant="caption" color="textSubtle">
          {theme.label}
        </AppText>
        {onOpen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Відкрити товар: ${product.name}`}
            onPress={() => onOpen(product)}
            style={styles.titleLink}
          >
            <AppText variant="title">{product.name}</AppText>
          </Pressable>
        ) : (
          <AppText variant="title">{product.name}</AppText>
        )}
        {(product.abv !== undefined ||
          (showIbu && product.ibu !== undefined)) && (
          <AppText variant="caption" color="textSubtle">
            {[
              product.abv !== undefined
                ? `${product.abv.toLocaleString('uk-UA')}%`
                : undefined,
              showIbu && product.ibu !== undefined
                ? `${product.ibu} IBU`
                : undefined,
            ]
              .filter(Boolean)
              .join(' • ')}
          </AppText>
        )}
        <View style={styles.purchase}>
          {unavailable && (
            <AppText variant="caption" color="textSubtle">
              {unavailableLabel}
            </AppText>
          )}
          <Price currentPrice={product.price} volume={product.volume} />
          <View style={styles.actions}>
            {compact && favorite()}
            <Button
              label={unavailable ? 'Недоступно' : 'Додати'}
              accessibilityLabel={`Додати в кошик: ${product.name}`}
              disabled={disabled || unavailable}
              loading={adding}
              onPress={() => onAddToCart(product)}
              leftIcon={
                !unavailable && (
                  <Icon
                    name="plus"
                    size="sm"
                    color={
                      disabled
                        ? colors.disabledText
                        : shop
                          ? colors.primary
                          : colors.background
                    }
                  />
                )
              }
              style={[styles.add, shop && styles.shopAdd]}
              size="compact"
              variant={shop ? 'accent' : 'primary'}
            />
          </View>
        </View>
      </View>
    </Card>
  );
  function favorite() {
    return (
      <IconButton
        accessibilityLabel={`${isFavorited ? 'Видалити з обраного' : 'Додати в обране'}: ${product.name}`}
        accessibilityState={{ selected: isFavorited }}
        onPress={() => onFavorite(product)}
        icon={
          <Icon
            name="heart"
            color={isFavorited ? colors.error : colors.primary}
          />
        }
      />
    );
  }
}
const styles = StyleSheet.create({
  titleLink: { minHeight: layout.touchTarget, justifyContent: 'center' },
  root: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
  compact: { flexDirection: 'row', alignItems: 'flex-start' },
  image: { width: '100%' },
  favorite: { position: 'absolute', top: spacing.xs, right: spacing.xs },
  content: { flex: 1, gap: spacing.sm, minWidth: 0 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  purchase: { marginTop: 'auto', gap: spacing.sm, paddingTop: spacing.xs },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  add: { flex: 1 },
  shop: {
    padding: 0,
    gap: 0,
    borderColor: colors.border,
    borderRadius: layout.borderWidth * 8,
    overflow: 'hidden',
  },
  shopContent: { padding: spacing.md, gap: spacing.xs },
  shopAdd: { backgroundColor: shopPalette.gold },
});

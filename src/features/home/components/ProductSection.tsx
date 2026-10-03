import { FlatList, View, StyleSheet, useWindowDimensions } from 'react-native';
import type { Product } from '@/types/domain';
import { SectionHeader } from '@/components/ui';
import { ProductCard } from '@/features/product/components/ProductCard';
import { layout, spacing } from '@/theme/tokens';
export interface ProductSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  products: Product[];
  compact?: boolean;
  favorites: string[];
  onFavorite: (product: Product) => void;
  onAdd: (product: Product) => void;
  onOpen: (product: Product) => void;
  onViewAll: () => void;
  disabled?: boolean;
}
export function ProductSection({
  id,
  title,
  subtitle,
  products,
  compact = false,
  favorites,
  onFavorite,
  onAdd,
  onOpen,
  onViewAll,
  disabled,
}: ProductSectionProps) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(
    compact ? layout.homeCompactCardWidth : layout.homeCardWidth,
    Math.min(width, layout.maxAppWidth) - spacing.xl * 2 - spacing.sm,
  );
  if (products.length === 0) return null;
  return (
    <View style={styles.root} testID={`home-${id}`}>
      <SectionHeader
        title={title.toLocaleUpperCase('uk-UA')}
        subtitle={subtitle}
        action={{
          label: 'Дивитися всі',
          accessibilityLabel: `Дивитися всі: ${title}`,
          onPress: onViewAll,
        }}
      />
      <FlatList
        horizontal
        data={products}
        keyExtractor={(product) => product.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        extraData={favorites}
        renderItem={({ item }) => (
          <View style={{ width: cardWidth }} testID={`${id}-${item.id}`}>
            <ProductCard
              product={item}
              variant={compact ? 'compact' : 'standard'}
              isFavorited={favorites.includes(item.id)}
              onFavorite={onFavorite}
              onAddToCart={onAdd}
              onOpen={onOpen}
              disabled={disabled}
              shop
            />
          </View>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { gap: spacing.md },
  list: { gap: spacing.md, padding: spacing.xs, alignItems: 'stretch' },
});

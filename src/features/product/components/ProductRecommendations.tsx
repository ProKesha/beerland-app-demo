import { ScrollView, View, useWindowDimensions } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { ProductCard } from './ProductCard';
import { useProductRecommendations } from '../useProduct';
import { useHomeActions } from '@/features/home/hooks/useHomeActions';
import { layout, spacing } from '@/theme/tokens';

export function ProductRecommendations({
  id,
  storeId,
  canOrder,
  chooseStore,
}: {
  id: string;
  storeId?: string;
  canOrder: boolean;
  chooseStore: () => void;
}) {
  const query = useProductRecommendations(id, storeId);
  const actions = useHomeActions(storeId, canOrder, chooseStore);
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(
    layout.homeCompactCardWidth,
    Math.min(width, layout.maxAppWidth) - spacing.lg * 3,
  );
  if (query.isError)
    return (
      <Button
        variant="ghost"
        label="Оновити рекомендації"
        onPress={() => {
          void query.refetch();
        }}
      />
    );
  return (
    <View style={{ gap: spacing.xxl }}>
      {(['pairings', 'related'] as const).map((kind) => {
        const products = query.data?.[kind] ?? [];
        if (!products.length) return null;
        return (
          <View
            key={kind}
            testID={`product-${kind}`}
            style={{ gap: spacing.md }}
          >
            <AppText variant="h2" accessibilityRole="header">
              {kind === 'pairings' ? 'Смакує з' : 'Схожі смаки'}
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.md }}
            >
              {products.map((product) => (
                <View
                  key={product.id}
                  testID={`${kind}-${product.id}`}
                  style={{ width: cardWidth }}
                >
                  <ProductCard
                    product={product}
                    shop
                    variant="compact"
                    isFavorited={actions.favorites.includes(product.id)}
                    onFavorite={actions.favorite}
                    onAddToCart={actions.add}
                    onOpen={actions.openProduct}
                    disabled={!!storeId && !canOrder}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}

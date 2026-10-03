import { View } from 'react-native';
import { Skeleton } from '@/components/ui';
import { spacing } from '@/theme/tokens';

export function ProductDetailSkeleton() {
  return (
    <View
      testID="product-detail-loading"
      accessibilityRole="progressbar"
      accessibilityLabel="Завантаження товару"
      style={{ padding: spacing.lg, gap: spacing.xl }}
    >
      <Skeleton height={240} />
      <Skeleton width="40%" />
      <Skeleton height={36} />
      <Skeleton width="65%" />
      <Skeleton height={60} />
      <Skeleton height={100} />
    </View>
  );
}

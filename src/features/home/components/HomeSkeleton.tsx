import { View, StyleSheet } from 'react-native';
import { Card, Skeleton, ProductCardSkeleton } from '@/components/ui';
import { spacing } from '@/theme/tokens';
export function HomeSkeleton() {
  return (
    <View
      testID="home-loading"
      accessibilityLabel="Завантаження головної"
      accessibilityRole="progressbar"
      style={styles.root}
    >
      <Card>
        <Skeleton width="40%" />
        <Skeleton />
        <Skeleton width="60%" />
        <Skeleton height={spacing.giant} />
      </Card>
      <Skeleton height={spacing.giant} />
      <Card>
        <Skeleton width="80%" height={spacing.huge} />
        <Skeleton height={spacing.xxxl} />
        <Skeleton width="50%" height={spacing.giant} />
      </Card>
      <Skeleton width="65%" height={spacing.xxl} />
      <ProductCardSkeleton />
    </View>
  );
}
const styles = StyleSheet.create({ root: { gap: spacing.xl } });

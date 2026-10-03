import { View, StyleSheet, type DimensionValue } from 'react-native';
import { colors, radius, spacing, layout } from '@/theme/tokens';
import { Card } from './Card';
export function Skeleton({
  width = '100%',
  height = spacing.lg,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
}) {
  return (
    <View
      accessible={false}
      style={{
        width,
        height,
        borderRadius: radius.sm,
        backgroundColor: colors.skeleton,
      }}
    />
  );
}
export function ProductCardSkeleton({
  variant = 'standard',
}: {
  variant?: 'standard' | 'compact';
}) {
  const compact = variant === 'compact';
  return (
    <Card
      style={[styles.product, compact && styles.compact]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Завантаження товару"
    >
      <View
        style={{
          aspectRatio: compact ? 0.8 : layout.productAspectRatio,
          width: compact ? layout.compactImageWidth : '100%',
          backgroundColor: colors.skeleton,
          borderRadius: radius.md,
        }}
      />
      <View style={styles.details}>
        <Skeleton width="40%" />
        <Skeleton />
        <Skeleton width="60%" height={spacing.xxl} />
        <Skeleton height={layout.touchTarget} />
      </View>
    </Card>
  );
}
export function ListSkeleton({ count = 3 }: { count?: number }) {
  const rows = Number.isFinite(count)
    ? Math.min(10, Math.max(1, Math.floor(count)))
    : 3;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Завантаження списку"
      style={styles.list}
    >
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={layout.touchTarget} />
      ))}
    </View>
  );
}
export function SectionSkeleton() {
  return (
    <View style={styles.list}>
      <Skeleton width="60%" height={spacing.xxxl} />
      <ProductCardSkeleton />
    </View>
  );
}
const styles = StyleSheet.create({
  list: { gap: spacing.md },
  product: { padding: spacing.md, gap: spacing.md },
  compact: { flexDirection: 'row', alignItems: 'flex-start' },
  details: { gap: spacing.sm, flexGrow: 1, flexShrink: 1 },
});

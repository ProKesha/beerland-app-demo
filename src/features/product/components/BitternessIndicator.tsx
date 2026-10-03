import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import type { BitternessLevel } from '@/features/catalog/model';
export type { BitternessLevel } from '@/features/catalog/model';
const levels = {
  low: { count: 1, label: 'Низька' },
  medium: { count: 2, label: 'Середня' },
  high: { count: 3, label: 'Висока' },
};
export function BitternessIndicator({
  level,
  showLabel = true,
}: {
  level: BitternessLevel;
  showLabel?: boolean;
}) {
  const item = levels[level];
  return (
    <View
      accessible
      accessibilityLabel={`Гіркота: ${item?.label ?? 'Невідома'}`}
      style={styles.root}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.marks}
      >
        {[1, 2, 3].map((n) => (
          <Icon
            key={n}
            name="droplet"
            size="sm"
            color={n <= (item?.count ?? 0) ? colors.ipa : colors.border}
          />
        ))}
      </View>
      {showLabel && (
        <AppText variant="caption">{item?.label ?? 'Невідома'}</AppText>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  marks: { flexDirection: 'row', gap: spacing.xs },
});

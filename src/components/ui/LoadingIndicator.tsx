import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme/tokens';
import { Text } from './Text';
export function LoadingIndicator({
  label = 'Завантаження…',
}: {
  label?: string;
}) {
  return (
    <View
      accessible
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator color={colors.primary} />
      <Text variant="bodySmall">{label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
});

import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';
export function OfflineBanner({ visible = true }: { visible?: boolean }) {
  if (!visible) return null;
  return (
    <View accessibilityRole="alert" style={styles.root}>
      <Icon name="wifi-off" size="md" color={colors.warning} />
      <AppText variant="bodySmall" style={{ flex: 1 }}>
        Немає з’єднання. Перевірте інтернет.
      </AppText>
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.warningTint,
    borderRadius: radius.md,
  },
});

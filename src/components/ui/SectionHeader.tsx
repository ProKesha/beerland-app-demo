import { View, StyleSheet } from 'react-native';
import { shopPalette, spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; accessibilityLabel?: string; onPress: () => void };
}) {
  return (
    <View style={styles.root}>
      <View style={styles.text}>
        <AppText variant="h2" accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="bodySmall" color="textSubtle">
            {subtitle}
          </AppText>
        )}
      </View>
      {action && (
        <Button
          label={action.label}
          accessibilityLabel={action.accessibilityLabel}
          onPress={action.onPress}
          size="compact"
          variant="ghost"
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  text: { flexGrow: 1, flexShrink: 1, gap: spacing.xs },
  title: { color: shopPalette.navy, textTransform: 'uppercase' },
});

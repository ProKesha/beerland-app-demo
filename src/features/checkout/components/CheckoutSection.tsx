import type { PropsWithChildren } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, shopPalette, spacing } from '@/theme/tokens';
export function CheckoutSection({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.root}>
      <AppText variant="h3" accessibilityRole="header" style={styles.heading}>
        {title}
      </AppText>
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
  },
  heading: { color: shopPalette.navy, textTransform: 'uppercase' },
});

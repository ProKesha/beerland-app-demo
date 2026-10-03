import { View, StyleSheet, type ViewProps } from 'react-native';
import { colors, layout, radius, spacing } from '@/theme/tokens';
export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.root, style]} />;
}
const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.md,
  },
});

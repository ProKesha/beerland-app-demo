import { View, StyleSheet, type ViewProps } from 'react-native';
import { spacing } from '@/theme/tokens';
export function Container({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.root, style]} />;
}
const styles = StyleSheet.create({
  root: { padding: spacing.xl, gap: spacing.lg },
});

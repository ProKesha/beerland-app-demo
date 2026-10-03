import { Pressable, View, StyleSheet } from 'react-native';
import { AppText, Icon } from '@/components/ui';
import { colors, layout, radius, spacing } from '@/theme/tokens';
export function AgeConfirmation({
  checked,
  onChange,
  disabled = false,
  error,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel="Підтверджую, що мені виповнилося 18 років."
        accessibilityState={{ checked, disabled }}
        aria-checked={checked}
        testID="age-confirmation"
        disabled={disabled}
        onPress={() => onChange(!checked)}
        style={styles.row}
      >
        <View style={[styles.box, checked && styles.checked]}>
          {checked && <Icon name="check" size="sm" color={colors.surface} />}
        </View>
        <AppText variant="bodySmall" style={styles.text}>
          Підтверджую, що мені виповнилося 18 років.
        </AppText>
      </Pressable>
      {!!error && (
        <AppText color="error" variant="bodySmall" accessibilityRole="alert">
          {error}
        </AppText>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  row: {
    minHeight: layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.sm,
  },
  text: { flex: 1 },
  box: {
    width: spacing.xxl,
    height: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.primary, borderColor: colors.primary },
});

import { View, StyleSheet } from 'react-native';
import { useLayoutEffect, useRef } from 'react';
import { colors, radius, spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
export interface QuantityControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  label?: string;
}
export function QuantityControl({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  disabled = false,
  label = 'Кількість',
}: QuantityControlProps) {
  const minimum = Number.isSafeInteger(min) ? Math.max(0, min) : 0;
  const maximum = Number.isSafeInteger(max)
    ? Math.max(minimum, max)
    : Number.MAX_SAFE_INTEGER;
  const quantity = Math.min(
    maximum,
    Math.max(minimum, Number.isSafeInteger(value) ? value : minimum),
  );
  // Native events can arrive in the same render batch. Read the last emitted
  // value so every tap is counted and the limit still holds before rerender.
  const live = useRef(quantity);
  useLayoutEffect(() => {
    live.current = quantity;
  }, [quantity, minimum, maximum]);
  const step = (delta: number) => {
    if (disabled) return;
    const next = Math.min(maximum, Math.max(minimum, live.current + delta));
    if (next === live.current) return;
    live.current = next;
    onChange(next);
  };
  return (
    <View style={styles.root}>
      <IconButton
        accessibilityLabel={`Зменшити: ${label}`}
        disabled={disabled || quantity <= minimum}
        icon={<Icon name="minus" size="md" />}
        onPress={() => step(-1)}
      />
      <AppText
        variant="label"
        accessibilityLabel={`${label}: ${quantity}`}
        style={styles.value}
      >
        {quantity}
      </AppText>
      <IconButton
        accessibilityLabel={`Збільшити: ${label}`}
        disabled={disabled || quantity >= maximum}
        icon={<Icon name="plus" size="md" />}
        onPress={() => step(1)}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  value: { minWidth: spacing.xxl, textAlign: 'center' },
});

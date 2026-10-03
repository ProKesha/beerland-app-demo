import { View, StyleSheet } from 'react-native';
import { useLayoutEffect, useRef } from 'react';
import { colors, radius, spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
export interface QuantityControlProps {
  value: number;
  onChange?: (value: number) => void;
  /** Live domain actions can own stepping when several controls share a line. */
  onStep?: (direction: -1 | 1) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  label?: string;
  displayValue?: string;
  decrementLabel?: string;
  incrementLabel?: string;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  compact?: boolean;
  testID?: string;
}
export function QuantityControl({
  value,
  onChange,
  onStep,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  disabled = false,
  label = 'Кількість',
  displayValue,
  decrementLabel,
  incrementLabel,
  decrementDisabled = false,
  incrementDisabled = false,
  compact = false,
  testID,
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
  const step = (delta: -1 | 1) => {
    if (disabled || (delta < 0 ? decrementDisabled : incrementDisabled)) return;
    if (onStep) {
      onStep(delta);
      return;
    }
    const next = Math.min(maximum, Math.max(minimum, live.current + delta));
    if (next === live.current) return;
    live.current = next;
    onChange?.(next);
  };
  return (
    <View testID={testID} style={[styles.root, compact && styles.compact]}>
      <IconButton
        accessibilityLabel={decrementLabel ?? `Зменшити: ${label}`}
        disabled={disabled || decrementDisabled || quantity <= minimum}
        icon={<Icon name="minus" size="md" />}
        onPress={() => step(-1)}
      />
      <AppText
        variant="label"
        accessibilityLabel={`${label}: ${displayValue ?? quantity}`}
        style={[styles.value, compact && styles.compactValue]}
      >
        {displayValue ?? quantity}
      </AppText>
      <IconButton
        accessibilityLabel={incrementLabel ?? `Збільшити: ${label}`}
        disabled={disabled || incrementDisabled || quantity >= maximum}
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
  compact: { gap: 0, maxWidth: '100%', flexShrink: 1 },
  compactValue: { minWidth: spacing.lg, flexShrink: 1 },
});

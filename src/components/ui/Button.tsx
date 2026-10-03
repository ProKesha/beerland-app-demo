import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  colors,
  componentHeights,
  layout,
  motion,
  radius,
  shopPalette,
  spacing,
} from '@/theme/tokens';
import { AppText } from './AppText';
type Content =
  { label: string; title?: string } | { title: string; label?: string };
export type ButtonProps = Omit<PressableProps, 'children' | 'style'> &
  Content & {
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    loading?: boolean;
    variant?:
      'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
    size?: 'compact' | 'normal';
    fullWidth?: boolean;
    style?: StyleProp<ViewStyle>;
  };
export function Button({
  label,
  title,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'normal',
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  onFocus,
  onBlur,
  ...props
}: ButtonProps) {
  const inactive = disabled || loading;
  const light = !disabled && (variant === 'primary' || variant === 'danger');
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label ?? title}
      accessibilityState={{
        ...props.accessibilityState,
        disabled: inactive,
        busy: loading,
      }}
      disabled={inactive}
      onFocus={onFocus}
      onBlur={onBlur}
      style={({ pressed }) => [
        styles.root,
        styles[variant],
        {
          minHeight:
            size === 'compact'
              ? componentHeights.compact
              : componentHeights.button,
        },
        fullWidth && styles.full,
        disabled && styles.disabled,
        pressed && !inactive && { opacity: motion.pressedOpacity },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={light ? colors.background : colors.primary} />
      ) : (
        leftIcon
      )}
      <AppText
        variant="button"
        color={disabled ? 'disabledText' : light ? 'background' : 'primary'}
        style={styles.label}
      >
        {label ?? title}
      </AppText>
      {!loading && rightIcon}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  root: {
    minWidth: layout.touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: layout.borderWidth,
    borderColor: 'transparent',
  },
  label: { flexShrink: 1, textAlign: 'center' },
  full: { width: '100%' },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.amberTint,
    borderColor: colors.secondaryBorder,
  },
  accent: {
    backgroundColor: shopPalette.gold,
    borderColor: shopPalette.gold,
    borderRadius: radius.pill,
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.controlBorder,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.error },
  disabled: { backgroundColor: colors.disabled, borderColor: colors.border },
});

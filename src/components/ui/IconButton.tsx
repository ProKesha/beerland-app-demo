import { type ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { colors, layout, radius, motion } from '@/theme/tokens';
interface IconButtonProps extends Omit<PressableProps, 'children'> {
  icon: ReactNode;
  accessibilityLabel: string;
}
export function IconButton({
  icon,
  style,
  onFocus,
  onBlur,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{
        ...props.accessibilityState,
        disabled: !!props.disabled,
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      style={(state) => [
        styles.root,
        (state.pressed || props.disabled) && styles.dimmed,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {icon}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  root: {
    minWidth: layout.touchTarget,
    minHeight: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  dimmed: { opacity: motion.disabledOpacity },
});

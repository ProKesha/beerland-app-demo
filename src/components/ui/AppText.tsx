import {
  Text as NativeText,
  type TextProps as NativeTextProps,
} from 'react-native';
import { colors, typography } from '@/theme/tokens';
export interface AppTextProps extends NativeTextProps {
  variant?: keyof typeof typography;
  color?: keyof typeof colors;
}
export function AppText({
  variant = 'body',
  color = 'textPrimary',
  style,
  ...props
}: AppTextProps) {
  return (
    <NativeText
      {...props}
      style={[typography[variant], { color: colors[color] }, style]}
    />
  );
}

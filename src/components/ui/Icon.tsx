import Feather from '@expo/vector-icons/Feather';
import type { ColorValue } from 'react-native';
import type { ComponentProps } from 'react';
import { colors, iconSizes } from '@/theme/tokens';
export type IconName = ComponentProps<typeof Feather>['name'];
export function Icon({
  name,
  size = 'lg',
  color = colors.primary,
}: {
  name: IconName;
  size?: keyof typeof iconSizes;
  color?: ColorValue;
}) {
  return (
    <Feather
      name={name}
      size={iconSizes[size]}
      color={color}
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

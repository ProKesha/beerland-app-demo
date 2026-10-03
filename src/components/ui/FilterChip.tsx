import { Button, type ButtonProps } from './Button';
import { radius } from '@/theme/tokens';
export type FilterChipProps = ButtonProps & { selected?: boolean };
export function FilterChip({
  selected = false,
  style,
  ...props
}: FilterChipProps) {
  return (
    <Button
      {...props}
      size="compact"
      variant={selected ? 'primary' : 'outline'}
      accessibilityState={{ ...props.accessibilityState, selected }}
      style={[{ borderRadius: radius.pill, flexShrink: 0 }, style]}
    />
  );
}
export const ChoiceChip = FilterChip;

import { Pressable } from 'react-native';
import { AppText, Skeleton } from '@/components/ui';
import { colors, radius, shopPalette, spacing } from '@/theme/tokens';
export function QuickAction({
  label,
  count,
  onPress,
}: {
  label: string;
  count?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={
        count === undefined ? 'Відкрити розділ' : `Кількість: ${count}`
      }
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          minWidth: 0,
          minHeight: 88,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          padding: spacing.xs,
          backgroundColor: pressed ? colors.amberTint : shopPalette.gold,
          borderWidth: 1,
          borderColor: shopPalette.gold,
          borderRadius: radius.md,
        },
      ]}
    >
      {count === undefined ? (
        <Skeleton width={24} height={24} />
      ) : (
        <AppText variant="price" testID={`count-${label}`}>
          {count}
        </AppText>
      )}
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

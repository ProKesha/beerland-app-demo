import { View, StyleSheet } from 'react-native';
import type { Money, Product } from '@/types/domain';
import { formatMoney, formatVolume } from '@/utils/format';
import { spacing } from '@/theme/tokens';
import { AppText } from './AppText';
export interface PriceProps {
  currentPrice: Money;
  oldPrice?: Money;
  discountPrice?: Money;
  volume?: Product['volume'];
  unit?: string;
  size?: 'normal' | 'large';
}
export function Price({
  currentPrice,
  oldPrice,
  discountPrice,
  volume,
  unit,
  size = 'normal',
}: PriceProps) {
  const discounted =
    discountPrice &&
    discountPrice.currency === currentPrice.currency &&
    discountPrice.amount < currentPrice.amount &&
    discountPrice.amount >= 0
      ? discountPrice
      : undefined;
  const effective = discounted ?? currentPrice;
  const previous = oldPrice ?? (discounted ? currentPrice : undefined);
  const showPrevious =
    previous &&
    previous.currency === effective.currency &&
    previous.amount > effective.amount;
  const suffix = volume ? formatVolume(volume) : unit;
  return (
    <View style={styles.root}>
      {showPrevious && (
        <AppText
          variant="caption"
          color="textSubtle"
          style={styles.old}
          accessibilityLabel={`Попередня ціна: ${formatMoney(previous)}`}
        >
          {formatMoney(previous)}
        </AppText>
      )}
      <View style={styles.row}>
        <AppText variant={size === 'large' ? 'priceLarge' : 'price'}>
          {formatMoney(effective)}
        </AppText>
        {suffix && (
          <AppText variant="caption" color="textSubtle">
            / {suffix}
          </AppText>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  old: { textDecorationLine: 'line-through' },
});

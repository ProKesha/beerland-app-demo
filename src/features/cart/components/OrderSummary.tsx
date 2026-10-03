import { View, StyleSheet } from 'react-native';
import { AppText, Divider } from '@/components/ui';
import type { calculateTotals } from '../pricing';
import { formatMoney } from '@/utils/format';
import { spacing } from '@/theme/tokens';
export function OrderSummary({
  totals,
  incomplete = false,
}: {
  totals: ReturnType<typeof calculateTotals>;
  incomplete?: boolean;
}) {
  const rows = [
    ['Товари', formatMoney(totals.subtotal)],
    ...(totals.discount.amount
      ? [['Знижка', `−${formatMoney(totals.discount)}`]]
      : []),
    ['Доставка', formatMoney(totals.deliveryFee)],
  ];
  return (
    <View style={styles.root} testID="order-summary">
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <AppText variant="bodySmall" style={styles.label}>
            {label}
          </AppText>
          <AppText variant="label">{value}</AppText>
        </View>
      ))}
      <Divider />
      <View style={styles.row}>
        <AppText variant="title" style={styles.label}>
          {incomplete ? 'Відомий підсумок' : 'До сплати'}
        </AppText>
        <AppText variant="price" testID="order-total">
          {formatMoney(totals.total)}
        </AppText>
      </View>
      {incomplete && (
        <AppText accessibilityRole="alert" variant="bodySmall" color="error">
          Сума неповна: позиції без актуальної ціни не враховано. Оформлення
          недоступне до виправлення кошика.
        </AppText>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  label: { flexGrow: 1, flexShrink: 1 },
});

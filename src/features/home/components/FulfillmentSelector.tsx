import { View, StyleSheet } from 'react-native';
import type { Store } from '@/types/domain';
import type { FulfillmentMethod } from '@/stores/fulfillment';
import { AppText, FilterChip } from '@/components/ui';
import { spacing } from '@/theme/tokens';
export function FulfillmentSelector({
  method,
  store,
  onChange,
}: {
  method: FulfillmentMethod | null;
  store?: Store;
  onChange: (method: FulfillmentMethod) => void;
}) {
  const deliveryDisabled = !store || !store.deliveryAvailable;
  const pickupDisabled = !store || !store.pickupAvailable;
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <FilterChip
          label="Доставка"
          selected={!deliveryDisabled && method === 'delivery'}
          disabled={deliveryDisabled}
          onPress={() => onChange('delivery')}
          style={styles.option}
        />
        <FilterChip
          label="Самовивіз"
          selected={!pickupDisabled && method === 'pickup'}
          disabled={pickupDisabled}
          onPress={() => onChange('pickup')}
          style={styles.option}
        />
      </View>
      {store &&
        ((method === 'delivery' && deliveryDisabled) ||
          (method === 'pickup' && pickupDisabled)) && (
          <AppText accessibilityRole="alert" color="error" variant="bodySmall">
            Обраний спосіб отримання недоступний. Оберіть інший, щоб продовжити.
          </AppText>
        )}
      {(deliveryDisabled || pickupDisabled) && (
        <AppText variant="caption" color="textSubtle">
          {!store
            ? 'Спершу оберіть магазин.'
            : deliveryDisabled && pickupDisabled
              ? 'Отримання замовлень тимчасово недоступне.'
              : deliveryDisabled
                ? 'У цьому магазині доступний лише самовивіз.'
                : 'У цьому магазині доступна лише доставка.'}
        </AppText>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  option: { flex: 1 },
});

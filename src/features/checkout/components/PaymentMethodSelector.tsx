import { Platform, View, StyleSheet } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { paymentLabels, paymentMethods, type PaymentMethod } from '../model';
import { spacing } from '@/theme/tokens';
export function PaymentMethodSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.root}>
      {paymentMethods(Platform.OS).map((method) => (
        <Button
          key={method}
          label={paymentLabels[method]}
          testID={`payment-${method}`}
          accessibilityState={{ selected: value === method }}
          variant={value === method ? 'secondary' : 'outline'}
          disabled={disabled}
          onPress={() => onChange(method)}
        />
      ))}
      <AppText variant="caption" color="textSubtle">
        Демонстраційне оформлення: кошти не списуються. Дані картки не потрібні.
      </AppText>
    </View>
  );
}
const styles = StyleSheet.create({ root: { gap: spacing.sm } });

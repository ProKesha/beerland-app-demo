import { StyleSheet, View } from 'react-native';
import { AppText, Button, Screen } from '@/components/ui';
import { spacing } from '@/theme/tokens';

export function RecoveryScreen({
  configuration = false,
  onRetry,
}: {
  configuration?: boolean;
  onRetry?: () => void;
}) {
  return (
    <Screen includeBottomInset chrome="minimal">
      <View style={styles.content} testID="app-recovery">
        <AppText variant="title">BEERLAND</AppText>
        <AppText variant="h2" accessibilityRole="header" style={styles.center}>
          {configuration ? 'Застосунок ще не налаштовано' : 'Щось пішло не так'}
        </AppText>
        <AppText
          color="textSubtle"
          accessibilityRole="alert"
          style={styles.center}
        >
          {configuration
            ? 'Сервіси Beerland поки недоступні. Спробуйте пізніше.'
            : 'Не вдалося відкрити цей екран. Спробуйте ще раз. Ваші локальні дані збережено.'}
        </AppText>
        {onRetry && <Button label="Повторити" onPress={onRetry} />}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    padding: spacing.xxl,
  },
  center: { textAlign: 'center' },
});

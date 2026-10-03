import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText, Button, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { useSessionStore } from '@/stores/session';

export function StartupScreen() {
  const hydrationError = useSessionStore((state) => state.hydrationError);
  const retry = useSessionStore((state) => state.retryHydration);
  return (
    <Screen scroll={false} includeBottomInset chrome="minimal">
      <View style={styles.content} testID="first-launch-loading">
        {hydrationError ? (
          <>
            <AppText accessibilityRole="alert" style={styles.centerText}>
              Не вдалося завантажити локальні дані.
            </AppText>
            <Button label="Повторити" onPress={retry} />
          </>
        ) : (
          <>
            <ActivityIndicator
              color={colors.primary}
              accessibilityLabel="Завантаження"
            />
            <AppText color="textSubtle">Завантажуємо Beerland…</AppText>
          </>
        )}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  centerText: { textAlign: 'center' },
});

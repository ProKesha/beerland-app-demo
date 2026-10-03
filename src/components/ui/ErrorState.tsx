import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';
export function ErrorState({
  title = 'Не вдалося завантажити',
  description = 'Спробуйте ще раз.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.root}>
      <Icon name="alert-circle" color={colors.error} />
      <AppText variant="title" accessibilityRole="alert" style={styles.center}>
        {title}
      </AppText>
      <AppText variant="bodySmall" color="textSubtle" style={styles.center}>
        {description}
      </AppText>
      <Button label="Повторити" onPress={onRetry} variant="outline" />
    </View>
  );
}
const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  root: { padding: spacing.xl, alignItems: 'center', gap: spacing.md },
});

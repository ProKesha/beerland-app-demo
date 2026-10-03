import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, shopPalette, spacing } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
const examples = {
  cart: {
    icon: 'shopping-bag' as IconName,
    tint: colors.amberTint,
    accent: colors.warning,
    title: 'У кошику поки порожньо',
    description: 'Знайдемо щось цікаве до вечора?',
    label: 'Перейти до каталогу',
  },
  favorites: {
    icon: 'heart' as IconName,
    tint: colors.errorTint,
    accent: colors.error,
    title: 'Тут будуть ваші улюблені',
    description: 'Зберігайте смаки, до яких хочеться повернутися.',
    label: 'Знайти свій смак',
  },
  orders: {
    icon: 'clock' as IconName,
    tint: colors.infoTint,
    accent: colors.info,
    title: 'Ваша історія ще попереду',
    description: 'Після першого замовлення воно з’явиться тут.',
    label: 'Обрати перше замовлення',
  },
  search: {
    icon: 'search' as IconName,
    tint: colors.ipaTint,
    accent: colors.success,
    title: 'Не знайшли такого смаку',
    description: 'Спробуйте іншу назву або змініть фільтри.',
    label: 'Скинути пошук',
  },
};
export function EmptyState({
  variant = 'cart',
  title,
  description,
  illustration,
  action,
}: {
  variant?: keyof typeof examples;
  title?: string;
  description?: string;
  illustration?: ReactNode;
  action?: { label?: string; onPress: () => void };
}) {
  const copy = examples[variant];
  return (
    <View style={styles.root}>
      {illustration ?? (
        <View style={[styles.illustration, { backgroundColor: copy.tint }]}>
          <Icon name={copy.icon} size="xl" color={copy.accent} />
        </View>
      )}
      <AppText variant="title" style={styles.center}>
        {title ?? copy.title}
      </AppText>
      <AppText variant="bodySmall" color="textSubtle" style={styles.center}>
        {description ?? copy.description}
      </AppText>
      {action && (
        <Button
          label={action.label ?? copy.label}
          onPress={action.onPress}
          variant="accent"
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.sm,
    backgroundColor: shopPalette.cream,
    borderRadius: radius.card,
  },
  illustration: { padding: spacing.md, borderRadius: radius.lg },
  center: { textAlign: 'center' },
});

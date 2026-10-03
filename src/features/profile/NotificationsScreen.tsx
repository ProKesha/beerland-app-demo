import { Switch, View } from 'react-native';
import { AppText, Card } from '@/components/ui';
import { useNotificationPreferences } from '@/stores/notifications';
import { colors, layout, spacing } from '@/theme/tokens';
import { AccountPage } from './AccountPage';
export function NotificationsScreen() {
  const prefs = useNotificationPreferences();
  return (
    <AccountPage title="Сповіщення">
      <AppText color="textSubtle">
        Збережемо ваш вибір на цьому пристрої. Надсилання сповіщень ще не
        підключено.
      </AppText>
      <Card>
        {(
          [
            ['promotions', 'Акції та новинки'],
            ['orders', 'Статус замовлення'],
            ['loyalty', 'Бонуси Beerland Club'],
          ] as const
        ).map(([key, label]) => (
          <View
            key={key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              minHeight: layout.touchTarget,
            }}
          >
            <AppText style={{ flex: 1 }}>{label}</AppText>
            <Switch
              accessibilityLabel={label}
              accessibilityState={{ checked: prefs[key] }}
              hitSlop={spacing.sm}
              value={prefs[key]}
              onValueChange={() => prefs.toggle(key)}
              trackColor={{ true: colors.success }}
            />
          </View>
        ))}
      </Card>
    </AccountPage>
  );
}

import { QuickAction } from './QuickAction';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { AppText, Button, Card, ErrorState, Skeleton } from '@/components/ui';
import { AccountPage } from './AccountPage';
import { useUser, useLoyalty, useOrders } from './queries';
import { ClubCard } from '@/features/loyalty/ClubCard';
import { useFavoritesStore } from '@/stores/favorites';
import { useAddressStore } from '@/stores/checkout';
import { useSessionStore } from '@/stores/session';
import { spacing } from '@/theme/tokens';
export function ProfileScreen() {
  const session = useSessionStore((state) => state.status);
  const user = useUser();
  const loyalty = useLoyalty();
  const orders = useOrders();
  const favorites = useFavoritesStore((s) => s.productIds.length);
  const addresses = useAddressStore((s) => s.addresses.length);
  const actions: [string, Href, number | undefined][] = [
    ['Замовлення', '/orders', orders.data?.length],
    ['Обране', '/favorites', favorites],
    ['Адреси', '/addresses', addresses],
  ];
  return (
    <AccountPage title={user.data?.name || 'Ваш профіль'} back={false}>
      {session !== 'authenticated' && (
        <AppText color="textSubtle">
          Гостьовий режим · дані зберігаються на цьому пристрої. Це не
          підтверджений обліковий запис.
        </AppText>
      )}
      {session !== 'authenticated' && (
        <Card>
          <AppText variant="title">Увійдіть до Beerland</AppText>
          <AppText color="textSubtle">
            Зберігайте замовлення та керуйте своїм профілем.
          </AppText>
          <Button
            label="Увійти або зареєструватися"
            variant="accent"
            onPress={() =>
              router.push('/auth/phone?returnTo=%2Fprofile' as Href)
            }
          />
          {session === 'authError' && (
            <AppText accessibilityRole="alert" color="error">
              Не вдалося відновити демосесію. Гостьові дані збережено.
            </AppText>
          )}
        </Card>
      )}
      {user.isPending ? (
        <Skeleton />
      ) : user.isError ? (
        <ErrorState
          onRetry={() => {
            void user.refetch();
          }}
        />
      ) : (
        <AppText color="textSubtle">
          {session === 'authenticated'
            ? `Демоакаунт · ${user.data?.phone ?? ''}`
            : user.data?.phone || user.data?.email || 'Демонстраційний профіль'}
        </AppText>
      )}
      {loyalty.isPending ? (
        <Skeleton height={240} />
      ) : loyalty.isError ? (
        <ErrorState
          onRetry={() => {
            void loyalty.refetch();
          }}
        />
      ) : (
        loyalty.data && (
          <>
            {session !== 'authenticated' && (
              <AppText variant="caption" color="textSubtle">
                Демонстраційні бонуси Beerland Club
              </AppText>
            )}
            <ClubCard
              account={loyalty.data}
              onOpen={() => router.push('/loyalty')}
            />
          </>
        )
      )}
      <View style={{ gap: spacing.sm, flexDirection: 'row' }}>
        {actions.map(([label, path, count]) => (
          <QuickAction
            key={label}
            label={label}
            count={count}
            onPress={() => router.push(path)}
          />
        ))}
      </View>
      {orders.isError && (
        <ErrorState
          onRetry={() => {
            void orders.refetch();
          }}
        />
      )}
      <Card>
        {(
          [
            ['Особисті дані', '/profile/personal'],
            ['Сповіщення', '/settings/notifications'],
            ['Допомога', '/support'],
            ['Налаштування', '/settings'],
          ] as const
        ).map(([label, path]) => (
          <Button
            key={path}
            label={label}
            variant="ghost"
            onPress={() => router.push(path)}
          />
        ))}
      </Card>
    </AccountPage>
  );
}

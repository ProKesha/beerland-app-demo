import Constants from 'expo-constants';
import { config } from '@/config/env';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppText, Button, Card, Modal, useToast } from '@/components/ui';
import { customerSupport } from '@/config/customerSupport';
import {
  resetFirstLaunchForDevelopment,
  useFirstLaunchStore,
} from '@/stores/firstLaunch';
import { AccountPage } from './AccountPage';
import { useSessionStore } from '@/stores/session';
import { useAuthFlow } from '@/features/auth/flow';
import { useRepositories } from '@/repositories/RepositoryProvider';
import { signOutOfDemo } from '@/features/auth/actions';
import { recoverGuestWorkspace } from '@/features/auth/workspace';
export function SettingsScreen() {
  const toast = useToast();
  const repositories = useRepositories();
  const client = useQueryClient();
  const authenticated = useSessionStore(
    (state) => state.status === 'authenticated',
  );
  const busy = useAuthFlow((state) => state.busy);
  const error = useAuthFlow((state) => state.error);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const setReviewing = useFirstLaunchStore((state) => state.setReviewing);
  return (
    <AccountPage title="Налаштування">
      <Card>
        <AppText variant="label">Мова</AppText>
        <AppText>Українська</AppText>
      </Card>
      <Button
        label="Сповіщення"
        variant="outline"
        onPress={() => router.push('/settings/notifications')}
      />
      <Button
        label="Переглянути знайомство з Beerland"
        variant="outline"
        onPress={() => {
          setReviewing(true);
          router.push('/onboarding');
        }}
      />
      {config.developmentToolsEnabled && (
        <Button
          label="Перевірити перший запуск (розробка)"
          variant="ghost"
          onPress={() => {
            void resetFirstLaunchForDevelopment().then((reset) => {
              if (!reset) toast.show('Не вдалося скинути перший запуск');
            });
          }}
        />
      )}
      {authenticated && (
        <>
          <Button
            label="Вийти з акаунта"
            variant="outline"
            onPress={() => setConfirmLogout(true)}
          />
          <Modal
            visible={confirmLogout}
            title="Вийти з акаунта?"
            description="Дані демоакаунта залишаться окремо. Гостьовий кошик і налаштування цього пристрою буде відновлено."
            onClose={() => {
              if (!busy) setConfirmLogout(false);
            }}
          >
            {error && (
              <AppText accessibilityRole="alert" color="error">
                {error}
              </AppText>
            )}
            <Button
              label="Скасувати"
              variant="outline"
              disabled={busy}
              onPress={() => setConfirmLogout(false)}
            />
            <Button
              label="Вийти з акаунта"
              variant="danger"
              loading={busy}
              onPress={() => {
                void signOutOfDemo(repositories, client).then((okay) => {
                  if (okay) {
                    setConfirmLogout(false);
                    router.replace('/profile');
                  }
                });
              }}
            />
          </Modal>
        </>
      )}
      {config.developmentToolsEnabled &&
        authenticated &&
        repositories.auth.development && (
          <Button
            label="Тест: завершити демосесію"
            variant="ghost"
            onPress={() => {
              void (async () => {
                try {
                  await repositories.auth.development?.expireSession();
                  await recoverGuestWorkspace();
                  client.clear();
                  useSessionStore.getState().clearAuth();
                  toast.show('Демосесію завершено. Гостьові дані відновлено.');
                  router.replace('/profile');
                } catch {
                  toast.show('Не вдалося завершити демосесію.');
                }
              })();
            }}
          />
        )}
      <Card>
        <AppText variant="title">Правова інформація</AppText>
        <AppText color="textSubtle">
          Документи з’являться після затвердження Beerland.
        </AppText>
        {(
          [
            ['Політика конфіденційності', customerSupport.privacyUrl],
            ['Умови користування', customerSupport.termsUrl],
          ] as const
        ).map(([label, url]) => (
          <Button
            key={label}
            label={label}
            variant="ghost"
            disabled={!url}
            onPress={() => {
              if (url)
                void Linking.openURL(url).catch(() =>
                  toast.show('Не вдалося відкрити посилання'),
                );
            }}
          />
        ))}
      </Card>
      <AppText variant="caption" color="textSubtle">
        Версія застосунку {Constants.expoConfig?.version ?? '—'}
      </AppText>
    </AccountPage>
  );
}

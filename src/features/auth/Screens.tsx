import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { router, type Href, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  AppText,
  Button,
  Card,
  Container,
  Screen,
  TextInput,
} from '@/components/ui';
import { useRepositories } from '@/repositories/RepositoryProvider';
import { config } from '@/config/env';
import { spacing } from '@/theme/tokens';
import { ShopPageBanner } from '@/components/common/ShopPageBanner';
import { useSessionStore } from '@/stores/session';
import {
  formatCountdown,
  formatPhone,
  otpSchema,
  phoneSchema,
  profileSchema,
} from './model';
import { safeReturnTo, useAuthFlow } from './flow';
import {
  cancelAuthCode,
  cancelPendingSignIn,
  completeAuthProfile,
  requestAuthCode,
  resendAuthCode,
  resolveCartConflict,
  verifyAuthCode,
} from './actions';

function AuthPage({
  title,
  children,
  onBack,
  backDisabled,
}: {
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
  backDisabled?: boolean;
}) {
  return (
    <Screen includeBottomInset keyboardAware chrome="minimal">
      <Container style={{ gap: spacing.xl, paddingBottom: spacing.huge }}>
        <Button
          label="Назад"
          variant="ghost"
          disabled={backDisabled}
          onPress={
            onBack ??
            (() =>
              router.canGoBack() ? router.back() : router.replace('/profile'))
          }
        />
        <ShopPageBanner title={title} label="BEERLAND / ВХІД" />
        {children}
      </Container>
    </Screen>
  );
}
function FlowError() {
  const error = useAuthFlow((state) => state.error);
  return error ? (
    <AppText accessibilityRole="alert" color="error">
      {error}
    </AppText>
  ) : null;
}
export function PhoneScreen() {
  const repositories = useRepositories();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const setReturnTo = useAuthFlow((state) => state.setReturnTo);
  const busy = useAuthFlow((state) => state.busy);
  const setError = useAuthFlow((state) => state.setError);
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const valid = phoneSchema.safeParse(phone).success;
  useEffect(() => {
    setReturnTo(safeReturnTo(params.returnTo));
  }, [params.returnTo, setReturnTo]);
  const submit = async () => {
    if (await requestAuthCode(repositories, phone))
      router.push('/auth/otp' as Href);
  };
  return (
    <AuthPage title="Увійти до Beerland" backDisabled={busy}>
      <AppText color="textSubtle">
        Введіть номер телефону, щоб отримати код підтвердження.
      </AppText>
      <TextInput
        label="Номер телефону"
        testID="auth-phone"
        value={phone}
        disabled={busy}
        onChangeText={(value) => {
          setPhone(value);
          setError(null);
        }}
        onBlur={() => {
          setTouched(true);
          const parsed = phoneSchema.safeParse(phone);
          if (parsed.success) setPhone(formatPhone(parsed.data));
        }}
        placeholder="+380 XX XXX XX XX"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={24}
        errorText={
          touched && !valid
            ? 'Вкажіть український номер у форматі +380 XX XXX XX XX'
            : undefined
        }
      />
      <FlowError />
      {!config.demoAuthEnabled && (
        <AppText color="textSubtle">
          Вхід за номером зараз недоступний. Гостьовий режим працює.
        </AppText>
      )}
      {__DEV__ && config.demoAuthEnabled && (
        <AppText variant="caption" color="textSubtle">
          Демо режим: SMS не надсилається. Тестовий код 123456.
        </AppText>
      )}
      {config.developmentToolsEnabled &&
        config.demoAuthEnabled &&
        repositories.auth.development && (
          <Button
            label="Тест: помилка запиту коду"
            variant="ghost"
            onPress={() => {
              repositories.auth.development?.failNextRequest();
              setError('Наступний запит коду покаже помилку.');
            }}
          />
        )}
      <Button
        label="Отримати код"
        variant="accent"
        testID="auth-request"
        disabled={!valid || !config.demoAuthEnabled}
        loading={busy}
        onPress={() => {
          void submit();
        }}
      />
      <Button
        label="Продовжити як гість"
        variant="ghost"
        disabled={busy}
        onPress={() => router.replace('/profile')}
      />
    </AuthPage>
  );
}

export function OtpScreen() {
  const repositories = useRepositories();
  const client = useQueryClient();
  const challenge = useAuthFlow((state) => state.challenge);
  const setChallenge = useAuthFlow((state) => state.setChallenge);
  const pendingUser = useAuthFlow((state) => state.pendingUser);
  const busy = useAuthFlow((state) => state.busy);
  const error = useAuthFlow((state) => state.error);
  const setError = useAuthFlow((state) => state.setError);
  const returnTo = useAuthFlow((state) => state.returnTo);
  const user = useSessionStore((state) => state.user);
  const [code, setCode] = useState('');
  const [now, setNow] = useState(Date.now);
  const submitted = useRef(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  useEffect(() => {
    if (challenge) return;
    let active = true;
    void repositories.auth
      .getPendingChallenge()
      .then((pending) => {
        if (!active) return;
        if (pending) setChallenge(pending);
        else router.replace('/auth/phone' as Href);
      })
      .catch(() => {
        if (active) setError('Не вдалося відновити запит коду.');
      });
    return () => {
      active = false;
    };
  }, [challenge, repositories, setChallenge, setError, restoreAttempt]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const listener = AppState.addEventListener('change', () =>
      setNow(Date.now()),
    );
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  useEffect(() => {
    if (pendingUser) router.replace('/auth/merge' as Href);
    else if (user)
      router.replace(
        (user.needsProfile ? '/auth/complete-profile' : returnTo) as Href,
      );
  }, [pendingUser, user, returnTo]);
  const submit = async (value = code) => {
    if (submitted.current || !otpSchema.safeParse(value).success) return;
    submitted.current = true;
    const okay = await verifyAuthCode(repositories, client, value);
    submitted.current = false;
    if (!okay) setCode('');
  };
  const change = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (error) setError(null);
    if (digits.length === 6) void submit(digits);
  };
  const changePhone = async () => {
    try {
      await cancelAuthCode(repositories);
      router.replace({ pathname: '/auth/phone', params: { returnTo } } as Href);
    } catch {
      setError('Не вдалося змінити номер. Спробуйте ще раз.');
    }
  };
  const remaining = Math.max(0, (challenge?.resendAvailableAt ?? now) - now);
  return (
    <AuthPage
      title="Підтвердьте номер"
      backDisabled={busy}
      onBack={() => {
        void changePhone();
      }}
    >
      <AppText color="textSubtle">
        Введіть шестизначний код підтвердження.
      </AppText>
      {challenge && (
        <AppText variant="label">{formatPhone(challenge.phone)}</AppText>
      )}
      <TextInput
        label="Код підтвердження"
        testID="auth-otp"
        value={code}
        disabled={busy || !challenge}
        onChangeText={change}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        maxLength={12}
        errorText={error ?? undefined}
      />
      {!challenge && error && (
        <Button
          label="Повторити відновлення коду"
          variant="outline"
          onPress={() => {
            setError(null);
            setRestoreAttempt((value) => value + 1);
          }}
        />
      )}
      <Button
        label="Підтвердити код"
        disabled={code.length !== 6 || !challenge}
        loading={busy}
        onPress={() => {
          void submit();
        }}
      />
      <Button
        label={
          remaining
            ? `Надіслати повторно через ${formatCountdown(remaining)}`
            : 'Надіслати код повторно'
        }
        variant="outline"
        disabled={remaining > 0 || !challenge || busy}
        onPress={() => {
          void resendAuthCode(repositories).then((okay) => {
            if (okay) {
              setCode('');
              setNow(Date.now());
            }
          });
        }}
      />
      <Button
        label="Змінити номер"
        variant="ghost"
        disabled={busy}
        onPress={() => {
          void changePhone();
        }}
      />
      {__DEV__ && config.demoAuthEnabled && (
        <AppText variant="caption" color="textSubtle">
          Демо режим · код 123456 · без SMS
        </AppText>
      )}
      {config.developmentToolsEnabled &&
        config.demoAuthEnabled &&
        repositories.auth.development && (
          <Card>
            <AppText variant="label">Тестування входу</AppText>
            <Button
              label="Тест: термін коду минув"
              variant="ghost"
              onPress={() => {
                void repositories.auth.development
                  ?.expireChallenge()
                  .then(async () => {
                    setChallenge(await repositories.auth.getPendingChallenge());
                  });
              }}
            />
            <Button
              label="Тест: дозволити повторне надсилання"
              variant="ghost"
              onPress={() => {
                void repositories.auth.development
                  ?.allowResend()
                  .then(async () => {
                    setChallenge(await repositories.auth.getPendingChallenge());
                    setNow(Date.now());
                  });
              }}
            />
          </Card>
        )}
    </AuthPage>
  );
}

export function CompleteProfileScreen() {
  const repositories = useRepositories();
  const client = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const busy = useAuthFlow((state) => state.busy);
  const returnTo = useAuthFlow((state) => state.returnTo);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const parsed = profileSchema.safeParse({ name, email });
  const submit = async () => {
    setTouched(true);
    if (!parsed.success) return;
    if (await completeAuthProfile(repositories, client, parsed.data))
      router.replace(returnTo as Href);
  };
  if (!user)
    return (
      <AuthPage title="Завершити профіль">
        <AppText>Спочатку підтвердьте номер телефону.</AppText>
        <Button
          label="До входу"
          onPress={() => router.replace('/auth/phone' as Href)}
        />
      </AuthPage>
    );
  return (
    <AuthPage title="Завершити профіль" backDisabled={busy}>
      <AppText color="textSubtle">
        Номер {formatPhone(user.phone)} підтверджено лише в демо режимі. Ім’я та
        пошту можна додати зараз або пізніше.
      </AppText>
      <TextInput
        label="Ім’я"
        testID="auth-name"
        value={name}
        disabled={busy}
        onChangeText={setName}
        maxLength={80}
        autoCapitalize="words"
      />
      <TextInput
        label="Електронна пошта (необов’язково)"
        testID="auth-email"
        value={email}
        disabled={busy}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        maxLength={160}
        errorText={
          touched && !parsed.success
            ? parsed.error.issues[0].message
            : undefined
        }
      />
      <FlowError />
      <Button
        label="Продовжити"
        loading={busy}
        onPress={() => {
          void submit();
        }}
      />
      <Button
        label="Заповнити пізніше"
        variant="ghost"
        disabled={busy}
        onPress={() => router.replace(returnTo as Href)}
      />
    </AuthPage>
  );
}

export function MergeScreen() {
  const repositories = useRepositories();
  const client = useQueryClient();
  const pending = useAuthFlow((state) => state.pendingUser);
  const busy = useAuthFlow((state) => state.busy);
  const returnTo = useAuthFlow((state) => state.returnTo);
  const choose = async (choice: 'separate' | 'transfer') => {
    if (await resolveCartConflict(repositories, client, choice))
      router.replace(
        (pending?.needsProfile ? '/auth/complete-profile' : returnTo) as Href,
      );
  };
  const cancel = async () => {
    if (await cancelPendingSignIn(repositories, client))
      router.replace('/profile');
  };
  return (
    <AuthPage
      title="Узгодити кошик"
      backDisabled={busy}
      onBack={() => {
        void cancel();
      }}
    >
      <Card>
        <AppText>
          Кошики можуть належати різним магазинам або містити товари з обмеженою
          доступністю чи кількістю. Оберіть, як продовжити. Товари не буде
          видалено без вашого вибору.
        </AppText>
      </Card>
      <FlowError />
      <Button
        label="Перенести гостьові товари"
        loading={busy}
        onPress={() => {
          void choose('transfer');
        }}
      />
      <Button
        label="Зберегти кошики окремо"
        variant="outline"
        disabled={busy}
        onPress={() => {
          void choose('separate');
        }}
      />
      <Button
        label="Продовжити як гість"
        variant="ghost"
        disabled={busy}
        onPress={() => {
          void cancel();
        }}
      />
    </AuthPage>
  );
}

import { useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Screen } from '@/components/ui';
import { colors, shopPalette, spacing } from '@/theme/tokens';
import {
  completeOnboarding,
  confirmAdult,
  correctUnderage,
  enterAsGuest,
  markUnderage,
  useFirstLaunchStore,
} from '@/stores/firstLaunch';
import { useSessionStore } from '@/stores/session';
import { firstLaunchDestination, safeProductId } from './navigation';
import { StartupScreen } from './StartupScreen';
import { AgeIllustration, WelcomeIllustration } from './Illustrations';

function useEntryState() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const state = useFirstLaunchStore();
  const params = useLocalSearchParams<{ product?: string }>();
  return {
    ready: hydrated && state.loaded,
    state,
    product: safeProductId(params.product),
  };
}
function EntryPage({ children }: { children: React.ReactNode }) {
  return (
    <Screen includeBottomInset chrome="minimal">
      <View style={styles.page}>{children}</View>
    </Screen>
  );
}
function PersistenceError({ message }: { message: string | null }) {
  return message ? (
    <AppText
      color="error"
      accessibilityRole="alert"
      testID="first-launch-error"
    >
      {message}
    </AppText>
  ) : null;
}

export function AgeVerificationScreen() {
  const { ready, state, product } = useEntryState();
  const [busy, setBusy] = useState(false);
  if (!ready) return <StartupScreen />;
  if (state.ageStatus !== 'unknown')
    return <Redirect href={firstLaunchDestination(state, product)} />;
  async function choose(adult: boolean) {
    setBusy(true);
    await (adult ? confirmAdult() : markUnderage());
    setBusy(false);
  }
  return (
    <EntryPage>
      <View style={styles.center}>
        <AgeIllustration />
        <AppText
          variant="h1"
          accessibilityRole="header"
          style={[styles.centerText, styles.heading]}
        >
          Вам уже виповнилося 18?
        </AppText>
        <AppText style={styles.centerText} color="textSubtle">
          Beerland — застосунок для повнолітніх.
        </AppText>
      </View>
      <View style={styles.actions}>
        <PersistenceError message={state.error} />
        <Button
          label="Так, мені є 18"
          variant="accent"
          onPress={() => void choose(true)}
          loading={busy}
        />
        <Button
          label="Ні, мені немає 18"
          variant="outline"
          onPress={() => void choose(false)}
          disabled={busy}
        />
        <AppText variant="caption" color="textSubtle" style={styles.centerText}>
          Це самостійне підтвердження віку, а не перевірка особи. Під час
          продажу може знадобитися окрема перевірка.
        </AppText>
      </View>
    </EntryPage>
  );
}

export function RestrictedScreen() {
  const { ready, state, product } = useEntryState();
  const [busy, setBusy] = useState(false);
  if (!ready) return <StartupScreen />;
  if (state.ageStatus !== 'underage')
    return <Redirect href={firstLaunchDestination(state, product)} />;
  async function correct() {
    setBusy(true);
    await correctUnderage();
    setBusy(false);
  }
  return (
    <EntryPage>
      <View style={styles.center}>
        <AppText
          variant="h1"
          accessibilityRole="header"
          style={[styles.centerText, styles.heading]}
        >
          Доступ обмежено
        </AppText>
        <AppText style={styles.centerText} color="textSubtle">
          Beerland призначений для повнолітніх користувачів.
        </AppText>
      </View>
      <View style={styles.actions}>
        <PersistenceError message={state.error} />
        <Button
          label="Обрано помилково? Повернутися"
          variant="outline"
          onPress={() => void correct()}
          loading={busy}
        />
      </View>
    </EntryPage>
  );
}

const slides = [
  {
    title: 'Ваш Beerland завжди поруч',
    description:
      'Знаходьте зручний магазин і переглядайте актуальний асортимент.',
  },
  {
    title: 'Обирайте свій смак',
    description:
      'Розливне, крафтове, новинки та улюблені напої — в одному місці.',
  },
  {
    title: 'Замовляйте, як зручно',
    description: 'Доставка, самовивіз, обране та бонуси Beerland Club.',
  },
] as const;
export function OnboardingScreen() {
  const { ready, state, product } = useEntryState();
  const [page, setPage] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);
  if (!ready) return <StartupScreen />;
  if (
    state.ageStatus !== 'confirmedAdult' ||
    (state.onboardingCompleted && !state.reviewing)
  )
    return <Redirect href={firstLaunchDestination(state, product)} />;
  async function finish() {
    if (state.reviewing) {
      state.setReviewing(false);
      return;
    }
    setBusy(true);
    await completeOnboarding();
    setBusy(false);
  }
  return (
    <EntryPage>
      <View style={styles.top}>
        <AppText variant="label" color="textSubtle">
          Знайомство з Beerland
        </AppText>
        <View
          style={styles.indicators}
          accessibilityLabel={`Сторінка ${page + 1} з 3`}
        >
          {slides.map((_, index) => (
            <View
              key={index}
              testID={`onboarding-indicator-${index + 1}`}
              accessibilityLabel={`Сторінка ${index + 1} з 3${page === index ? ', поточна' : ''}`}
              accessibilityState={{ selected: page === index }}
              style={[
                styles.indicator,
                page === index && styles.indicatorActive,
              ]}
            />
          ))}
        </View>
      </View>
      <View style={styles.slide}>
        <WelcomeIllustration slide={page} />
        <AppText
          variant="h1"
          accessibilityRole="header"
          style={[styles.centerText, styles.heading]}
        >
          {slides[page].title}
        </AppText>
        <AppText color="textSubtle" style={styles.centerText}>
          {slides[page].description}
        </AppText>
      </View>
      <View style={styles.actions}>
        <PersistenceError message={state.error} />
        <Button
          label={
            page === 2
              ? state.reviewing
                ? 'Завершити перегляд'
                : 'Почати'
              : 'Далі'
          }
          variant="accent"
          onPress={() =>
            page === 2 ? void finish() : setPage((page + 1) as 0 | 1 | 2)
          }
          loading={busy}
        />
        {page > 0 && (
          <Button
            label="Назад"
            variant="outline"
            onPress={() => setPage((page - 1) as 0 | 1 | 2)}
            disabled={busy}
          />
        )}
        {page < 2 && (
          <Button
            label={state.reviewing ? 'Закрити перегляд' : 'Пропустити'}
            variant="ghost"
            onPress={() => void finish()}
            disabled={busy}
          />
        )}
      </View>
    </EntryPage>
  );
}

export function GuestEntryScreen() {
  const { ready, state, product } = useEntryState();
  const [busy, setBusy] = useState(false);
  if (!ready) return <StartupScreen />;
  if (
    state.ageStatus !== 'confirmedAdult' ||
    !state.onboardingCompleted ||
    state.guestEntered
  )
    return <Redirect href={firstLaunchDestination(state, product)} />;
  async function enter() {
    setBusy(true);
    await enterAsGuest();
    setBusy(false);
  }
  return (
    <EntryPage>
      <View style={styles.center}>
        <WelcomeIllustration slide={0} />
        <AppText
          variant="h1"
          accessibilityRole="header"
          style={[styles.centerText, styles.heading]}
        >
          Ласкаво просимо до Beerland
        </AppText>
        <AppText color="textSubtle" style={styles.centerText}>
          Можна переглядати асортимент і зберігати вибране без реєстрації. Ваші
          дані залишаться на цьому пристрої.
        </AppText>
      </View>
      <View style={styles.actions}>
        <PersistenceError message={state.error} />
        <Button
          label="Продовжити як гість"
          variant="accent"
          onPress={() => void enter()}
          loading={busy}
        />
      </View>
    </EntryPage>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    minHeight: '100%',
    padding: spacing.xxl,
    justifyContent: 'space-between',
    gap: spacing.xxl,
  },
  top: { gap: spacing.lg },
  center: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  slide: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  centerText: { textAlign: 'center' },
  heading: { color: shopPalette.navy, textTransform: 'uppercase' },
  actions: { gap: spacing.md },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  indicator: {
    width: 28,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  indicatorActive: { backgroundColor: shopPalette.gold },
});

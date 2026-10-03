import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { waitFor } from '@testing-library/react-native';
import RootLayout from '../../app/_layout';
import MainLayout from '../../app/(main)/_layout';
import TabsLayout from '../../app/(main)/(tabs)/_layout';
import Home from '../../app/(main)/(tabs)/index';
import Profile from '../../app/(main)/(tabs)/profile';
import AuthLayout from '../../app/auth/_layout';
import Phone from '../../app/auth/phone';
import Otp from '../../app/auth/otp';
import CompleteProfile from '../../app/auth/complete-profile';
import Merge from '../../app/auth/merge';
import Age from '../../app/age-verification';
import Restricted from '../../app/restricted';
import Onboarding from '../../app/onboarding';
import GuestEntry from '../../app/guest-entry';
import { useFirstLaunchStore } from '@/stores/firstLaunch';
import { useSessionStore } from '@/stores/session';
import { useAuthFlow } from '@/features/auth/flow';
import { repositories } from '@/repositories';
import Favorites from '../../app/(main)/favorites';

jest.mock('@/config/env', () => ({
  config: { demoAuthEnabled: true, dataSource: 'mock' },
}));

const routes = {
  _layout: RootLayout,
  '(main)/_layout': MainLayout,
  '(main)/(tabs)/_layout': TabsLayout,
  '(main)/(tabs)/index': Home,
  '(main)/(tabs)/profile': Profile,
  '(main)/favorites': Favorites,
  'auth/_layout': AuthLayout,
  'auth/phone': Phone,
  'auth/otp': Otp,
  'auth/complete-profile': CompleteProfile,
  'auth/merge': Merge,
  'age-verification': Age,
  restricted: Restricted,
  onboarding: Onboarding,
  'guest-entry': GuestEntry,
};
beforeEach(async () => {
  await AsyncStorage.clear();
  const pending = await repositories.auth.getPendingChallenge();
  if (pending) await repositories.auth.cancelChallenge(pending.id);
  await repositories.auth.signOut();
  useAuthFlow.getState().reset();
  useFirstLaunchStore.setState({
    version: 1,
    ageStatus: 'unknown',
    onboardingCompleted: false,
    guestEntered: false,
    loaded: false,
    reviewing: false,
    error: null,
  });
  useSessionStore.setState({
    status: 'visitor',
    user: null,
    hydrated: false,
    hydrationError: false,
  });
});
test('direct authentication route cannot bypass unknown or underage state', async () => {
  const app = renderRouter(routes, { initialUrl: '/auth/phone' });
  expect(
    await screen.findByRole('header', { name: 'Вам уже виповнилося 18?' }),
  ).toBeOnTheScreen();
  expect(app.getPathname()).toBe('/age-verification');
  fireEvent.press(screen.getByRole('button', { name: 'Ні, мені немає 18' }));
  expect(
    await screen.findByRole('header', { name: 'Доступ обмежено' }),
  ).toBeOnTheScreen();
  expect(app.getPathname()).toBe('/restricted');
  expect(
    screen.queryByRole('header', { name: 'Увійти до Beerland' }),
  ).toBeNull();
});
test('permitted guest can open and leave unified phone flow', async () => {
  const saved = {
    version: 1,
    ageStatus: 'confirmedAdult',
    onboardingCompleted: true,
    guestEntered: true,
  };
  await AsyncStorage.setItem('beerland:first-launch:v1', JSON.stringify(saved));
  const app = renderRouter(routes, { initialUrl: '/auth/phone' });
  expect(
    await screen.findByRole('header', { name: 'Увійти до Beerland' }),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Продовжити як гість' }));
  expect(
    await screen.findByRole('header', { name: 'Ваш профіль' }),
  ).toBeOnTheScreen();
  expect(app.getPathname()).toBe('/profile');
});
test.each(['/auth/complete-profile', '/auth/merge', '/auth/otp'])(
  'guest opening %s is sent to phone verification',
  async (initialUrl) => {
    await AsyncStorage.setItem(
      'beerland:first-launch:v1',
      JSON.stringify({
        version: 1,
        ageStatus: 'confirmedAdult',
        onboardingCompleted: true,
        guestEntered: true,
      }),
    );
    const app = renderRouter(routes, { initialUrl });
    expect(
      await screen.findByRole('header', { name: 'Увійти до Beerland' }),
    ).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/auth/phone');
  },
);
test('pending cart resolution keeps direct auth navigation on the merge screen', async () => {
  await AsyncStorage.setItem(
    'beerland:first-launch:v1',
    JSON.stringify({
      version: 1,
      ageStatus: 'confirmedAdult',
      onboardingCompleted: true,
      guestEntered: true,
    }),
  );
  useAuthFlow.getState().setPendingUser({
    id: 'demo-380501234567',
    phone: '+380501234567',
    name: '',
    needsProfile: true,
    demo: true,
  });
  const app = renderRouter(routes, { initialUrl: '/auth/phone' });
  expect(
    await screen.findByRole('header', { name: 'Узгодити кошик' }),
  ).toBeOnTheScreen();
  expect(app.getPathname()).toBe('/auth/merge');
});

async function allowGuest() {
  await AsyncStorage.setItem(
    'beerland:first-launch:v1',
    JSON.stringify({
      version: 1,
      ageStatus: 'confirmedAdult',
      onboardingCompleted: true,
      guestEntered: true,
    }),
  );
}

test('real router completes OTP, shows the optional profile and returns to Profile', async () => {
  await allowGuest();
  const app = renderRouter(routes, {
    initialUrl: '/auth/phone?returnTo=%2Fprofile',
  });
  fireEvent.changeText(await screen.findByTestId('auth-phone'), '0501112233');
  fireEvent.press(screen.getByRole('button', { name: 'Отримати код' }));
  await waitFor(() => expect(app.getPathname()).toBe('/auth/otp'));
  fireEvent.changeText(screen.getByTestId('auth-otp'), '123456');
  expect(
    await screen.findByRole('header', { name: 'Завершити профіль' }),
  ).toBeOnTheScreen();
  expect(app.getPathname()).toBe('/auth/complete-profile');
  fireEvent.press(screen.getByRole('button', { name: 'Заповнити пізніше' }));
  expect(
    await screen.findByRole('header', { name: 'Ваш профіль' }),
  ).toBeOnTheScreen();
  expect(app.getPathname()).toBe('/profile');
});

test('real router sends a returning account to its requested destination', async () => {
  await allowGuest();
  const challenge = await repositories.auth.requestOtp('0501112233');
  await repositories.auth.verifyOtp(challenge.id, '123456');
  await repositories.auth.updateProfile({ name: 'Тест' });
  await repositories.auth.signOut();
  const app = renderRouter(routes, {
    initialUrl: '/auth/phone?returnTo=%2Ffavorites',
  });
  fireEvent.changeText(await screen.findByTestId('auth-phone'), '0501112233');
  fireEvent.press(screen.getByRole('button', { name: 'Отримати код' }));
  await waitFor(() => expect(app.getPathname()).toBe('/auth/otp'));
  fireEvent.changeText(screen.getByTestId('auth-otp'), '123456');
  expect(
    await screen.findByRole('header', { name: 'Обране' }),
  ).toBeOnTheScreen();
  expect(app.getPathname()).toBe('/favorites');
});

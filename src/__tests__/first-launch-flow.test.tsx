import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';
import RootLayout from '../../app/_layout';
import MainLayout from '../../app/(main)/_layout';
import TabsLayout from '../../app/(main)/(tabs)/_layout';
import Home from '../../app/(main)/(tabs)/index';
import Catalog from '../../app/(main)/(tabs)/catalog';
import Product from '../../app/(main)/product/[id]';
import Settings from '../../app/(main)/settings/index';
import AgeVerification from '../../app/age-verification';
import Restricted from '../../app/restricted';
import Onboarding from '../../app/onboarding';
import GuestEntry from '../../app/guest-entry';
import { useFirstLaunchStore, FIRST_LAUNCH_KEY } from '@/stores/firstLaunch';
import { useSessionStore } from '@/stores/session';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFavoritesStore } from '@/stores/favorites';

const routes = {
  _layout: RootLayout,
  '(main)/_layout': MainLayout,
  '(main)/(tabs)/_layout': TabsLayout,
  '(main)/(tabs)/index': Home,
  '(main)/(tabs)/catalog': Catalog,
  '(main)/product/[id]': Product,
  '(main)/settings/index': Settings,
  'age-verification': AgeVerification,
  restricted: Restricted,
  onboarding: Onboarding,
  'guest-entry': GuestEntry,
};
beforeEach(async () => {
  await AsyncStorage.clear();
  useFirstLaunchStore.setState({
    version: 1,
    ageStatus: 'unknown',
    onboardingCompleted: false,
    guestEntered: false,
    loaded: false,
    reviewing: false,
    error: null,
  });
  useSessionStore.setState({ hydrated: false, status: 'visitor' });
  useSelectedStore.setState({ storeId: null });
  useCartStore.setState({ items: [] });
});

test('fresh launch hides Home, requires age, advances and backs through onboarding, then enters as guest', async () => {
  const app = renderRouter(routes, { initialUrl: '/' });
  expect(screen.queryByRole('header', { name: 'Головна' })).toBeNull();
  expect(screen.getByTestId('first-launch-loading')).toBeOnTheScreen();
  expect(
    await screen.findByRole('header', { name: 'Вам уже виповнилося 18?' }),
  ).toBeOnTheScreen();
  expect(app.getPathname()).toBe('/age-verification');
  fireEvent.press(screen.getByRole('button', { name: 'Так, мені є 18' }));
  expect(
    await screen.findByRole('header', { name: 'Ваш Beerland завжди поруч' }),
  ).toBeOnTheScreen();
  expect(
    screen.getByTestId('onboarding-indicator-1').props.accessibilityState
      .selected,
  ).toBe(true);
  fireEvent.press(screen.getByRole('button', { name: 'Далі' }));
  expect(
    screen.getByRole('header', { name: 'Обирайте свій смак' }),
  ).toBeOnTheScreen();
  expect(
    screen.getByTestId('onboarding-indicator-2').props.accessibilityState
      .selected,
  ).toBe(true);
  fireEvent.press(screen.getByRole('button', { name: 'Назад' }));
  expect(
    screen.getByRole('header', { name: 'Ваш Beerland завжди поруч' }),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Далі' }));
  fireEvent.press(screen.getByRole('button', { name: 'Далі' }));
  expect(
    screen.getByTestId('onboarding-indicator-3').props.accessibilityState
      .selected,
  ).toBe(true);
  fireEvent.press(screen.getByRole('button', { name: 'Почати' }));
  expect(
    await screen.findByRole('button', { name: 'Продовжити як гість' }),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Продовжити як гість' }));
  expect(
    await screen.findByRole('header', { name: 'Головна' }),
  ).toBeOnTheScreen();
  expect(useSessionStore.getState().status).toBe('guest');
  await waitFor(() => expect(app.getPathname()).toBe('/'));
});

test('underage choice remains restricted; accidental choice can be corrected without seeing catalog', async () => {
  const app = renderRouter(routes, { initialUrl: '/catalog' });
  expect(
    await screen.findByRole('header', { name: 'Вам уже виповнилося 18?' }),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Ні, мені немає 18' }));
  expect(
    await screen.findByRole('header', { name: 'Доступ обмежено' }),
  ).toBeOnTheScreen();
  expect(app.getPathname()).toBe('/restricted');
  expect(screen.queryByText('32 товари')).toBeNull();
  expect(
    JSON.parse((await AsyncStorage.getItem(FIRST_LAUNCH_KEY))!).ageStatus,
  ).toBe('underage');
  fireEvent.press(
    screen.getByRole('button', { name: 'Обрано помилково? Повернутися' }),
  );
  expect(
    await screen.findByRole('header', { name: 'Вам уже виповнилося 18?' }),
  ).toBeOnTheScreen();
});

test('skip follows age confirmation and cannot be reached before it', async () => {
  const app = renderRouter(routes, { initialUrl: '/onboarding' });
  expect(
    await screen.findByRole('header', { name: 'Вам уже виповнилося 18?' }),
  ).toBeOnTheScreen();
  expect(app.getPathname()).toBe('/age-verification');
  fireEvent.press(screen.getByRole('button', { name: 'Так, мені є 18' }));
  expect(
    await screen.findByRole('button', { name: 'Пропустити' }),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Пропустити' }));
  expect(
    await screen.findByRole('button', { name: 'Продовжити як гість' }),
  ).toBeOnTheScreen();
  expect(useFirstLaunchStore.getState().ageStatus).toBe('confirmedAdult');
});

test('product deep link waits behind the age gate and resumes after guest entry', async () => {
  const app = renderRouter(routes, { initialUrl: '/product/product-1' });
  expect(screen.queryByRole('header', { name: 'Світлий берег' })).toBeNull();
  expect(
    await screen.findByRole('header', { name: 'Вам уже виповнилося 18?' }),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Так, мені є 18' }));
  fireEvent.press(await screen.findByRole('button', { name: 'Пропустити' }));
  fireEvent.press(
    await screen.findByRole('button', { name: 'Продовжити як гість' }),
  );
  expect(
    await screen.findByRole('header', { name: 'Світлий берег' }),
  ).toBeOnTheScreen();
  expect(app.getPathname()).toBe('/product/product-1');
});

test('reviewing onboarding from Settings leaves age, cart and favorites intact', async () => {
  const completed = {
    version: 1 as const,
    ageStatus: 'confirmedAdult' as const,
    onboardingCompleted: true,
    guestEntered: true,
  };
  await AsyncStorage.setItem(FIRST_LAUNCH_KEY, JSON.stringify(completed));
  useFirstLaunchStore.setState({ ...completed, loaded: true });
  useSessionStore.setState({ hydrated: true, status: 'guest' });
  renderRouter(routes, { initialUrl: '/settings' });
  const review = await screen.findByRole('button', {
    name: 'Переглянути знайомство з Beerland',
  });
  useCartStore.setState({
    items: [{ productId: 'product-1', storeId: 'store-1', quantity: 2 }],
  });
  useFavoritesStore.setState({ productIds: ['product-1'] });
  fireEvent.press(review);
  expect(
    await screen.findByRole('header', { name: 'Ваш Beerland завжди поруч' }),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Закрити перегляд' }));
  expect(useFirstLaunchStore.getState().ageStatus).toBe('confirmedAdult');
  expect(useCartStore.getState().items).toHaveLength(1);
  expect(useFavoritesStore.getState().productIds).toEqual(['product-1']);
});

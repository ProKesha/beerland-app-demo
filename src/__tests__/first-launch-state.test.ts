import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FIRST_LAUNCH_KEY,
  completeOnboarding,
  confirmAdult,
  correctUnderage,
  enterAsGuest,
  hydrateFirstLaunch,
  markUnderage,
  resetFirstLaunchForDevelopment,
  useFirstLaunchStore,
} from '@/stores/firstLaunch';
import { useSessionStore } from '@/stores/session';
import {
  firstLaunchDestination,
  safeProductId,
} from '@/features/firstLaunch/navigation';

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
  useSessionStore.setState({ status: 'visitor', hydrated: false });
});

test('fresh install requires age, then onboarding, then guest entry; completion survives restart', async () => {
  await hydrateFirstLaunch();
  expect(useFirstLaunchStore.getState()).toMatchObject({
    ageStatus: 'unknown',
    onboardingCompleted: false,
    guestEntered: false,
    loaded: true,
  });
  expect(firstLaunchDestination(useFirstLaunchStore.getState())).toMatchObject({
    pathname: '/age-verification',
  });
  expect(await enterAsGuest()).toBe(false);
  expect(await confirmAdult()).toBe(true);
  expect(firstLaunchDestination(useFirstLaunchStore.getState())).toMatchObject({
    pathname: '/onboarding',
  });
  expect(await completeOnboarding()).toBe(true);
  expect(firstLaunchDestination(useFirstLaunchStore.getState())).toMatchObject({
    pathname: '/guest-entry',
  });
  expect(await enterAsGuest()).toBe(true);
  expect(useSessionStore.getState().status).toBe('guest');
  useFirstLaunchStore.setState({
    ageStatus: 'unknown',
    onboardingCompleted: false,
    guestEntered: false,
  });
  await hydrateFirstLaunch();
  expect(useFirstLaunchStore.getState()).toMatchObject({
    ageStatus: 'confirmedAdult',
    onboardingCompleted: true,
    guestEntered: true,
  });
  expect(firstLaunchDestination(useFirstLaunchStore.getState())).toBe('/');
});

test('underage decision persists and accidental selection can be corrected', async () => {
  await hydrateFirstLaunch();
  expect(await markUnderage()).toBe(true);
  useFirstLaunchStore.setState({ ageStatus: 'unknown' });
  await hydrateFirstLaunch();
  expect(useFirstLaunchStore.getState().ageStatus).toBe('underage');
  expect(firstLaunchDestination(useFirstLaunchStore.getState())).toMatchObject({
    pathname: '/restricted',
  });
  expect(await enterAsGuest()).toBe(false);
  expect(await correctUnderage()).toBe(true);
  expect(useFirstLaunchStore.getState().ageStatus).toBe('unknown');
});

test('existing cart, favorites, store, addresses, orders and profile survive age-only migration', async () => {
  const originals = {
    'beerland:cart': JSON.stringify({
      state: {
        items: [{ productId: 'product-1', storeId: 'store-2', quantity: 2 }],
      },
      version: 1,
    }),
    'beerland:favorites': JSON.stringify({
      state: { productIds: ['product-2'] },
      version: 1,
    }),
    'beerland:selected-store': JSON.stringify({
      state: { storeId: 'store-2' },
      version: 1,
    }),
    'beerland:addresses': JSON.stringify({
      state: { addresses: [{ id: 'address-1' }] },
      version: 1,
    }),
    'beerland:mock-orders:v1': JSON.stringify([{ id: 'order-1' }]),
    'beerland:local-profile:v1': JSON.stringify({ name: 'Гість' }),
  };
  for (const [key, value] of Object.entries(originals))
    await AsyncStorage.setItem(key, value);
  await hydrateFirstLaunch();
  expect(useFirstLaunchStore.getState()).toMatchObject({
    ageStatus: 'unknown',
    onboardingCompleted: true,
    guestEntered: true,
  });
  expect(await confirmAdult()).toBe(true);
  expect(firstLaunchDestination(useFirstLaunchStore.getState())).toBe('/');
  for (const [key, value] of Object.entries(originals))
    expect(await AsyncStorage.getItem(key)).toBe(value);
});

test('missing or corrupt age record fails closed even when legacy data exists', async () => {
  await AsyncStorage.setItem(
    'beerland:selected-store',
    JSON.stringify({ state: { storeId: 'store-1' } }),
  );
  await AsyncStorage.setItem(FIRST_LAUNCH_KEY, '{bad json');
  await hydrateFirstLaunch();
  expect(useFirstLaunchStore.getState().ageStatus).toBe('unknown');
  expect(await AsyncStorage.getItem('beerland:selected-store')).not.toBeNull();
});

test('storage failure preserves the age gate and offers a retryable error', async () => {
  const storage = {
    getItem: jest.fn(async () => {
      throw new Error('offline');
    }),
    setItem: jest.fn(async () => {
      throw new Error('offline');
    }),
    removeItem: jest.fn(async () => undefined),
  };
  await hydrateFirstLaunch(storage);
  expect(useFirstLaunchStore.getState().ageStatus).toBe('unknown');
  expect(useFirstLaunchStore.getState().error).toContain(
    'локальні налаштування',
  );
  expect(await confirmAdult(storage)).toBe(false);
  expect(useFirstLaunchStore.getState().ageStatus).toBe('unknown');
  expect(useFirstLaunchStore.getState().error).toContain('Спробуйте ще раз');
});

test('development reset touches only first-launch state and is unavailable in production', async () => {
  await AsyncStorage.setItem('beerland:cart', 'cart-stays');
  await hydrateFirstLaunch();
  await confirmAdult();
  expect(await resetFirstLaunchForDevelopment(AsyncStorage, false)).toBe(false);
  expect(await AsyncStorage.getItem(FIRST_LAUNCH_KEY)).not.toBeNull();
  expect(await resetFirstLaunchForDevelopment(AsyncStorage, true)).toBe(true);
  expect(
    JSON.parse((await AsyncStorage.getItem(FIRST_LAUNCH_KEY))!),
  ).toMatchObject({
    ageStatus: 'unknown',
    onboardingCompleted: false,
    guestEntered: false,
  });
  expect(await AsyncStorage.getItem('beerland:cart')).toBe('cart-stays');
  expect(useFirstLaunchStore.getState().ageStatus).toBe('unknown');
});

test('only an internal product ID can be carried through first-launch navigation', () => {
  expect(safeProductId('product-1')).toBe('product-1');
  expect(safeProductId('https://example.com')).toBeNull();
  expect(safeProductId('../checkout')).toBeNull();
  expect(
    firstLaunchDestination(
      { ageStatus: 'unknown', onboardingCompleted: false, guestEntered: false },
      'product-1',
    ),
  ).toMatchObject({
    pathname: '/age-verification',
    params: { product: 'product-1' },
  });
});

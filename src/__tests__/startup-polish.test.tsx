import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCartStore } from '@/stores/cart';
import { useSessionStore } from '@/stores/session';
import { useAddressStore } from '@/stores/checkout';
import { useFirstLaunchStore, FIRST_LAUNCH_KEY } from '@/stores/firstLaunch';
import { useHydrateStores } from '@/hooks/useHydrateStores';
import { createMockRepositories } from '@/services/mock/repositories';

const allowed = {
  version: 1 as const,
  ageStatus: 'confirmedAdult' as const,
  onboardingCompleted: true,
  guestEntered: true,
};
const readStorage = jest.mocked(AsyncStorage.getItem).getMockImplementation()!;
beforeEach(async () => {
  jest.useRealTimers();
  jest.mocked(AsyncStorage.getItem).mockImplementation(readStorage);
  await AsyncStorage.clear();
  useCartStore.setState({ items: [] });
  useAddressStore.setState({ addresses: [], selectedId: null, seeded: true });
  useSessionStore.setState({
    status: 'visitor',
    user: null,
    hydrated: false,
    hydrationError: false,
    hydrationRetry: 0,
  });
  useFirstLaunchStore.setState({
    ...allowed,
    loaded: false,
    error: null,
    reviewing: false,
  });
  await AsyncStorage.setItem(FIRST_LAUNCH_KEY, JSON.stringify(allowed));
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.mocked(AsyncStorage.getItem).mockImplementation(readStorage);
});

test.each([
  '{broken',
  JSON.stringify({ version: 1, state: { items: [{ quantity: -1 }] } }),
  JSON.stringify({ version: 2, state: { items: [] } }),
])(
  'unusable persisted cart restores defaults and retains the original record for recovery: %s',
  async (raw) => {
    await AsyncStorage.setItem('beerland:cart', raw);
    await useCartStore.persist.rehydrate();
    expect(useCartStore.getState().items).toEqual([]);
    expect(await AsyncStorage.getItem('beerland:cart:recovery:v1')).toBe(raw);
    expect(await AsyncStorage.getItem('beerland:cart')).toBe(raw);
  },
);
test('valid version 1 cart data hydrates without a recovery backup', async () => {
  const items = [{ productId: 'product-1', storeId: 'store-1', quantity: 3 }];
  await AsyncStorage.setItem(
    'beerland:cart',
    JSON.stringify({ version: 1, state: { items } }),
  );
  await useCartStore.persist.rehydrate();
  expect(useCartStore.getState().items).toEqual(items);
  expect(await AsyncStorage.getItem('beerland:cart:recovery:v1')).toBeNull();
});
test('storage read failure blocks partial startup and retry recovers the saved cart', async () => {
  const items = [{ productId: 'product-1', storeId: 'store-1', quantity: 3 }];
  await AsyncStorage.setItem(
    'beerland:cart',
    JSON.stringify({ version: 1, state: { items } }),
  );
  let fail = true;
  jest.spyOn(AsyncStorage, 'getItem').mockImplementation(async (key) => {
    if (key === 'beerland:cart' && fail) throw Error('disk');
    return readStorage(key);
  });
  const r = createMockRepositories();
  renderHook(() => useHydrateStores(r));
  await waitFor(() =>
    expect(useSessionStore.getState().hydrationError).toBe(true),
  );
  expect(useSessionStore.getState().hydrated).toBe(false);
  act(() => {
    fail = false;
    useSessionStore.getState().retryHydration();
  });
  await waitFor(() => expect(useSessionStore.getState().hydrated).toBe(true));
  expect(useSessionStore.getState().hydrationError).toBe(false);
  expect(useCartStore.getState().items).toEqual(items);
});
test('a superseded session restore cannot replace the account restored by a retry', async () => {
  const r = createMockRepositories();
  let resolve!: (
    value: Awaited<ReturnType<typeof r.auth.restoreSession>>,
  ) => void;
  const first = new Promise<Awaited<ReturnType<typeof r.auth.restoreSession>>>(
    (done) => {
      resolve = done;
    },
  );
  const secondUser = {
    id: 'account-b',
    name: 'Б',
    phone: '+380501234568',
    needsProfile: false,
    demo: true as const,
  };
  const restore = jest
    .spyOn(r.auth, 'restoreSession')
    .mockReturnValueOnce(first)
    .mockResolvedValue(secondUser);
  renderHook(() => useHydrateStores(r));
  await waitFor(() => expect(restore).toHaveBeenCalledTimes(1));
  act(() => useSessionStore.getState().retryHydration());
  await waitFor(() =>
    expect(useSessionStore.getState().user?.id).toBe('account-b'),
  );
  await act(async () => resolve({ ...secondUser, id: 'account-a', name: 'А' }));
  expect(useSessionStore.getState().user?.id).toBe('account-b');
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { createMockRepositories } from '@/services/mock/repositories';
import { createSessionAwareRepositories } from '@/repositories/sessionAware';
import {
  completeAuthProfile,
  requestAuthCode,
  resendAuthCode,
  resolveCartConflict,
  signOutOfDemo,
  verifyAuthCode,
} from '@/features/auth/actions';
import {
  activateDemoWorkspace,
  currentWorkspace,
  leaveDemoWorkspace,
} from '@/features/auth/workspace';
import { useAuthFlow } from '@/features/auth/flow';
import { useHydrateStores } from '@/hooks/useHydrateStores';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import { useAddressStore, useCheckoutStore } from '@/stores/checkout';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useFirstLaunchStore, FIRST_LAUNCH_KEY } from '@/stores/firstLaunch';
import { useSessionStore } from '@/stores/session';
import { testOrderInput } from '@/test/checkout';

const guestAddress = {
  id: 'guest-address',
  city: 'Київ',
  street: 'Гостьова',
  building: '1',
};
function setup(authEnabled = true) {
  const base = createMockRepositories({
    authEnabled,
    storage: AsyncStorage,
  });
  return {
    base,
    repositories: createSessionAwareRepositories(base, AsyncStorage),
    client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  };
}
beforeEach(async () => {
  await AsyncStorage.clear();
  useAuthFlow.getState().reset();
  useSessionStore.setState({
    status: 'guest',
    user: null,
    hydrated: true,
    hydrationError: false,
    error: null,
  });
  useFirstLaunchStore.setState({
    version: 1,
    ageStatus: 'confirmedAdult',
    onboardingCompleted: true,
    guestEntered: true,
    loaded: true,
    reviewing: false,
    error: null,
  });
  useCartStore.setState({ items: [] });
  useFavoritesStore.setState({ productIds: [] });
  useAddressStore.setState({ addresses: [], selectedId: null, seeded: true });
  useCheckoutStore.getState().reset();
  useSelectedStore.setState({ storeId: null });
  useFulfillmentStore.setState({ method: 'pickup' });
});
afterEach(() => jest.restoreAllMocks());
test('guest login, profile, orders, restart, logout and second account stay isolated', async () => {
  const { base, repositories, client } = setup();
  useCartStore.setState({
    items: [{ productId: 'product-1', storeId: 'store-1', quantity: 2 }],
  });
  useFavoritesStore.setState({ productIds: ['product-1'] });
  useAddressStore.setState({
    addresses: [guestAddress],
    selectedId: guestAddress.id,
    seeded: true,
  });
  useSelectedStore.setState({ storeId: 'store-1' });
  useCheckoutStore.getState().update({
    customer: { name: 'Гість', phone: '0501234567', email: '' },
  });
  const guestOrder = await repositories.orders.create(
    await testOrderInput(base),
  );
  expect(await requestAuthCode(repositories, '0501234567')).toBe(true);
  expect(await verifyAuthCode(repositories, client, '000000')).toBe(false);
  expect(useAuthFlow.getState().error).toBe(
    'Неправильний код. Спробуйте ще раз.',
  );
  expect(await verifyAuthCode(repositories, client, '123456')).toBe(true);
  expect(useSessionStore.getState().status).toBe('authenticated');
  expect(useCartStore.getState().items).toHaveLength(1);
  expect(useFavoritesStore.getState().productIds).toContain('product-1');
  expect(useAddressStore.getState().addresses).toContainEqual(guestAddress);
  expect(useCheckoutStore.getState().customer.name).toBe('');
  expect((await repositories.orders.list()).map((order) => order.id)).toContain(
    guestOrder.id,
  );
  expect(
    await completeAuthProfile(repositories, client, {
      name: 'Олена',
      email: 'olena@example.com',
    }),
  ).toBe(true);
  useAddressStore.setState({
    addresses: [
      ...useAddressStore.getState().addresses,
      {
        id: 'private-a',
        city: 'Львів',
        street: 'Приватна',
        building: '2',
      },
    ],
  });
  useCheckoutStore.getState().update({
    customer: { name: 'Олена', phone: '0501234567', email: '' },
  });
  await AsyncStorage.setItem(
    FIRST_LAUNCH_KEY,
    JSON.stringify({
      version: 1,
      ageStatus: 'confirmedAdult',
      onboardingCompleted: true,
      guestEntered: true,
    }),
  );
  useSessionStore.setState({ status: 'visitor', user: null, hydrated: false });
  useFirstLaunchStore.setState({ loaded: false });
  const restarted = setup();
  const { unmount } = renderHook(() =>
    useHydrateStores(restarted.repositories),
  );
  await waitFor(() =>
    expect(useSessionStore.getState().status).toBe('authenticated'),
  );
  expect(useSessionStore.getState().user?.name).toBe('Олена');
  expect(
    (await restarted.repositories.orders.list()).map((order) => order.id),
  ).toContain(guestOrder.id);
  unmount();
  expect(await signOutOfDemo(restarted.repositories, restarted.client)).toBe(
    true,
  );
  expect(useSessionStore.getState().status).toBe('guest');
  expect(useCartStore.getState().items[0].quantity).toBe(2);
  expect(useCheckoutStore.getState().customer.name).toBe('Гість');
  expect(useAddressStore.getState().addresses).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ id: 'private-a' })]),
  );
  expect(await restarted.repositories.orders.getById(guestOrder.id)).toBeNull();
  expect(await requestAuthCode(restarted.repositories, '0501234568')).toBe(
    true,
  );
  expect(
    await verifyAuthCode(restarted.repositories, restarted.client, '123456'),
  ).toBe(true);
  expect((await restarted.repositories.users.getCurrent())?.name).toBe('');
  expect(useCheckoutStore.getState().customer.name).toBe('');
  expect(useAddressStore.getState().addresses).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ id: 'private-a' })]),
  );
  expect(await restarted.repositories.orders.getById(guestOrder.id)).toBeNull();
});

test('a real cart conflict requires a choice and preserves the guest cart', async () => {
  const { repositories, client } = setup();
  const accountId = 'demo-380501234567';
  await activateDemoWorkspace(accountId, repositories);
  useCartStore.setState({
    items: [{ productId: 'product-1', storeId: 'store-2', quantity: 2 }],
  });
  await leaveDemoWorkspace(accountId);
  useCartStore.setState({
    items: [{ productId: 'product-1', storeId: 'store-1', quantity: 1 }],
  });
  expect(await requestAuthCode(repositories, '0501234567')).toBe(true);
  expect(await verifyAuthCode(repositories, client, '123456')).toBe(false);
  expect(useAuthFlow.getState().pendingUser?.id).toBe(accountId);
  expect(useSessionStore.getState().status).toBe('guest');
  expect(useCartStore.getState().items[0].storeId).toBe('store-1');
  expect(await resolveCartConflict(repositories, client, 'separate')).toBe(
    true,
  );
  expect(useSessionStore.getState().status).toBe('authenticated');
  expect(useCartStore.getState().items[0].storeId).toBe('store-2');
  await signOutOfDemo(repositories, client);
  expect(useCartStore.getState().items[0].storeId).toBe('store-1');
  useCartStore.getState().setQuantity('product-1', 'store-1', 2);
  expect(await requestAuthCode(repositories, '0501234567')).toBe(true);
  expect(await verifyAuthCode(repositories, client, '123456')).toBe(false);
  expect(await resolveCartConflict(repositories, client, 'transfer')).toBe(
    true,
  );
  expect(useCartStore.getState().items).toEqual([
    { productId: 'product-1', storeId: 'store-2', quantity: 3 },
  ]);
});
test('failed sign-out leaves the account workspace and session together', async () => {
  const { repositories, client } = setup();
  useCartStore.setState({
    items: [{ productId: 'product-1', storeId: 'store-1', quantity: 1 }],
  });
  await requestAuthCode(repositories, '0501234567');
  await verifyAuthCode(repositories, client, '123456');
  useCartStore.getState().setQuantity('product-1', 'store-1', 2);
  jest.spyOn(repositories.auth, 'signOut').mockRejectedValueOnce(Error('disk'));
  expect(await signOutOfDemo(repositories, client)).toBe(false);
  expect(useSessionStore.getState().status).toBe('authenticated');
  expect(useCartStore.getState().items[0].quantity).toBe(2);
  expect(await repositories.auth.restoreSession()).not.toBeNull();
});

async function saveAdultEntry() {
  await AsyncStorage.setItem(
    FIRST_LAUNCH_KEY,
    JSON.stringify({
      version: 1,
      ageStatus: 'confirmedAdult',
      onboardingCompleted: true,
      guestEntered: true,
    }),
  );
}

test('interrupted sign-in blocks guest access and startup retries the completed OTP', async () => {
  const { base, repositories, client } = setup();
  await saveAdultEntry();
  const order = await repositories.orders.create(await testOrderInput(base));
  await requestAuthCode(repositories, '0501234567');
  const list = jest
    .spyOn(repositories.orders, 'list')
    .mockRejectedValueOnce(Error('disk'));
  expect(await verifyAuthCode(repositories, client, '123456')).toBe(false);
  expect(useSessionStore.getState().hydrated).toBe(false);
  expect(useSessionStore.getState().hydrationError).toBe(true);
  list.mockRestore();
  const { unmount } = renderHook(() => useHydrateStores(repositories));
  await waitFor(() =>
    expect(useSessionStore.getState().status).toBe('authenticated'),
  );
  expect(useSessionStore.getState().hydrated).toBe(true);
  expect((await repositories.orders.list()).map((item) => item.id)).toContain(
    order.id,
  );
  unmount();
});

test.each(['expired', 'disabled'] as const)(
  '%s session restores the original guest workspace after a restart',
  async (reason) => {
    const { repositories, client } = setup();
    await saveAdultEntry();
    useFavoritesStore.setState({ productIds: ['product-1'] });
    const guest = currentWorkspace();
    await requestAuthCode(repositories, '0501234567');
    await verifyAuthCode(repositories, client, '123456');
    useFavoritesStore.getState().toggle('product-2');
    useAddressStore.getState().save({ ...guestAddress, id: 'private-a' });
    if (reason === 'expired')
      await repositories.auth.development!.expireSession();
    useSessionStore.setState({
      status: 'visitor',
      user: null,
      hydrated: false,
    });
    const restarted = setup(reason !== 'disabled');
    const { unmount } = renderHook(() =>
      useHydrateStores(restarted.repositories),
    );
    await waitFor(() => expect(useSessionStore.getState().hydrated).toBe(true));
    expect(useSessionStore.getState().status).toBe('guest');
    expect(useSessionStore.getState().user).toBeNull();
    expect(currentWorkspace()).toEqual(guest);
    unmount();
  },
);

test('resend actions reject the countdown, replace the challenge and prevent OTP replay', async () => {
  const { repositories, client } = setup();
  await requestAuthCode(repositories, '0501234567');
  const original = useAuthFlow.getState().challenge!;
  expect(await resendAuthCode(repositories)).toBe(false);
  expect(useAuthFlow.getState().challenge?.id).toBe(original.id);
  await repositories.auth.development!.allowResend();
  useAuthFlow
    .getState()
    .setChallenge(await repositories.auth.getPendingChallenge());
  expect(await resendAuthCode(repositories)).toBe(true);
  expect(useAuthFlow.getState().challenge?.id).not.toBe(original.id);
  await expect(
    repositories.auth.verifyOtp(original.id, '123456'),
  ).rejects.toMatchObject({ code: 'invalidChallenge' });
  const current = useAuthFlow.getState().challenge!;
  expect(await verifyAuthCode(repositories, client, '123456')).toBe(true);
  await expect(
    repositories.auth.verifyOtp(current.id, '123456'),
  ).rejects.toMatchObject({ code: 'invalidChallenge' });
});

test('failed guest recovery after logout blocks protected screens', async () => {
  const { repositories, client } = setup();
  await requestAuthCode(repositories, '0501234567');
  await verifyAuthCode(repositories, client, '123456');
  await AsyncStorage.setItem('beerland:demo-workspace-guest:v1', '{bad');
  expect(await signOutOfDemo(repositories, client)).toBe(false);
  expect(await repositories.auth.restoreSession()).toBeNull();
  expect(useSessionStore.getState().hydrated).toBe(false);
  expect(useSessionStore.getState().hydrationError).toBe(true);
});

test.each(['unknown', 'underage'] as const)(
  'a restarted %s age gate cannot leave account data in the guest workspace',
  async (ageStatus) => {
    const { repositories, client } = setup();
    const guest = currentWorkspace();
    await requestAuthCode(repositories, '0501234567');
    await verifyAuthCode(repositories, client, '123456');
    useAddressStore.getState().save({ ...guestAddress, id: 'private-a' });
    await AsyncStorage.setItem(
      FIRST_LAUNCH_KEY,
      JSON.stringify({
        version: 1,
        ageStatus,
        onboardingCompleted: false,
        guestEntered: false,
      }),
    );
    useSessionStore.setState({
      status: 'visitor',
      user: null,
      hydrated: false,
    });
    const restored = jest.spyOn(repositories.auth, 'restoreSession');
    const { unmount } = renderHook(() => useHydrateStores(repositories));
    await waitFor(() => expect(useSessionStore.getState().hydrated).toBe(true));
    expect(restored).not.toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe('visitor');
    expect(currentWorkspace()).toEqual(guest);
    unmount();
  },
);

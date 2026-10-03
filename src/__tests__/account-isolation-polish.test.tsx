import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { useUser, useLoyalty, useOrders } from '@/features/profile/queries';
import { useOrder } from '@/features/orders/useOrder';
import { PersonalScreen } from '@/features/profile/PersonalScreen';
import { CheckoutScreen } from '@/features/checkout/CheckoutScreen';
import { createMockRepositories } from '@/services/mock/repositories';
import { createSessionAwareRepositories } from '@/repositories/sessionAware';
import {
  activateDemoWorkspace,
  currentWorkspace,
} from '@/features/auth/workspace';
import { createDiscoveryWrapper } from '@/test/createDiscoveryWrapper';
import { useSessionStore } from '@/stores/session';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useAddressStore, useCheckoutStore } from '@/stores/checkout';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { testOrderInput } from '@/test/checkout';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));
const account = (id: string) => ({
  id,
  phone: '+380501234567',
  name: id,
  needsProfile: false,
  demo: true as const,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(async () => {
  await AsyncStorage.clear();
  useSessionStore.setState({ status: 'guest', user: null, hydrated: true });
  useCartStore.setState({
    items: [{ productId: 'product-1', storeId: 'store-1', quantity: 1 }],
  });
  useSelectedStore.setState({ storeId: 'store-1' });
  useAddressStore.setState({ addresses: [], selectedId: null, seeded: true });
  useFulfillmentStore.setState({ method: 'pickup' });
  useCheckoutStore.getState().reset();
});
afterEach(() => jest.restoreAllMocks());

test('late private profile and loyalty responses cannot populate another owner’s cache', async () => {
  const r = createMockRepositories();
  const user = deferred<Awaited<ReturnType<typeof r.users.getCurrent>>>();
  const loyalty = deferred<Awaited<ReturnType<typeof r.loyalty.getCurrent>>>();
  const firstUser = (await r.users.getCurrent())!;
  const firstClub = (await r.loyalty.getCurrent())!;
  const getUser = jest
    .spyOn(r.users, 'getCurrent')
    .mockImplementation(() =>
      useSessionStore.getState().user?.id === 'a'
        ? user.promise
        : Promise.resolve(null),
    );
  jest
    .spyOn(r.loyalty, 'getCurrent')
    .mockImplementation(() =>
      useSessionStore.getState().user?.id === 'a'
        ? loyalty.promise
        : Promise.resolve(null),
    );
  useSessionStore.getState().setAuthenticated(account('a'));
  const { wrapper, client } = createDiscoveryWrapper(r);
  const hook = renderHook(() => ({ user: useUser(), loyalty: useLoyalty() }), {
    wrapper,
  });
  await waitFor(() => expect(getUser).toHaveBeenCalledTimes(1));
  act(() => useSessionStore.getState().setAuthenticated(account('b')));
  await waitFor(() => expect(hook.result.current.user.isSuccess).toBe(true));
  await act(async () => {
    user.resolve(firstUser);
    loyalty.resolve(firstClub);
  });
  expect(hook.result.current.user.data).toBeNull();
  expect(hook.result.current.loyalty.data).toBeNull();
  expect(client.getQueryData(['account', 'user', 'b'])).toBeNull();
  expect(client.getQueryData(['account', 'loyalty', 'b'])).toBeNull();
});
test('a late order detail response cannot reveal the former owner’s receipt', async () => {
  const r = createMockRepositories();
  const order = await r.orders.create(await testOrderInput(r));
  const pending = deferred<typeof order | null>();
  const getOrder = jest
    .spyOn(r.orders, 'getById')
    .mockImplementation(() =>
      useSessionStore.getState().user?.id === 'a'
        ? pending.promise
        : Promise.resolve(null),
    );
  useSessionStore.getState().setAuthenticated(account('a'));
  const { wrapper, client } = createDiscoveryWrapper(r);
  const hook = renderHook(() => useOrder(order.id), { wrapper });
  await waitFor(() => expect(getOrder).toHaveBeenCalledTimes(1));
  act(() => useSessionStore.getState().setAuthenticated(account('b')));
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  await act(async () => pending.resolve(order));
  expect(hook.result.current.data).toBeNull();
  expect(client.getQueryData(['orders', 'detail', order.id, 'b'])).toBeNull();
});
test('switching owners immediately clears cached order history before the next read', async () => {
  const r = createMockRepositories();
  const order = await r.orders.create(await testOrderInput(r));
  jest
    .spyOn(r.orders, 'list')
    .mockImplementation(() =>
      Promise.resolve(
        useSessionStore.getState().user?.id === 'a' ? [order] : [],
      ),
    );
  useSessionStore.getState().setAuthenticated(account('a'));
  const hook = renderHook(() => useOrders(), {
    wrapper: createDiscoveryWrapper(r).wrapper,
  });
  await waitFor(() => expect(hook.result.current.data).toEqual([order]));
  act(() => useSessionStore.getState().clearAuth());
  expect(hook.result.current.data).not.toEqual([order]);
  await waitFor(() => expect(hook.result.current.data).toEqual([]));
});
test('mounted personal forms clear unsaved fields when the account changes', async () => {
  const r = createMockRepositories();
  jest.spyOn(r.users, 'getCurrent').mockImplementation(() =>
    Promise.resolve({
      id: useSessionStore.getState().user!.id,
      name: useSessionStore.getState().user!.name,
      phone: '+380501234567',
      addresses: [],
    }),
  );
  useSessionStore.getState().setAuthenticated(account('a'));
  render(<PersonalScreen />, { wrapper: createDiscoveryWrapper(r).wrapper });
  fireEvent.changeText(
    await screen.findByTestId('personal-name'),
    'Приватна чернетка',
  );
  act(() => useSessionStore.getState().setAuthenticated(account('b')));
  await waitFor(() =>
    expect(screen.getByTestId('personal-name')).toHaveDisplayValue('b'),
  );
  expect(screen.queryByDisplayValue('Приватна чернетка')).toBeNull();
});
test('mounted checkout forms clear account-owned contacts when the account changes', async () => {
  const r = createMockRepositories();
  useSessionStore.getState().setAuthenticated(account('a'));
  render(<CheckoutScreen />, { wrapper: createDiscoveryWrapper(r).wrapper });
  fireEvent.changeText(
    await screen.findByTestId('customer-name'),
    'Приватний контакт',
  );
  act(() => {
    useCheckoutStore.getState().reset();
    useSessionStore.getState().setAuthenticated(account('b'));
  });
  await waitFor(() =>
    expect(screen.getByTestId('customer-name')).not.toHaveDisplayValue(
      'Приватний контакт',
    ),
  );
});
test('a missing ownership ledger after an account handoff fails closed for guest orders', async () => {
  const base = createMockRepositories({ storage: AsyncStorage });
  const r = createSessionAwareRepositories(base, AsyncStorage);
  await r.orders.create(await testOrderInput(base));
  await activateDemoWorkspace('a', r);
  expect(
    await AsyncStorage.getItem('beerland:demo-order-owners:v1'),
  ).not.toBeNull();
  await AsyncStorage.removeItem('beerland:demo-order-owners:v1');
  await expect(r.orders.list()).rejects.toMatchObject({ code: 'service' });
  await expect(r.orders.getById('order-1')).rejects.toMatchObject({
    code: 'service',
  });
  const snapshot = currentWorkspace();
  await expect(activateDemoWorkspace('b', r)).rejects.toMatchObject({
    code: 'service',
  });
  expect(currentWorkspace()).toEqual(snapshot);
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyManager, type QueryClient } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';
import { CartScreen } from '@/features/cart/CartScreen';
import type { Repositories } from '@/repositories/contracts';
import { createMockRepositories } from '@/services/mock/repositories';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import { checkoutItem } from '@/test/checkout';
import { createDiscoveryWrapper } from '@/test/createDiscoveryWrapper';
import type { Product } from '@/types/domain';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const clients: QueryClient[] = [];
const items = [
  { ...checkoutItem, quantity: 1 },
  { ...checkoutItem, variantId: '1000-ml', quantity: 2 },
];

function setup(repositories: Repositories = createMockRepositories()) {
  const { wrapper, client } = createDiscoveryWrapper(repositories);
  clients.push(client);
  return render(<CartScreen />, { wrapper });
}

function requestClear() {
  fireEvent.press(screen.getByRole('button', { name: 'Очистити кошик' }));
}

function confirmClear() {
  fireEvent.press(screen.getByTestId('cart-clear-confirm'));
}

function pendingProduct() {
  let resolve!: (product: Product | null) => void;
  const promise = new Promise<Product | null>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

beforeAll(() => {
  notifyManager.setNotifyFunction((notify) => act(notify));
});

afterAll(() => {
  notifyManager.setNotifyFunction((notify) => notify());
});

beforeEach(async () => {
  jest.clearAllMocks();
  useCartStore.setState({ items });
  useFavoritesStore.setState({ productIds: ['product-1'] });
  useSelectedStore.setState({ storeId: 'store-1' });
  useFulfillmentStore.setState({ method: 'pickup' });
  useSessionStore.setState({ hydrated: true, status: 'guest', user: null });
  await AsyncStorage.clear();
});

afterEach(async () => {
  await waitFor(() => {
    clients.forEach((client) => expect(client.isFetching()).toBe(0));
  });
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  useCartStore.getState().clear();
  useFavoritesStore.getState().clear();
  useSelectedStore.setState({ storeId: null });
  useFulfillmentStore.setState({ method: 'pickup' });
  useSessionStore.setState({ hydrated: false, status: 'guest', user: null });
  jest.restoreAllMocks();
});

test('canceling or closing clear confirmation preserves every cart position', async () => {
  setup();
  await screen.findByTestId('cart-checkout');
  requestClear();
  expect(screen.getByText('Очистити кошик?')).toBeOnTheScreen();
  expect(useCartStore.getState().items).toEqual(items);
  fireEvent.press(screen.getByTestId('cart-clear-cancel'));
  expect(screen.queryByText('Очистити кошик?')).toBeNull();
  expect(useCartStore.getState().items).toEqual(items);
  expect(screen.getByTestId('cart-checkout')).toBeOnTheScreen();

  requestClear();
  fireEvent.press(screen.getByRole('button', { name: 'Закрити вікно' }));
  expect(screen.queryByText('Очистити кошик?')).toBeNull();
  expect(useCartStore.getState().items).toEqual(items);
});

test('confirmed clearing persists an empty cart and immediately updates checkout and badge', async () => {
  setup();
  await screen.findByTestId('cart-checkout');
  expect(
    screen.getByTestId('cart-icon-badge', { includeHiddenElements: true }),
  ).toHaveTextContent('2');
  requestClear();
  confirmClear();

  expect(useCartStore.getState().items).toEqual([]);
  expect(screen.getByText('У кошику поки порожньо')).toBeOnTheScreen();
  expect(screen.queryByTestId('cart-checkout')).toBeNull();
  expect(screen.queryByTestId('cart-clear')).toBeNull();
  expect(screen.queryByText('Очистити кошик?')).toBeNull();
  expect(
    screen.queryByTestId('cart-icon-badge', { includeHiddenElements: true }),
  ).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Кошик, порожній' }),
  ).toBeOnTheScreen();
  expect(useFavoritesStore.getState().productIds).toEqual(['product-1']);
  expect(useSelectedStore.getState().storeId).toBe('store-1');
  expect(useFulfillmentStore.getState().method).toBe('pickup');

  await waitFor(async () => {
    expect(JSON.parse((await AsyncStorage.getItem('beerland:cart'))!)).toEqual({
      state: { items: [] },
      version: 1,
    });
  });
  await act(() => useCartStore.persist.rehydrate());
  expect(useCartStore.getState().items).toEqual([]);
  fireEvent.press(screen.getByRole('button', { name: 'Перейти до каталогу' }));
  expect(router.push).toHaveBeenCalledWith('/catalog');
});

test('clearing remains available while cart prices are loading', async () => {
  const repositories = createMockRepositories();
  const product = await repositories.products.getById('product-1');
  const pending = pendingProduct();
  const getProduct = jest
    .spyOn(repositories.products, 'getById')
    .mockReturnValue(pending.promise);
  setup(repositories);
  await waitFor(() => expect(getProduct).toHaveBeenCalled());
  expect(screen.queryByTestId('cart-checkout')).toBeNull();
  requestClear();
  confirmClear();
  expect(screen.getByText('У кошику поки порожньо')).toBeOnTheScreen();
  await act(async () => pending.resolve(product));
  expect(useCartStore.getState().items).toEqual([]);
});

test('repository errors do not prevent clearing the cart', async () => {
  const repositories = createMockRepositories();
  jest
    .spyOn(repositories.products, 'getById')
    .mockRejectedValue(new Error('offline'));
  setup(repositories);
  await screen.findByRole('button', { name: 'Повторити' });
  requestClear();
  confirmClear();
  expect(useCartStore.getState().items).toEqual([]);
  expect(screen.getByText('У кошику поки порожньо')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Повторити' })).toBeNull();
});

test('a cleared cart cannot navigate to checkout when an inventory recheck finishes', async () => {
  const repositories = createMockRepositories();
  const product = await repositories.products.getById('product-1');
  setup(repositories);
  await screen.findByTestId('cart-checkout');
  const pending = pendingProduct();
  const getProduct = jest
    .spyOn(repositories.products, 'getById')
    .mockReturnValue(pending.promise);
  fireEvent.press(screen.getByTestId('cart-checkout'));
  await waitFor(() => expect(getProduct).toHaveBeenCalled());
  expect(screen.getByTestId('cart-clear')).toBeEnabled();
  requestClear();
  confirmClear();
  await act(async () => pending.resolve(product));
  expect(router.push).not.toHaveBeenCalled();
  expect(screen.queryByTestId('cart-checkout')).toBeNull();
  expect(screen.getByText('У кошику поки порожньо')).toBeOnTheScreen();
});

test('changing the session owner closes an old confirmation and preserves the replacement cart', async () => {
  setup();
  await screen.findByTestId('cart-checkout');
  requestClear();
  const replacement = [{ ...checkoutItem, quantity: 4 }];
  act(() => {
    useCartStore.setState({ items: replacement });
    useSessionStore.setState({
      status: 'authenticated',
      user: {
        id: 'other-account',
        phone: '+380501234567',
        name: 'Тестовий покупець',
        needsProfile: false,
        demo: true,
      },
    });
  });
  expect(screen.queryByText('Очистити кошик?')).toBeNull();
  expect(useCartStore.getState().items).toEqual(replacement);
  requestClear();
  fireEvent.press(screen.getByTestId('cart-clear-cancel'));
  expect(useCartStore.getState().items).toEqual(replacement);
});

test('the clear action stays hidden until hydration and for an empty cart', () => {
  useSessionStore.setState({ hydrated: false });
  setup();
  expect(screen.queryByTestId('cart-clear')).toBeNull();
  act(() => {
    useCartStore.getState().clear();
    useSessionStore.setState({ hydrated: true });
  });
  expect(screen.getByText('У кошику поки порожньо')).toBeOnTheScreen();
  expect(screen.queryByTestId('cart-clear')).toBeNull();
});

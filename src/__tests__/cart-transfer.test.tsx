import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { StorePicker } from '@/features/home/components/StoreSelectorCard';
import { CartScreen } from '@/features/cart/CartScreen';
import { prepareCartTransfer } from '@/features/cart/transfer';
import { fetchCartQuote } from '@/features/cart/useCartQuote';
import { productVariants, variantOffer } from '@/features/product/variants';
import { createMockRepositories } from '@/services/mock/repositories';
import { createDiscoveryWrapper } from '@/test/createDiscoveryWrapper';
import { ToastRegion } from '@/components/ui/Toast';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useSessionStore } from '@/stores/session';
import { reconcileCartStore } from '@/stores/cartTransfer';
import type { CartItem, Product } from '@/types/domain';
import type { Repositories } from '@/repositories/contracts';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));
const first: CartItem = {
  productId: 'product-1',
  variantId: '1000-ml',
  storeId: 'store-1',
  quantity: 2,
};
const second: CartItem = {
  productId: 'product-2',
  storeId: 'store-1',
  quantity: 1,
};
async function picker(repos: Repositories = createMockRepositories()) {
  const stores = await repos.stores.list();
  const onSelect = jest.fn();
  render(
    <>
      <StorePicker
        visible
        stores={stores}
        selectedId="store-1"
        onSelect={onSelect}
        onClose={jest.fn()}
      />
      <ToastRegion />
    </>,
    { wrapper: createDiscoveryWrapper(repos).wrapper },
  );
  return { onSelect };
}
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useSessionStore.setState({ hydrated: true });
  useSelectedStore.setState({ storeId: 'store-1' });
  useCartStore.setState({ items: [] });
  useFulfillmentStore.setState({ method: 'pickup' });
});

test('empty cart switches immediately; selecting active store is a state no-op', async () => {
  const { onSelect } = await picker();
  const initial = useSelectedStore.getState();
  fireEvent.press(screen.getByLabelText('Обрати магазин: Beerland Демо 1'));
  expect(useSelectedStore.getState()).toBe(initial);
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Обрати магазин: Beerland Демо 2'));
  expect(useSelectedStore.getState().storeId).toBe('store-2');
  expect(useCartStore.getState().items).toEqual([]);
});

test('cancel leaves store, variant identities and quantities untouched', async () => {
  useCartStore.setState({ items: [first, second] });
  const { onSelect } = await picker();
  fireEvent.press(screen.getByLabelText('Обрати магазин: Beerland Демо 2'));
  expect(screen.getByText('Змінити магазин?')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Скасувати' }));
  expect(useCartStore.getState().items).toEqual([first, second]);
  expect(useSelectedStore.getState().storeId).toBe('store-1');
  expect(onSelect).not.toHaveBeenCalled();
});

test('transfer preserves lines and variants, updates price, and blocks unsupported delivery', async () => {
  const repos = createMockRepositories();
  useCartStore.setState({ items: [first] });
  useFulfillmentStore.setState({ method: 'delivery' });
  const old = await fetchCartQuote(repos, [first], 'store-1', 'delivery');
  const { onSelect } = await picker(repos);
  fireEvent.press(screen.getByLabelText('Обрати магазин: Beerland Демо 2'));
  fireEvent.press(screen.getByRole('button', { name: 'Перенести кошик' }));
  await waitFor(() =>
    expect(useSelectedStore.getState().storeId).toBe('store-2'),
  );
  expect(useCartStore.getState().items).toEqual([
    { ...first, storeId: 'store-2' },
  ]);
  expect(onSelect).toHaveBeenCalledTimes(1);
  const next = await fetchCartQuote(
    repos,
    useCartStore.getState().items,
    'store-2',
    'delivery',
  );
  expect(next.lines[0].unitPrice.amount).not.toBe(
    old.lines[0].unitPrice.amount,
  );
  expect(next.fulfillmentAvailable).toBe(false);
  expect(next.canCheckout).toBe(false);
  expect(
    screen.getByText(/Обраний спосіб отримання недоступний/),
  ).toBeOnTheScreen();
});

test('missing and unavailable lines remain visible and block checkout', async () => {
  const repos = createMockRepositories();
  const original = repos.products.getById;
  repos.products.getById = async (id, options) =>
    id === 'product-2' ? null : original(id, options);
  const items = [first, second];
  const prepared = await prepareCartTransfer(items, 'store-2', 'pickup', repos);
  expect(prepared.items).toEqual(
    items.map((item) => ({ ...item, storeId: 'store-2' })),
  );
  expect(prepared.quote.lines[1].issue).toBeTruthy();
  expect(prepared.quote.canCheckout).toBe(false);
  useCartStore.setState({ items: prepared.items });
  useSelectedStore.setState({ storeId: 'store-2' });
  render(<CartScreen />, { wrapper: createDiscoveryWrapper(repos).wrapper });
  expect(await screen.findByText('Товар більше недоступний')).toBeOnTheScreen();
  expect(screen.getByText('Немає в обраному магазині')).toBeOnTheScreen();
  expect(screen.getByTestId('cart-checkout')).toBeDisabled();
  expect(screen.getByText(/Сума неповна/)).toBeOnTheScreen();
});

test('missing variant and quantity limit preserve requested quantities and block checkout', async () => {
  const repos = createMockRepositories();
  const original = repos.products.getById;
  repos.products.getById = async (id, options) => {
    const product = await original(id, options);
    if (!product || id !== 'product-1') return product;
    return {
      ...product,
      variants: product.variants?.map((variant) =>
        variant.id === '1000-ml'
          ? {
              ...variant,
              storeOffers: [
                ...(variant.storeOffers ?? []).filter(
                  (offer) => offer.storeId !== 'store-2',
                ),
                {
                  storeId: 'store-2',
                  availability: 'available' as const,
                  maxQuantity: 1,
                },
              ],
            }
          : variant,
      ),
    };
  };
  const prepared = await prepareCartTransfer(
    [first, { ...first, variantId: 'deleted' }],
    'store-2',
    'pickup',
    repos,
  );
  expect(prepared.items.map((item) => item.quantity)).toEqual([2, 2]);
  expect(prepared.quote.lines[0].issue).toContain('Зменште кількість');
  expect(prepared.quote.lines[1].issue).toBe('Обраного варіанта більше немає');
  expect(prepared.quote.canCheckout).toBe(false);
});

test('unavailable target variant remains visible and an available variant can replace it', async () => {
  const repo = createMockRepositories();
  const item: CartItem = {
    productId: 'product-1',
    variantId: '1500-ml',
    storeId: 'store-2',
    quantity: 1,
  };
  const prepared = await prepareCartTransfer([item], 'store-1', 'pickup', repo);
  expect(prepared.items).toEqual([{ ...item, storeId: 'store-1' }]);
  expect(prepared.quote.lines[0].issue).toBe('Немає в обраному магазині');
  useCartStore.setState({ items: prepared.items });
  useSelectedStore.setState({ storeId: 'store-1' });
  render(<CartScreen />, { wrapper: createDiscoveryWrapper(repo).wrapper });
  expect(
    await screen.findByText('Немає в обраному магазині'),
  ).toBeOnTheScreen();
  expect(screen.getByTestId('cart-checkout')).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Замінити на 500 мл' }));
  expect(useCartStore.getState().items).toEqual([
    { ...item, variantId: 'default', storeId: 'store-1' },
  ]);
  await waitFor(() =>
    expect(screen.getByTestId('cart-checkout')).toBeEnabled(),
  );
});

test('Demo 2-only Бурштиновий вечір 500 мл remains in the cart until removed in Demo 1', async () => {
  const repos = createMockRepositories();
  const product = await repos.products.getById('product-2');
  expect(product?.name).toBe('Бурштиновий вечір');
  const variant = productVariants(product!).find(
    (item) => item.id === 'default',
  );
  expect(variant?.volume).toEqual({ value: 500, unit: 'ml' });
  expect(variantOffer(product!, variant!, 'store-2').availability).toBe(
    'available',
  );
  expect(variantOffer(product!, variant!, 'store-1').availability).toBe(
    'unavailable',
  );

  const unavailableItem: CartItem = {
    productId: 'product-2',
    variantId: 'default',
    storeId: 'store-2',
    quantity: 2,
  };
  const availableItem: CartItem = {
    productId: 'product-1',
    variantId: 'default',
    storeId: 'store-2',
    quantity: 1,
  };
  useSelectedStore.setState({ storeId: 'store-2' });
  useCartStore.setState({ items: [unavailableItem, availableItem] });
  const stores = await repos.stores.list();
  const pickerView = render(
    <StorePicker
      visible
      stores={stores}
      selectedId="store-2"
      onSelect={jest.fn()}
      onClose={jest.fn()}
    />,
    { wrapper: createDiscoveryWrapper(repos).wrapper },
  );
  fireEvent.press(screen.getByLabelText('Обрати магазин: Beerland Демо 1'));
  fireEvent.press(screen.getByRole('button', { name: 'Перенести кошик' }));
  await waitFor(() =>
    expect(useSelectedStore.getState().storeId).toBe('store-1'),
  );
  expect(useCartStore.getState().items).toEqual([
    { ...unavailableItem, storeId: 'store-1' },
    { ...availableItem, storeId: 'store-1' },
  ]);
  pickerView.unmount();

  render(<CartScreen />, { wrapper: createDiscoveryWrapper(repos).wrapper });
  expect(
    await screen.findByText('Немає в обраному магазині'),
  ).toBeOnTheScreen();
  expect(
    screen.getByLabelText('Бурштиновий вечір, 500 мл: 2'),
  ).toBeOnTheScreen();
  expect(screen.getByTestId('cart-checkout')).toBeDisabled();
  fireEvent.press(screen.getByLabelText('Видалити: Бурштиновий вечір, 500 мл'));
  expect(useCartStore.getState().items).toEqual([
    { ...availableItem, storeId: 'store-1' },
  ]);
  await waitFor(() =>
    expect(screen.getByTestId('cart-checkout')).toBeEnabled(),
  );
});

test('repository failure and repeated confirmation preserve original state', async () => {
  const repos = createMockRepositories();
  const getById = repos.products.getById;
  let reject!: (reason: Error) => void;
  repos.products.getById = jest.fn(
    () =>
      new Promise<Product | null>((_, failed) => {
        reject = failed;
      }),
  );
  useCartStore.setState({ items: [first] });
  const { onSelect } = await picker(repos);
  fireEvent.press(screen.getByLabelText('Обрати магазин: Beerland Демо 2'));
  fireEvent.press(screen.getByRole('button', { name: 'Перенести кошик' }));
  fireEvent.press(screen.getByTestId('confirm-cart-transfer'));
  expect(repos.products.getById).toHaveBeenCalledTimes(1);
  await act(async () => {
    reject(new Error('offline'));
  });
  expect(useCartStore.getState().items).toEqual([first]);
  expect(useSelectedStore.getState().storeId).toBe('store-1');
  expect(onSelect).not.toHaveBeenCalled();
  expect(screen.getByText(/Не вдалося перенести кошик/)).toBeOnTheScreen();
  repos.products.getById = getById;
  fireEvent.press(screen.getByRole('button', { name: 'Спробувати ще раз' }));
  await waitFor(() =>
    expect(useSelectedStore.getState().storeId).toBe('store-2'),
  );
  expect(useCartStore.getState().items).toEqual([
    { ...first, storeId: 'store-2' },
  ]);
});

test('both persisted stores survive restart and a torn write reconciles from cart', async () => {
  useCartStore.setState({ items: [first] });
  useSelectedStore.setState({ storeId: 'store-2' });
  await AsyncStorage.setItem(
    'beerland:cart',
    JSON.stringify({ state: { items: [first] }, version: 1 }),
  );
  await AsyncStorage.setItem(
    'beerland:selected-store',
    JSON.stringify({ state: { storeId: 'store-2' }, version: 1 }),
  );
  useCartStore.setState({ items: [] });
  useSelectedStore.setState({ storeId: null });
  await AsyncStorage.setItem(
    'beerland:cart',
    JSON.stringify({ state: { items: [first] }, version: 1 }),
  );
  await AsyncStorage.setItem(
    'beerland:selected-store',
    JSON.stringify({ state: { storeId: 'store-2' }, version: 1 }),
  );
  await Promise.all([
    useCartStore.persist.rehydrate(),
    useSelectedStore.persist.rehydrate(),
  ]);
  reconcileCartStore();
  expect(useCartStore.getState().items).toEqual([first]);
  expect(useSelectedStore.getState().storeId).toBe('store-1');
});

import type { PropsWithChildren } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { HomeScreen } from '@/features/home/HomeScreen';
import { ToastProvider } from '@/components/ui';
import { createTestWrapper } from '@/test/createTestWrapper';
import { createMockRepositories } from '@/services/mock/repositories';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import { useFulfillmentStore } from '@/stores/fulfillment';
import type { Repositories } from '@/repositories/contracts';
import type { Order } from '@/types/domain';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  useSelectedStore.setState({ storeId: 'store-1' });
  useSessionStore.setState({ hydrated: true });
  useCartStore.setState({ items: [] });
  useFavoritesStore.setState({ productIds: [] });
  useFulfillmentStore.setState({ method: 'pickup' });
});
afterEach(() => {
  cleanup();
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  useSelectedStore.setState({ storeId: null });
  useSessionStore.setState({ hydrated: false });
  useCartStore.setState({ items: [] });
  useFavoritesStore.setState({ productIds: [] });
  useFulfillmentStore.setState({ method: 'pickup' });
});
function setup(repositories: Repositories = createMockRepositories()) {
  const { wrapper: DataProvider } = createTestWrapper(repositories);
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <DataProvider>
          <ToastProvider>{children}</ToastProvider>
        </DataProvider>
      </SafeAreaProvider>
    );
  }
  return render(<HomeScreen />, { wrapper: Wrapper });
}
async function ready() {
  await screen.findByTestId('home-selected-store');
}

test('Home renders selected store and repository-derived collections', async () => {
  const repositories = createMockRepositories();
  const list = jest.spyOn(repositories.products, 'list');
  setup(repositories);
  await ready();
  expect(
    within(screen.getByTestId('home-selected-store')).getByText(
      'Beerland Демо 1',
    ),
  ).toBeOnTheScreen();
  expect(
    within(screen.getByTestId('home-popular')).getByText('Світлий берег'),
  ).toBeOnTheScreen();
  expect(
    within(screen.getByTestId('home-popular')).queryByText('Хмільний обрій'),
  ).toBeNull();
  expect(
    within(screen.getByTestId('home-brewery')).queryByText('Житні грінки'),
  ).toBeNull();
  expect(list).toHaveBeenCalledWith(
    { storeId: 'store-1', servingType: 'draft', availability: 'available' },
    { signal: expect.any(AbortSignal) },
  );
  expect(
    within(screen.getByTestId('home-on-tap')).queryByText('Цитрусова хвиля'),
  ).toBeNull();
  expect(
    within(screen.getByTestId('home-popular')).getByText('50\u00a0₴'),
  ).toBeOnTheScreen();
});
test('no-store state offers selection and does not invent a cart store', async () => {
  useSelectedStore.setState({ storeId: null });
  setup();
  await ready();
  expect(
    screen.getByRole('button', { name: 'Оберіть магазин' }),
  ).toBeOnTheScreen();
  expect(screen.queryByTestId('home-on-tap-state')).toBeNull();
  fireEvent.press(
    within(screen.getByTestId('popular-product-1')).getByRole('button', {
      name: 'Додати в кошик: Світлий берег',
    }),
  );
  expect(
    screen.getByRole('button', { name: 'Обрати магазин: Beerland Демо 1' }),
  ).toBeOnTheScreen();
  expect(useCartStore.getState().items).toEqual([]);
});
test('fulfillment changes state and unsupported delivery is disabled after selecting a store', async () => {
  setup();
  await ready();
  fireEvent.press(screen.getByRole('button', { name: 'Доставка' }));
  expect(useFulfillmentStore.getState().method).toBe('delivery');
  fireEvent.press(screen.getByRole('button', { name: 'Змінити магазин' }));
  fireEvent.press(
    screen.getByRole('button', { name: 'Обрати магазин: Beerland Демо 2' }),
  );
  await ready();
  await waitFor(() =>
    expect(useFulfillmentStore.getState().method).toBe('pickup'),
  );
  expect(screen.getByRole('button', { name: 'Доставка' })).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Доставка' }));
  expect(useFulfillmentStore.getState().method).toBe('pickup');
  expect(
    screen.getByRole('button', { name: 'Самовивіз', selected: true }),
  ).toBeOnTheScreen();
});
test('on-tap changes with store and never carries the previous assortment forward', async () => {
  setup();
  await ready();
  await screen.findByTestId('on-tap-product-1');
  act(() => {
    useSelectedStore.getState().select('store-3');
  });
  await screen.findByTestId('on-tap-product-2');
  expect(screen.queryByTestId('on-tap-product-1')).toBeNull();
  expect(screen.queryByTestId('on-tap-product-8')).toBeNull();
});
test('cart and favorite actions update real stores and display feedback', async () => {
  setup();
  await ready();
  const card = within(screen.getByTestId('popular-product-1'));
  fireEvent.press(
    card.getByRole('button', { name: 'Додати в кошик: Світлий берег' }),
  );
  expect(useCartStore.getState().items).toEqual([
    { productId: 'product-1', storeId: 'store-1', quantity: 1 },
  ]);
  expect(screen.getByText('Додано в кошик')).toBeOnTheScreen();
  fireEvent.press(
    card.getByRole('button', { name: 'Додати в обране: Світлий берег' }),
  );
  expect(useFavoritesStore.getState().productIds).toContain('product-1');
  fireEvent.press(
    card.getByRole('button', { name: 'Видалити з обраного: Світлий берег' }),
  );
  expect(useFavoritesStore.getState().productIds).not.toContain('product-1');
});
test('categories, product, collection and search forward navigation intent', async () => {
  setup();
  await ready();
  fireEvent.press(screen.getByRole('button', { name: 'Категорія: IPA' }));
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/catalog',
    params: { category: 'ipa' },
  });
  fireEvent.press(
    within(screen.getByTestId('popular-product-1')).getByRole('button', {
      name: 'Відкрити товар: Світлий берег',
    }),
  );
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/product/[id]',
    params: { id: 'product-1' },
  });
  fireEvent.press(
    screen.getByRole('button', { name: 'Дивитися всі: Популярне зараз' }),
  );
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/catalog',
    params: { collection: 'popular' },
  });
  fireEvent(screen.getByLabelText('Пошук'), 'focus');
  expect(router.push).toHaveBeenLastCalledWith('/search');
});
test('campaign and shop header keep their navigation actions', async () => {
  setup();
  await ready();
  fireEvent.press(screen.getByRole('button', { name: 'Дивитися добірку' }));
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/catalog',
    params: { promotionId: 'discovery' },
  });
  fireEvent.press(screen.getByRole('button', { name: 'Відкрити пошук' }));
  expect(router.push).toHaveBeenLastCalledWith('/search');
});
test('Home uses injected data and waits for hydration before product requests', async () => {
  useSessionStore.setState({ hydrated: false });
  const repositories = createMockRepositories();
  const products = await repositories.products.list();
  const list = jest
    .spyOn(repositories.products, 'list')
    .mockResolvedValue([
      { ...products[0], name: 'Тестова назва з repository' },
    ]);
  setup(repositories);
  expect(screen.getByTestId('home-loading')).toBeOnTheScreen();
  expect(list).not.toHaveBeenCalled();
  act(() => useSessionStore.getState().setHydrated(true));
  await ready();
  expect(
    within(screen.getByTestId('home-popular')).getByText(
      'Тестова назва з repository',
    ),
  ).toBeOnTheScreen();
});
test('primary failure offers a working retry', async () => {
  const repositories = createMockRepositories();
  const original = repositories.products.list;
  jest
    .spyOn(repositories.products, 'list')
    .mockRejectedValueOnce(new Error('Offline'))
    .mockImplementation(original);
  setup(repositories);
  await screen.findByText('Не вдалося завантажити');
  fireEvent.press(screen.getByRole('button', { name: 'Повторити' }));
  await ready();
  expect(screen.queryByText('Не вдалося завантажити')).toBeNull();
});
test('secondary failures leave main Home content usable', async () => {
  const repositories = createMockRepositories();
  jest
    .spyOn(repositories.promotions, 'list')
    .mockRejectedValue(new Error('Offline'));
  jest
    .spyOn(repositories.orders, 'list')
    .mockRejectedValue(new Error('Offline'));
  setup(repositories);
  await ready();
  expect(screen.getByTestId('home-popular')).toBeOnTheScreen();
  expect(screen.queryByTestId('home-promotions')).toBeNull();
  expect(screen.queryByTestId('home-reorder')).toBeNull();
});
test('a failed on-tap query retries independently of the main content', async () => {
  const repositories = createMockRepositories();
  const original = repositories.products.list;
  let failDraft = true;
  jest
    .spyOn(repositories.products, 'list')
    .mockImplementation((filters, options) => {
      if (filters?.servingType === 'draft' && failDraft)
        return Promise.reject(new Error('Tap inventory unavailable'));
      return original(filters, options);
    });
  setup(repositories);
  await ready();
  expect(
    await screen.findByText('Не вдалося оновити асортимент на кранах.'),
  ).toBeOnTheScreen();
  expect(screen.getByTestId('home-popular')).toBeOnTheScreen();
  failDraft = false;
  fireEvent.press(screen.getByRole('button', { name: 'Оновити крани' }));
  expect(await screen.findByTestId('on-tap-product-1')).toBeOnTheScreen();
});
test('empty optional sections are hidden and taps have a small contextual message', async () => {
  const repositories = createMockRepositories();
  jest.spyOn(repositories.products, 'list').mockResolvedValue([]);
  jest.spyOn(repositories.promotions, 'list').mockResolvedValue([]);
  setup(repositories);
  await ready();
  for (const id of ['popular', 'brewery', 'snacks', 'promotions', 'reorder'])
    expect(screen.queryByTestId(`home-${id}`)).toBeNull();
  expect(screen.getByText(/На кранах поки порожньо/)).toBeOnTheScreen();
});
test('suitable history supports reorder at the selected store', async () => {
  const repositories = createMockRepositories();
  const order: Order = {
    id: 'order-1',
    storeId: 'store-1',
    items: [{ productId: 'product-1', storeId: 'store-1', quantity: 2 }],
    total: { amount: 10000, currency: 'UAH' },
    status: 'completed',
    fulfillment: 'pickup',
    createdAt: '2026-09-01T12:00:00Z',
  };
  jest.spyOn(repositories.orders, 'list').mockResolvedValue([order]);
  setup(repositories);
  await ready();
  fireEvent.press(
    await screen.findByRole('button', { name: 'Додати товари знову' }),
  );
  await waitFor(() =>
    expect(useCartStore.getState().items).toEqual(order.items),
  );
});

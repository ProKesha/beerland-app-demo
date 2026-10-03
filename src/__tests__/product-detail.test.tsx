import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { router } from 'expo-router';
import { ProductDetailScreen } from '@/features/product/ProductDetailScreen';
import { CatalogScreen } from '@/features/catalog/CatalogScreen';
import { createDiscoveryWrapper } from '@/test/createDiscoveryWrapper';
import { createMockRepositories } from '@/services/mock/repositories';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFavoritesStore } from '@/stores/favorites';
import { useCartStore } from '@/stores/cart';
import { useSessionStore } from '@/stores/session';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
}));
beforeEach(() => {
  jest.clearAllMocks();
  useSelectedStore.setState({ storeId: 'store-1' });
  useFavoritesStore.setState({ productIds: [] });
  useCartStore.setState({ items: [] });
  useSessionStore.setState({ hydrated: true });
});
afterEach(() => {
  cleanup();
  useCartStore.setState({ items: [] });
  useFavoritesStore.setState({ productIds: [] });
  useSelectedStore.setState({ storeId: null });
  useSessionStore.setState({ hydrated: false });
});
function setup(id = 'product-1', repositories = createMockRepositories()) {
  return render(
    <ProductDetailScreen id={id} />,
    createDiscoveryWrapper(repositories),
  );
}
const purchase = () => within(screen.getByTestId('product-purchase-bar'));
const loaded = async () => {
  await screen.findByRole('header', { name: 'Світлий берег' });
  // Product and store queries resolve independently. Purchase interactions must
  // wait for the selected store, not only the product heading.
  if (
    useSessionStore.getState().hydrated &&
    useSelectedStore.getState().storeId
  )
    await screen.findByRole('button', { name: /^Змінити магазин: Beerland/ });
};

test('persisted state hydrates before a purchase can mutate cart', async () => {
  useSessionStore.setState({ hydrated: false });
  setup();
  await loaded();
  expect(screen.getByTestId('product-add')).toBeDisabled();
  fireEvent.press(screen.getByTestId('product-add'));
  expect(useCartStore.getState().items).toEqual([]);
  act(() => useSessionStore.setState({ hydrated: true }));
  await waitFor(() => expect(screen.getByTestId('product-add')).toBeEnabled());
});
test('store-specific default price and promotion use the shared UAH price component', async () => {
  useSelectedStore.setState({ storeId: 'store-2' });
  setup('product-13');
  await screen.findByRole('header', { name: 'Подвійний обрій' });
  expect(purchase().getByText(/170\s*₴/)).toBeOnTheScreen();
  expect(purchase().getByLabelText(/Попередня ціна: 185/)).toBeOnTheScreen();
  expect(screen.getByText('Акція')).toBeOnTheScreen();
  expect(screen.getByLabelText('Гіркота: Висока')).toBeOnTheScreen();
});
test('related product navigation uses its own product ID', async () => {
  setup();
  await loaded();
  const related = within(await screen.findByTestId('product-related'));
  fireEvent.press(
    related.getByRole('button', { name: 'Відкрити товар: Золотий міст' }),
  );
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/product/[id]',
    params: { id: 'product-14' },
  });
});

test('loads only requested product through injected getById and renders product identity', async () => {
  const repos = createMockRepositories();
  const get = jest.spyOn(repos.products, 'getById');
  const list = jest.spyOn(repos.products, 'list');
  setup('product-1', repos);
  await loaded();
  expect(get).toHaveBeenCalledWith('product-1', {
    signal: expect.any(AbortSignal),
  });
  expect(list).not.toHaveBeenCalled();
  expect(screen.getByText('Beerland · Україна')).toBeOnTheScreen();
  expect(screen.getAllByText('Лагер').length).toBeGreaterThan(0);
});
test.each(['missing', ''])(
  'invalid product %s provides a catalog recovery action',
  async (id) => {
    setup(id);
    expect(await screen.findByText('Товар не знайдено')).toBeOnTheScreen();
    fireEvent.press(
      screen.getByRole('button', { name: 'Повернутися до каталогу' }),
    );
    expect(router.replace).toHaveBeenCalledWith('/catalog');
  },
);
test('pending repository shows a detail skeleton without purchase actions', () => {
  const repos = createMockRepositories();
  jest.spyOn(repos.products, 'getById').mockReturnValue(new Promise(() => {}));
  setup('product-1', repos);
  expect(screen.getByTestId('product-detail-loading')).toBeOnTheScreen();
  expect(screen.queryByTestId('product-add')).toBeNull();
});
test('repository error can retry successfully', async () => {
  const repos = createMockRepositories();
  jest
    .spyOn(repos.products, 'getById')
    .mockRejectedValueOnce(new Error('offline'));
  setup('product-1', repos);
  fireEvent.press(await screen.findByRole('button', { name: 'Повторити' }));
  await loaded();
});
test('beer shows ABV, IBU, flavor values, bitterness and full description', async () => {
  setup();
  await loaded();
  expect(screen.getByText('4,6% ABV')).toBeOnTheScreen();
  expect(screen.getByText('18 IBU')).toBeOnTheScreen();
  expect(screen.getByLabelText('Гіркота: Низька')).toBeOnTheScreen();
  expect(screen.getByLabelText('Насиченість: 2 з 5')).toBeOnTheScreen();
  expect(screen.getByText(/Наливайте повільно під кутом/)).toBeOnTheScreen();
});
test.each([
  ['product-7', 'Житні грінки'],
  ['product-6', 'Яблуневий сад'],
])('non-beer %s hides beer-only fields', async (id, name) => {
  setup(id);
  await screen.findByRole('header', { name });
  expect(screen.queryByTestId('product-flavor')).toBeNull();
  expect(
    within(screen.getByTestId('product-metadata')).queryByText(/IBU/),
  ).toBeNull();
  if (id === 'product-7') {
    expect(screen.queryByText(/ABV/)).toBeNull();
    expect(screen.getByText('Про продукт')).toBeOnTheScreen();
    expect(screen.getByText('Вага')).toBeOnTheScreen();
  }
});
test('beer with absent flavor measurements hides profile', async () => {
  setup('product-15');
  await screen.findByRole('header', { name: 'Серпневий день' });
  expect(screen.queryByTestId('product-flavor')).toBeNull();
});
test('changing volume changes selected state, price, metadata and cart SKU', async () => {
  setup();
  await loaded();
  expect(purchase().getByText(/50\s*₴/)).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Варіант: 1 л' }));
  expect(
    screen.getByRole('button', { name: 'Варіант: 1 л', selected: true }),
  ).toBeOnTheScreen();
  expect(purchase().getByText(/100\s*₴/)).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('product-add'));
  expect(useCartStore.getState().items).toEqual([
    {
      productId: 'product-1',
      variantId: '1000-ml',
      storeId: 'store-1',
      quantity: 1,
    },
  ]);
  expect(screen.getByText('Додано в кошик')).toBeOnTheScreen();
});
test('quantity increment and decrement enforce minimum one', async () => {
  setup();
  await loaded();
  const minus = screen.getByLabelText('Зменшити: Кількість');
  expect(minus).toBeDisabled();
  fireEvent.press(screen.getByLabelText('Збільшити: Кількість'));
  expect(screen.getByLabelText('Кількість: 2')).toBeOnTheScreen();
  fireEvent.press(minus);
  expect(screen.getByLabelText('Кількість: 1')).toBeOnTheScreen();
  expect(minus).toBeDisabled();
});
test('repeated add merges matching variant; different volumes remain separate', async () => {
  setup();
  await loaded();
  fireEvent.press(screen.getByTestId('product-add'));
  fireEvent.press(screen.getByTestId('product-add'));
  fireEvent.press(screen.getByRole('button', { name: 'Варіант: 1 л' }));
  fireEvent.press(screen.getByLabelText('Збільшити: Кількість'));
  fireEvent.press(screen.getByTestId('product-add'));
  expect(
    useCartStore.getState().items.map((i) => [i.variantId, i.quantity]),
  ).toEqual([
    ['default', 2],
    ['1000-ml', 2],
  ]);
});
test('unavailable volume is disabled and cannot change selected SKU', async () => {
  setup();
  await loaded();
  const unavailable = screen.getByRole('button', {
    name: 'Варіант: 1,5 л, недоступно',
  });
  expect(unavailable).toBeDisabled();
  fireEvent.press(unavailable);
  expect(
    screen.getByRole('button', { name: 'Варіант: 500 мл', selected: true }),
  ).toBeOnTheScreen();
});
test('switching stores updates selected-variant price and availability without navigation', async () => {
  setup();
  await loaded();
  fireEvent.press(
    screen.getByRole('button', { name: 'Змінити магазин: Beerland Демо 1' }),
  );
  fireEvent.press(
    await screen.findByRole('button', {
      name: 'Обрати магазин: Beerland Демо 2',
    }),
  );
  fireEvent.press(screen.getByRole('button', { name: 'Варіант: 1 л' }));
  expect(purchase().getByText(/105\s*₴/)).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Варіант: 1,5 л' }));
  await act(async () => {
    await useSelectedStore.getState().select('store-1');
  });
  expect(screen.getByText('Немає в цьому магазині')).toBeOnTheScreen();
  expect(screen.getByTestId('product-add')).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Варіант: 500 мл' }));
  expect(screen.getByText('В наявності')).toBeOnTheScreen();
  expect(screen.getByTestId('product-add')).toBeEnabled();
  expect(router.push).not.toHaveBeenCalled();
});
test('unavailable product keeps favorite, descriptions and store switching available', async () => {
  const repositories = createMockRepositories();
  const stores = await repositories.stores.list();
  // Exercise inventory switching independently of the demo store's closure.
  jest
    .spyOn(repositories.stores, 'list')
    .mockResolvedValue(
      stores.map((store) => ({ ...store, temporarilyClosed: false })),
    );
  setup('product-11', repositories);
  await screen.findByRole('header', { name: 'Сосновий маршрут' });
  expect(screen.getByTestId('product-add')).toBeDisabled();
  fireEvent.press(screen.getByTestId('product-add'));
  expect(useCartStore.getState().items).toEqual([]);
  fireEvent.press(
    screen.getByRole('button', { name: 'Додати в обране: Сосновий маршрут' }),
  );
  expect(useFavoritesStore.getState().productIds).toContain('product-11');
  fireEvent.press(screen.getByRole('button', { name: 'Обрати інший магазин' }));
  fireEvent.press(
    screen.getByRole('button', { name: 'Обрати магазин: Beerland Демо 3' }),
  );
  await waitFor(() => expect(screen.getByTestId('product-add')).toBeEnabled());
});
test('no store directs purchase to store picker', async () => {
  useSelectedStore.setState({ storeId: null });
  setup();
  await loaded();
  fireEvent.press(screen.getByTestId('product-add'));
  expect(
    await screen.findByRole('button', {
      name: 'Обрати магазин: Beerland Демо 1',
    }),
  ).toBeOnTheScreen();
  expect(useCartStore.getState().items).toEqual([]);
});
test('favorite sync is shared with Catalog and external changes', async () => {
  const rendered = setup();
  await loaded();
  fireEvent.press(
    screen.getByRole('button', { name: 'Додати в обране: Світлий берег' }),
  );
  expect(
    screen.getByRole('button', { name: 'Видалити з обраного: Світлий берег' }),
  ).toBeOnTheScreen();
  rendered.rerender(<CatalogScreen intent={{ q: 'Світлий берег' }} />);
  expect(
    await screen.findByRole('button', {
      name: 'Видалити з обраного: Світлий берег',
    }),
  ).toBeOnTheScreen();
  act(() => useFavoritesStore.getState().toggle('product-1'));
  expect(
    screen.getByRole('button', { name: 'Додати в обране: Світлий берег' }),
  ).toBeOnTheScreen();
});
test('recommendation press pushes detail with its ID and snack can be added', async () => {
  setup();
  await loaded();
  const pairings = within(await screen.findByTestId('product-pairings'));
  fireEvent.press(
    pairings.getByRole('button', { name: 'Додати в кошик: Житні грінки' }),
  );
  expect(useCartStore.getState().items[0].productId).toBe('product-7');
  fireEvent.press(
    pairings.getByRole('button', { name: 'Відкрити товар: Житні грінки' }),
  );
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/product/[id]',
    params: { id: 'product-7' },
  });
});
test('recommendation failure offers a retry and does not block purchase', async () => {
  const repos = createMockRepositories();
  jest
    .spyOn(repos.products, 'recommendations')
    .mockRejectedValueOnce(new Error('offline'));
  setup('product-1', repos);
  await loaded();
  fireEvent.press(
    await screen.findByRole('button', { name: 'Оновити рекомендації' }),
  );
  expect(await screen.findByTestId('product-pairings')).toBeOnTheScreen();
  expect(screen.getByTestId('product-add')).toBeEnabled();
});
test('purchase bar is outside primary scroll and back preserves router history', async () => {
  setup();
  await loaded();
  expect(
    within(screen.getByTestId('product-detail-scroll')).queryByTestId(
      'product-purchase-bar',
    ),
  ).toBeNull();
  expect(screen.getByTestId('product-purchase-bar')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Назад' }));
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(router.replace).not.toHaveBeenCalled();
});
test('quantity clamps on variant change and accounts for cart stock limit', async () => {
  useSelectedStore.setState({ storeId: 'store-2' });
  setup();
  await loaded();
  for (let i = 0; i < 5; i++)
    fireEvent.press(screen.getByLabelText('Збільшити: Кількість'));
  fireEvent.press(screen.getByRole('button', { name: 'Варіант: 1,5 л' }));
  expect(screen.getByLabelText('Кількість: 4')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('product-add'));
  expect(screen.getByTestId('product-add')).toBeDisabled();
  expect(useCartStore.getState().items[0].quantity).toBe(4);
});

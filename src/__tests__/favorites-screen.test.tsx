import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';
import { FavoritesScreen } from '@/features/favorites/FavoritesScreen';
import { createMockRepositories } from '@/services/mock/repositories';
import { createDiscoveryWrapper } from '@/test/createDiscoveryWrapper';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import { formatMoney } from '@/utils/format';
import type { Repositories } from '@/repositories/contracts';
import type { Product } from '@/types/domain';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  useCartStore.setState({ items: [] });
  useFavoritesStore.setState({ productIds: [] });
  useSelectedStore.setState({ storeId: 'store-1' });
  useSessionStore.setState({
    status: 'guest',
    user: null,
    hydrated: true,
  });
});

afterEach(() => {
  cleanup();
  useCartStore.setState({ items: [] });
  useFavoritesStore.setState({ productIds: [] });
  useSelectedStore.setState({ storeId: null });
  useSessionStore.setState({ status: 'guest', user: null, hydrated: false });
  jest.restoreAllMocks();
});

function setup(repositories: Repositories = createMockRepositories()) {
  return render(<FavoritesScreen />, {
    wrapper: createDiscoveryWrapper(repositories).wrapper,
  });
}

test('favorites wait for restored IDs and store before querying or showing an empty state', async () => {
  const repositories = createMockRepositories();
  const products = jest.spyOn(repositories.products, 'getById');
  const stores = jest.spyOn(repositories.stores, 'list');
  useSessionStore.setState({ hydrated: false });
  setup(repositories);

  expect(screen.getByTestId('favorites-loading')).toBeOnTheScreen();
  expect(screen.queryByText('Тут ще немає улюблених')).toBeNull();
  expect(screen.queryByTestId('favorites-store')).toBeNull();
  expect(products).not.toHaveBeenCalled();
  expect(stores).not.toHaveBeenCalled();

  act(() => {
    useFavoritesStore.setState({ productIds: ['product-1'] });
    useSelectedStore.setState({ storeId: 'store-2' });
    useSessionStore.setState({ hydrated: true });
  });

  expect(await screen.findByTestId('favorite-product-1')).toBeOnTheScreen();
  expect(products).toHaveBeenCalledWith('product-1', {
    signal: expect.any(AbortSignal),
  });
  expect(stores).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('favorites-loading')).toBeNull();
});

test('empty favorites link to the catalog without requesting product details', () => {
  const repositories = createMockRepositories();
  const products = jest.spyOn(repositories.products, 'getById');
  setup(repositories);

  expect(screen.getByText('Тут ще немає улюблених')).toBeOnTheScreen();
  expect(products).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Перейти до каталогу' }));
  expect(router.push).toHaveBeenCalledWith('/catalog');
});

test('pending product requests show loading until their repository data arrives', async () => {
  const repositories = createMockRepositories();
  const product = (await repositories.products.getById('product-1'))!;
  let resolveProduct!: (value: Product | null) => void;
  jest.spyOn(repositories.products, 'getById').mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveProduct = resolve;
      }),
  );
  useFavoritesStore.setState({ productIds: [product.id] });
  setup(repositories);

  expect(screen.getByTestId('favorites-loading')).toBeOnTheScreen();
  expect(screen.queryByLabelText(`Додати в кошик: ${product.name}`)).toBeNull();
  await act(async () => resolveProduct(product));
  expect(await screen.findByTestId(`favorite-${product.id}`)).toBeOnTheScreen();
});

test('favorites open products, add to cart and remove immediately without reloading remaining entries', async () => {
  const repositories = createMockRepositories();
  const products = jest.spyOn(repositories.products, 'getById');
  useFavoritesStore.setState({ productIds: ['product-1', 'product-2'] });
  setup(repositories);

  fireEvent.press(
    await screen.findByLabelText('Додати в кошик: Світлий берег'),
  );
  expect(useCartStore.getState().items).toEqual([
    { productId: 'product-1', storeId: 'store-1', quantity: 1 },
  ]);
  expect(screen.getByTestId('product-quantity-product-1')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Відкрити товар: Світлий берег'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/product/[id]',
    params: { id: 'product-1' },
  });

  const remove = screen.getByLabelText('Видалити з обраного: Світлий берег');
  act(() => {
    fireEvent.press(remove);
    fireEvent.press(remove);
  });
  expect(useFavoritesStore.getState().productIds).toEqual(['product-2']);
  expect(screen.queryByTestId('favorite-product-1')).toBeNull();
  expect(screen.getByTestId('favorite-product-2')).toBeOnTheScreen();
  expect(screen.queryByTestId('favorites-loading')).toBeNull();
  expect(products).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Збережено товарів: 1')).toBeOnTheScreen();
  expect(useCartStore.getState().items).toHaveLength(1);
});

test('a product repository failure is recoverable without removing saved IDs', async () => {
  const repositories = createMockRepositories();
  const product = (await repositories.products.getById('product-1'))!;
  const products = jest
    .spyOn(repositories.products, 'getById')
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(product);
  useFavoritesStore.setState({ productIds: [product.id] });
  setup(repositories);

  expect(
    await screen.findByText('Не вдалося завантажити обране'),
  ).toBeOnTheScreen();
  expect(useFavoritesStore.getState().productIds).toEqual([product.id]);
  fireEvent.press(screen.getByRole('button', { name: 'Повторити' }));
  expect(await screen.findByTestId(`favorite-${product.id}`)).toBeOnTheScreen();
  expect(products).toHaveBeenCalledTimes(2);
});

test('deleted repository products remain removable from favorites', async () => {
  useFavoritesStore.setState({ productIds: ['deleted-product'] });
  setup();

  expect(await screen.findByText('Товар більше недоступний')).toBeOnTheScreen();
  fireEvent.press(
    screen.getByTestId('remove-unavailable-favorite-deleted-product'),
  );
  expect(useFavoritesStore.getState().productIds).toEqual([]);
  expect(screen.getByText('Тут ще немає улюблених')).toBeOnTheScreen();
});

test('a failed favorite exposes retry while another product request remains pending', async () => {
  const repositories = createMockRepositories();
  const loadProduct = repositories.products.getById;
  const secondProduct = (await loadProduct('product-2'))!;
  let resolveSecond!: (value: Product | null) => void;
  const pendingSecond = new Promise<Product | null>((resolve) => {
    resolveSecond = resolve;
  });
  let firstFailed = false;
  jest
    .spyOn(repositories.products, 'getById')
    .mockImplementation((id, options) => {
      if (id === 'product-2') return pendingSecond;
      if (!firstFailed) {
        firstFailed = true;
        return Promise.reject(new Error('offline'));
      }
      return loadProduct(id, options);
    });
  useFavoritesStore.setState({ productIds: ['product-1', 'product-2'] });
  setup(repositories);

  const retry = await screen.findByRole('button', { name: 'Повторити' });
  expect(screen.getByText('Не вдалося завантажити обране')).toBeOnTheScreen();
  expect(screen.queryByTestId('favorites-loading')).toBeNull();
  expect(useFavoritesStore.getState().productIds).toEqual([
    'product-1',
    'product-2',
  ]);
  fireEvent.press(retry);
  await act(async () => resolveSecond(secondProduct));
  expect(await screen.findByTestId('favorite-product-1')).toBeOnTheScreen();
  expect(screen.getByTestId('favorite-product-2')).toBeOnTheScreen();
  expect(screen.queryByText('Не вдалося завантажити обране')).toBeNull();
});

test('adding a favorite without a selected store navigates to store selection', async () => {
  useSelectedStore.setState({ storeId: null });
  useFavoritesStore.setState({ productIds: ['product-1'] });
  setup();

  fireEvent.press(
    await screen.findByLabelText('Додати в кошик: Світлий берег'),
  );
  expect(router.push).toHaveBeenCalledWith('/stores');
  expect(useCartStore.getState().items).toEqual([]);
  expect(screen.getByTestId('favorites-store')).toBeEnabled();
});

test('changing the selected store refreshes favorite availability and prices before adding', async () => {
  const repositories = createMockRepositories();
  const product = (await repositories.products.getById('product-1'))!;
  const price = { amount: 9900, currency: 'UAH' };
  const products = jest
    .spyOn(repositories.products, 'getById')
    .mockResolvedValue({
      ...product,
      variants: undefined,
      storeOffers: [
        { storeId: 'store-1', availability: 'unavailable' },
        { storeId: 'store-2', availability: 'available', price },
      ],
    });
  useFavoritesStore.setState({ productIds: [product.id] });
  setup(repositories);

  expect(
    await screen.findByLabelText(`Додати в кошик: ${product.name}`),
  ).toBeDisabled();
  expect(screen.getByText('Немає в цьому магазині')).toBeOnTheScreen();
  act(() => {
    useSelectedStore.setState({ storeId: 'store-2' });
  });
  await waitFor(() =>
    expect(
      screen.getByLabelText(`Додати в кошик: ${product.name}`),
    ).toBeEnabled(),
  );
  expect(screen.getByText(formatMoney(price))).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText(`Додати в кошик: ${product.name}`));
  expect(useCartStore.getState().items[0]).toMatchObject({
    productId: product.id,
    storeId: 'store-2',
  });
  expect(products).toHaveBeenCalledTimes(1);
});

test('closed stores disable purchases while favorite removal remains available', async () => {
  const repositories = createMockRepositories();
  const stores = await repositories.stores.list();
  jest
    .spyOn(repositories.stores, 'list')
    .mockResolvedValue(
      stores.map((store) =>
        store.id === 'store-1' ? { ...store, temporarilyClosed: true } : store,
      ),
    );
  useFavoritesStore.setState({ productIds: ['product-1'] });
  setup(repositories);

  expect(
    await screen.findByLabelText('Додати в кошик: Світлий берег'),
  ).toBeDisabled();
  expect(
    screen.getByText('Цей магазин зараз не приймає замовлення.'),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Видалити з обраного: Світлий берег'));
  expect(useFavoritesStore.getState().productIds).toEqual([]);
});

test('store repository failure blocks adding until the user successfully retries', async () => {
  const repositories = createMockRepositories();
  const stores = await repositories.stores.list();
  const loadStores = jest
    .spyOn(repositories.stores, 'list')
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(stores);
  useFavoritesStore.setState({ productIds: ['product-1'] });
  setup(repositories);

  expect(
    await screen.findByLabelText('Додати в кошик: Світлий берег'),
  ).toBeDisabled();
  fireEvent.press(
    await screen.findByRole('button', { name: 'Оновити магазини' }),
  );
  await waitFor(() =>
    expect(
      screen.getByLabelText('Додати в кошик: Світлий берег'),
    ).toBeEnabled(),
  );
  expect(loadStores).toHaveBeenCalledTimes(2);
});

test('restoring a different workspace never shows cached cards from the former saved IDs', async () => {
  useFavoritesStore.setState({ productIds: ['product-1'] });
  setup();
  expect(await screen.findByTestId('favorite-product-1')).toBeOnTheScreen();

  act(() => {
    useSessionStore.setState({
      hydrated: false,
      status: 'authenticated',
      user: {
        id: 'new-owner',
        phone: '+380501234567',
        name: 'Олена',
        needsProfile: false,
        demo: true,
      },
    });
    useFavoritesStore.setState({ productIds: ['product-2'] });
  });
  expect(screen.queryByTestId('favorite-product-1')).toBeNull();
  expect(screen.getByTestId('favorites-loading')).toBeOnTheScreen();
  act(() => useSessionStore.setState({ hydrated: true }));
  expect(await screen.findByTestId('favorite-product-2')).toBeOnTheScreen();
  expect(screen.queryByTestId('favorite-product-1')).toBeNull();
});

test('direct favorites navigation uses the catalog as its back destination', () => {
  setup();
  fireEvent.press(screen.getByTestId('favorites-back'));
  expect(router.replace).toHaveBeenCalledWith('/catalog');
});

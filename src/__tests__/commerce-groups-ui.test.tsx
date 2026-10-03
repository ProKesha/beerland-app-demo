import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';
import { CatalogScreen } from '@/features/catalog/CatalogScreen';
import { HomeScreen } from '@/features/home/HomeScreen';
import { useDiscoveryState } from '@/features/catalog/useDiscoveryState';
import { commerceGroups } from '@/features/catalog/model';
import { createDiscoveryWrapper } from '@/test/createDiscoveryWrapper';
import { createMockRepositories } from '@/services/mock/repositories';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useDiscoveryPreferences } from '@/stores/discoveryPreferences';

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
  useSessionStore.setState({ hydrated: true });
  useSelectedStore.setState({ storeId: 'store-1' });
  useCartStore.setState({ items: [] });
  useFavoritesStore.setState({ productIds: [] });
  useFulfillmentStore.setState({ method: 'pickup' });
  useDiscoveryPreferences.setState({ recent: [], viewMode: 'grid' });
});
afterEach(() => {
  cleanup();
  useSessionStore.setState({ hydrated: false });
  useSelectedStore.setState({ storeId: null });
  useCartStore.setState({ items: [] });
  useFavoritesStore.setState({ productIds: [] });
  useDiscoveryPreferences.setState({ recent: [], viewMode: 'grid' });
});

test.each(commerceGroups)(
  'Home $label entry opens the canonical filtered catalog',
  async ({ id, label }) => {
    render(<HomeScreen />, createDiscoveryWrapper());
    fireEvent.press(
      await screen.findByRole('button', { name: `Колекція: ${label}` }),
    );
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/catalog',
      params: { group: id },
    });
  },
);

test('catalog loads group-aware subcategories from its injected repository', async () => {
  const repositories = createMockRepositories();
  const original = await repositories.products.catalogMetadata();
  jest.spyOn(repositories.products, 'catalogMetadata').mockResolvedValue({
    ...original,
    commerceGroups: original.commerceGroups!.map((group) =>
      group.id === 'snacks'
        ? {
            ...group,
            subcategories: [{ id: 'croutons', label: 'Категорія з адаптера' }],
          }
        : group,
    ),
  });
  render(
    <CatalogScreen intent={{ group: 'snacks' }} />,
    createDiscoveryWrapper(repositories),
  );
  expect(
    await screen.findByRole('button', {
      name: 'Підкатегорія: Категорія з адаптера',
    }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole('button', { name: 'Підкатегорія: Горішки' }),
  ).toBeNull();
  fireEvent.press(
    screen.getByRole('button', { name: 'Підкатегорія: Категорія з адаптера' }),
  );
  expect(await screen.findByTestId('catalog-product-7')).toBeOnTheScreen();
  expect(screen.queryByTestId('catalog-product-29')).toBeNull();
});

test('catalog remains usable with an older injected metadata adapter', async () => {
  const repositories = createMockRepositories();
  jest
    .spyOn(repositories.products, 'catalogMetadata')
    .mockResolvedValue({ breweries: [] });
  render(
    <CatalogScreen intent={{ group: 'snacks' }} />,
    createDiscoveryWrapper(repositories),
  );
  expect(await screen.findByTestId('catalog-product-7')).toBeOnTheScreen();
  expect(
    screen.queryByRole('button', { name: 'Підкатегорія: Грінки' }),
  ).toBeNull();
});

test.each([true, false])(
  'catalog blocks inline purchase for closed or unfulfillable store: %s',
  async (temporarilyClosed) => {
    const repositories = createMockRepositories();
    const stores = await repositories.stores.list();
    jest.spyOn(repositories.stores, 'list').mockResolvedValue(
      stores.map((store) =>
        store.id === 'store-1'
          ? {
              ...store,
              temporarilyClosed,
              ...(temporarilyClosed
                ? {}
                : { pickupAvailable: false, deliveryAvailable: false }),
            }
          : store,
      ),
    );
    render(
      <CatalogScreen intent={{ group: 'bottled', q: 'Подвійний обрій' }} />,
      createDiscoveryWrapper(repositories),
    );
    const add = await screen.findByRole('button', {
      name: 'Додати в кошик: Подвійний обрій',
    });
    expect(add).toBeDisabled();
    fireEvent.press(add);
    expect(useCartStore.getState().items).toEqual([]);
  },
);

test('catalog keeps group, search, filter and display state together', async () => {
  const repositories = createMockRepositories();
  const search = jest.spyOn(repositories.products, 'searchProducts');
  render(
    <CatalogScreen
      intent={{ group: 'bottled', q: 'IPA', availableOnly: true }}
    />,
    createDiscoveryWrapper(repositories),
  );
  expect(await screen.findByTestId('catalog-product-13')).toBeOnTheScreen();
  expect(screen.queryByTestId('catalog-product-3')).toBeNull();
  expect(
    screen.getByRole('button', {
      name: 'Колекція: Сьогодні в пляшках',
      selected: true,
    }),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Список' }));
  fireEvent.press(
    screen.getByRole('button', { name: 'Сортування: За популярністю' }),
  );
  fireEvent.press(screen.getByRole('button', { name: 'Ціна: від нижчої' }));
  await waitFor(() =>
    expect(search).toHaveBeenLastCalledWith(
      expect.objectContaining({
        group: 'bottled',
        query: 'IPA',
        sort: 'price-asc',
        filters: { availableOnly: true },
        storeId: 'store-1',
      }),
      { signal: expect.any(AbortSignal) },
    ),
  );
  expect(useDiscoveryPreferences.getState().viewMode).toBe('list');
});

test('today on tap responds to store changes and requires selection without a saved store', async () => {
  const { unmount } = render(
    <CatalogScreen intent={{ group: 'onTap' }} />,
    createDiscoveryWrapper(),
  );
  expect(await screen.findByTestId('catalog-product-1')).toBeOnTheScreen();
  expect(screen.queryByTestId('catalog-product-2')).toBeNull();
  await act(async () => {
    await useSelectedStore.getState().select('store-3');
  });
  expect(await screen.findByTestId('catalog-product-2')).toBeOnTheScreen();
  expect(screen.queryByTestId('catalog-product-1')).toBeNull();
  unmount();
  useSelectedStore.setState({ storeId: null });
  render(
    <CatalogScreen intent={{ group: 'onTap' }} />,
    createDiscoveryWrapper(),
  );
  expect(
    await screen.findByText('Оберіть магазин для асортименту на кранах'),
  ).toBeOnTheScreen();
  expect(screen.queryByTestId('catalog-product-1')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Обрати магазин' }));
  fireEvent.press(
    screen.getByRole('button', { name: 'Обрати магазин: Beerland Демо 1' }),
  );
  expect(await screen.findByTestId('catalog-product-1')).toBeOnTheScreen();
});

test('other collection stays honestly empty and recovers to all products', async () => {
  render(
    <CatalogScreen intent={{ group: 'other' }} />,
    createDiscoveryWrapper(),
  );
  expect(
    await screen.findByText('У цій категорії поки порожньо'),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole('button', { name: 'Підкатегорія: Келихи' }),
  ).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Усі товари' }));
  expect(await screen.findByText('32 товари')).toBeOnTheScreen();
});

test('changing commerce group clears its subcategory while preserving search, filters and sorting', () => {
  const { result } = renderHook(() =>
    useDiscoveryState({
      group: 'bottled',
      subcategory: 'beer',
      category: 'ipa',
      query: 'IPA',
      sort: 'price-asc',
      filters: { availableOnly: true },
    }),
  );
  act(() => result.current.setGroup('onTap'));
  expect(result.current.state).toMatchObject({
    group: 'onTap',
    subcategory: undefined,
    category: 'all',
    query: 'IPA',
    sort: 'price-asc',
    filters: { availableOnly: true },
  });
  act(() => result.current.clearFilters());
  expect(result.current.state).toMatchObject({
    group: 'onTap',
    query: 'IPA',
    sort: 'price-asc',
    filters: {},
  });
});

test('group deep links keep the existing Home navigation action', async () => {
  render(
    <CatalogScreen intent={{ group: 'snacks' }} />,
    createDiscoveryWrapper(),
  );
  await screen.findByTestId('catalog-product-7');
  fireEvent.press(screen.getByRole('button', { name: 'На головну' }));
  expect(router.push).toHaveBeenCalledWith('/');
});

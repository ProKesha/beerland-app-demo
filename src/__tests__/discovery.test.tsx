import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { CatalogScreen } from '@/features/catalog/CatalogScreen';
import { SearchScreen } from '@/features/catalog/SearchScreen';
import { createDiscoveryWrapper } from '@/test/createDiscoveryWrapper';
import { createMockRepositories } from '@/services/mock/repositories';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import { useFavoritesStore } from '@/stores/favorites';
import { useCartStore } from '@/stores/cart';
import { useDiscoveryPreferences } from '@/stores/discoveryPreferences';
import type { CatalogIntent } from '@/features/catalog/catalogIntent';
import { componentHeights, spacing } from '@/theme/tokens';
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
  useFavoritesStore.setState({ productIds: [] });
  useCartStore.setState({ items: [] });
  useDiscoveryPreferences.setState({ recent: [], viewMode: 'grid' });
});
afterEach(() => {
  cleanup();
  useSessionStore.setState({ hydrated: false });
  useSelectedStore.setState({ storeId: null });
  useFavoritesStore.setState({ productIds: [] });
  useCartStore.setState({ items: [] });
  useDiscoveryPreferences.setState({ recent: [], viewMode: 'grid' });
});
function setup(
  intent: CatalogIntent = {},
  repositories = createMockRepositories(),
) {
  return render(
    <CatalogScreen intent={intent} />,
    createDiscoveryWrapper(repositories),
  );
}
test('Catalog renders only injected repository products and forwards request context', async () => {
  const repositories = createMockRepositories();
  const p = (await repositories.products.getById('product-1'))!;
  const search = jest
    .spyOn(repositories.products, 'searchProducts')
    .mockResolvedValue({
      items: [{ ...p, name: 'Товар з адаптера' }],
      total: 1,
    });
  setup({}, repositories);
  expect(await screen.findByText('Товар з адаптера')).toBeOnTheScreen();
  expect(screen.queryByText('Світлий берег')).toBeNull();
  expect(search).toHaveBeenCalledWith(
    expect.objectContaining({ storeId: 'store-1' }),
    { signal: expect.any(AbortSignal) },
  );
});
test('catalog masthead and illustrated cards remain accessible without product photos', async () => {
  setup({ q: 'Світлий берег' });
  expect(await screen.findByTestId('catalog-masthead')).toBeOnTheScreen();
  const card = within(await screen.findByTestId('catalog-product-1'));
  expect(
    card.getByRole('image', { name: 'Ілюстрація товару: Світлий берег' }),
  ).toBeOnTheScreen();
  expect(
    card.getByRole('button', { name: 'Додати в кошик: Світлий берег' }),
  ).toBeEnabled();
  fireEvent.press(screen.getByRole('button', { name: 'На головну' }));
  expect(router.push).toHaveBeenCalledWith('/');
});
test('catalog reserves tab-bar clearance at the end of its primary scroll area', async () => {
  setup();
  await screen.findByText('32 товари');
  const contentStyle = StyleSheet.flatten(
    screen.getByTestId('discovery-results').props.contentContainerStyle,
  );
  expect(contentStyle.paddingBottom).toBe(componentHeights.tabBar + spacing.md);
});
test('route category initializes results, changing intent resets the discovery request', async () => {
  const { rerender } = setup({ category: 'ipa' });
  expect(await screen.findByTestId('catalog-product-3')).toBeOnTheScreen();
  expect(screen.queryByTestId('catalog-product-1')).toBeNull();
  rerender(<CatalogScreen intent={{ category: 'snacks' }} />);
  expect(await screen.findByTestId('catalog-product-7')).toBeOnTheScreen();
  expect(screen.queryByTestId('catalog-product-3')).toBeNull();
});
test('available item adds to cart, favorite toggles shared state and product press preserves ID', async () => {
  setup({ q: 'Світлий берег' });
  const card = within(await screen.findByTestId('catalog-product-1'));
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
  act(() => useFavoritesStore.getState().toggle('product-1'));
  expect(
    card.getByRole('button', { name: 'Додати в обране: Світлий берег' }),
  ).toBeOnTheScreen();
  fireEvent.press(
    card.getByRole('button', { name: 'Відкрити товар: Світлий берег' }),
  );
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/product/[id]',
    params: { id: 'product-1' },
  });
});
test('store-specific unavailable item blocks cart but remains readable, favoritable and openable', async () => {
  setup({ q: 'Сосновий маршрут' });
  const card = within(await screen.findByTestId('catalog-product-11'));
  expect(card.getByText('Немає в цьому магазині')).toBeOnTheScreen();
  const add = card.getByRole('button', {
    name: 'Додати в кошик: Сосновий маршрут',
  });
  expect(add).toBeDisabled();
  fireEvent.press(add);
  expect(useCartStore.getState().items).toEqual([]);
  fireEvent.press(
    card.getByRole('button', { name: 'Додати в обране: Сосновий маршрут' }),
  );
  expect(useFavoritesStore.getState().productIds).toContain('product-11');
  await act(async () => {
    await useSelectedStore.getState().select('store-3');
  });
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Додати в кошик: Сосновий маршрут' }),
    ).toBeEnabled(),
  );
});
test('no-store browsing asks for selection before adding', async () => {
  useSelectedStore.setState({ storeId: null });
  setup({ q: 'Світлий берег' });
  fireEvent.press(
    await screen.findByRole('button', {
      name: 'Додати в кошик: Світлий берег',
    }),
  );
  expect(
    screen.getByRole('button', { name: 'Обрати магазин: Beerland Демо 1' }),
  ).toBeOnTheScreen();
  expect(useCartStore.getState().items).toEqual([]);
});
test('filters have draft state, apply result counts, removable chips and clear-all', async () => {
  setup();
  await screen.findByText('32 товари');
  fireEvent.press(screen.getByRole('button', { name: 'Фільтри' }));
  fireEvent.press(screen.getByRole('button', { name: 'Стиль пива: IPA' }));
  fireEvent.press(screen.getByRole('button', { name: 'Лише в наявності' }));
  await waitFor(() =>
    expect(screen.getByTestId('apply-filters')).toBeEnabled(),
  );
  fireEvent.press(screen.getByTestId('apply-filters'));
  expect(await screen.findByTestId('catalog-product-3')).toBeOnTheScreen();
  expect(screen.queryByTestId('catalog-product-1')).toBeNull();
  expect(screen.getByRole('button', { name: 'Фільтри · 2' })).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Прибрати фільтр: IPA' }));
  expect(await screen.findByTestId('catalog-product-1')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Скинути все' }));
  expect(await screen.findByText('32 товари')).toBeOnTheScreen();
  expect(
    screen.queryByRole('button', { name: 'Прибрати фільтр: Лише в наявності' }),
  ).toBeNull();
});
test('closing filter draft discards changes; reset keeps sheet open until apply', async () => {
  setup({ popular: true });
  await screen.findByRole('button', { name: 'Фільтри · 1' });
  fireEvent.press(screen.getByRole('button', { name: 'Фільтри · 1' }));
  fireEvent.press(screen.getByRole('button', { name: 'Скинути' }));
  fireEvent.press(screen.getByRole('button', { name: 'Закрити вікно' }));
  expect(
    screen.getByRole('button', { name: 'Прибрати фільтр: Популярне' }),
  ).toBeOnTheScreen();
});
test('search combines with filters and no-results action clears only query', async () => {
  setup({ popular: true, q: 'неможливийсмак' });
  expect(await screen.findByText('Не знайшли такого смаку')).toBeOnTheScreen();
  fireEvent.press(
    screen.getAllByRole('button', { name: 'Очистити пошук' }).at(-1)!,
  );
  expect(await screen.findByTestId('catalog-product-1')).toBeOnTheScreen();
  expect(
    screen.getByRole('button', { name: 'Прибрати фільтр: Популярне' }),
  ).toBeOnTheScreen();
});
test('filtered and category empty states have recovery actions', async () => {
  const repositories = createMockRepositories();
  jest
    .spyOn(repositories.products, 'searchProducts')
    .mockResolvedValue({ items: [], total: 0 });
  const { rerender } = setup({ category: 'snacks' }, repositories);
  expect(
    await screen.findByText('У цій категорії поки порожньо'),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Усі товари' }));
  rerender(<CatalogScreen intent={{ popular: true }} />);
  expect(
    await screen.findByText('За цими фільтрами нічого не знайшлося'),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole('button', { name: 'Скинути фільтри' }),
  ).toBeOnTheScreen();
});
test('primary error retries; skeleton is shown before resolution', async () => {
  const repositories = createMockRepositories();
  const original = repositories.products.searchProducts;
  jest
    .spyOn(repositories.products, 'searchProducts')
    .mockRejectedValueOnce(new Error('Offline'))
    .mockImplementation(original);
  setup({}, repositories);
  expect(screen.getByTestId('catalog-loading')).toBeOnTheScreen();
  fireEvent.press(await screen.findByRole('button', { name: 'Повторити' }));
  expect(await screen.findByTestId('catalog-product-1')).toBeOnTheScreen();
});
test('search displays shortcuts, repeats recent queries and clears history', async () => {
  useDiscoveryPreferences.setState({ recent: ['Світлий берег'] });
  render(<SearchScreen />, createDiscoveryWrapper());
  fireEvent.press(screen.getByRole('button', { name: 'Світлий берег' }));
  expect(await screen.findByTestId('catalog-product-1')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Очистити пошук' }));
  fireEvent.press(screen.getByRole('button', { name: 'Очистити історію' }));
  expect(screen.queryByText('Нещодавні пошуки')).toBeNull();
  expect(screen.getByText('Знайдіть свій смак')).toBeOnTheScreen();
});
test('sort and display preference change without dropping category', async () => {
  setup({ category: 'ipa' });
  await screen.findByTestId('catalog-product-3');
  fireEvent.press(
    screen.getByRole('button', { name: 'Сортування: За популярністю' }),
  );
  fireEvent.press(screen.getByRole('button', { name: 'Ціна: від нижчої' }));
  await screen.findByTestId('catalog-product-3');
  expect(screen.queryByTestId('catalog-product-1')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Список' }));
  expect(useDiscoveryPreferences.getState().viewMode).toBe('list');
  expect(
    screen.getByRole('button', { name: 'Категорія: IPA', selected: true }),
  ).toBeOnTheScreen();
});

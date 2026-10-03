import { Linking } from 'react-native';
import { useSessionStore } from '@/stores/session';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { router } from 'expo-router';
import { StoresScreen } from '@/features/stores/StoresScreen';
import { StoreDetailScreen } from '@/features/stores/StoreDetailScreen';
import { createDiscoveryWrapper } from '@/test/createDiscoveryWrapper';
import { createMockRepositories } from '@/services/mock/repositories';
import { useSelectedStore } from '@/stores/selectedStore';
import { useCartStore } from '@/stores/cart';
import { useStoreDiscovery } from '@/stores/storeDiscovery';
import { StoreCard } from '@/features/stores/components/StoreCard';
import { stores } from '@/services/mock/fixtures';
import { StoreMap } from '@/features/stores/map/StoreMap';
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));
jest.mock('@/features/stores/map/StoreMap', () => ({
  StoreMap: jest.fn(() => null),
}));
beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.setState({ hydrated: true });
  useSelectedStore.setState({ storeId: null });
  useCartStore.setState({ items: [] });
  useStoreDiscovery.setState({ view: 'list' });
});
function setup(detail?: string, repositories = createMockRepositories()) {
  const { wrapper } = createDiscoveryWrapper(repositories);
  return render(
    detail === undefined ? <StoresScreen /> : <StoreDetailScreen id={detail} />,
    { wrapper },
  );
}
test('loads injected stores, selects globally, and hides missing distances', async () => {
  setup();
  expect(screen.getByLabelText('Завантаження списку')).toBeTruthy();
  await screen.findByTestId('store-card-store-1');
  expect(screen.getAllByTestId(/store-card-/)).toHaveLength(3);
  expect(screen.queryByTestId('store-distance')).toBeNull();
  fireEvent.press(screen.getByLabelText('Обрати магазин: Beerland Демо 2'));
  expect(useSelectedStore.getState().storeId).toBe('store-2');
  expect(screen.getByText('Ваш магазин: Beerland Демо 2')).toBeTruthy();
});
test('map consumes shared query, highlights without changing selection, and falls back on error', async () => {
  setup();
  await screen.findByTestId('store-card-store-1');
  fireEvent.press(screen.getByLabelText('Показати карту'));
  const props = jest.mocked(StoreMap).mock.calls.at(-1)![0];
  expect(props.stores.map((s) => s.id)).toEqual(stores.map((s) => s.id));
  act(() => props.onSelectStore('store-2'));
  expect(screen.getByTestId('store-card-store-2')).toBeTruthy();
  expect(useSelectedStore.getState().storeId).toBeNull();
  act(() => props.onError());
  expect(screen.getAllByTestId(/store-card-/)).toHaveLength(3);
  fireEvent.press(screen.getByLabelText('Показати список'));
  expect(useStoreDiscovery.getState().view).toBe('list');
});
test('switching preserves cart on cancellation and transfers after confirmation', async () => {
  const items = [{ productId: 'product-1', storeId: 'store-1', quantity: 1 }];
  useCartStore.setState({ items });
  useSelectedStore.setState({ storeId: 'store-1' });
  setup();
  await screen.findByTestId('store-card-store-2');
  fireEvent.press(screen.getByLabelText('Обрати магазин: Beerland Демо 2'));
  expect(screen.getByText('Змінити магазин?')).toBeTruthy();
  expect(useCartStore.getState().items).toEqual(items);
  fireEvent.press(screen.getByText('Скасувати'));
  expect(useSelectedStore.getState().storeId).toBe('store-1');
  fireEvent.press(screen.getByLabelText('Обрати магазин: Beerland Демо 2'));
  fireEvent.press(screen.getByLabelText('Перенести кошик'));
  await waitFor(() =>
    expect(useSelectedStore.getState().storeId).toBe('store-2'),
  );
  expect(useCartStore.getState().items).toEqual([
    { ...items[0], storeId: 'store-2' },
  ]);
});
test('empty repository', async () => {
  const repo = createMockRepositories();
  repo.stores.list = async () => [];
  setup(undefined, repo);
  expect(await screen.findByText('Магазинів поки немає')).toBeTruthy();
});
test('error retry loads stores', async () => {
  const repo = createMockRepositories();
  const original = repo.stores.list;
  repo.stores.list = jest
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockImplementation(original);
  setup(undefined, repo);
  fireEvent.press(await screen.findByText('Повторити'));
  expect(await screen.findByTestId('store-card-store-1')).toBeTruthy();
});
test('detail loads address, weekly hours, capabilities and store-specific products', async () => {
  const repo = createMockRepositories();
  const list = jest.spyOn(repo.products, 'list');
  setup('store-2', repo);
  expect(await screen.findByText('Beerland Демо 2')).toBeTruthy();
  expect(screen.getByText(/Демонстраційна адреса 2/)).toBeTruthy();
  expect(screen.getByText('Години роботи')).toBeTruthy();
  expect(screen.getByText(/Доставка недоступна/)).toBeTruthy();
  expect(screen.getByText(/Самовивіз/)).toBeTruthy();
  await waitFor(() =>
    expect(list).toHaveBeenCalledWith(
      { storeId: 'store-2', servingType: 'draft', availability: 'available' },
      expect.anything(),
    ),
  );
  fireEvent.press(screen.getByLabelText('Дивитися всі: Сьогодні на кранах'));
  expect(useSelectedStore.getState().storeId).toBe('store-2');
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/catalog',
    params: { category: 'draft', availableOnly: 'true' },
  });
});
test('invalid detail', async () => {
  setup('missing');
  expect(await screen.findByText('Магазин не знайдено')).toBeTruthy();
});
test.each([true, false])(
  'card status and optional distance, open=%s',
  (open) => {
    render(
      <StoreCard
        store={{
          ...stores[0],
          temporarilyClosed: !open,
          pickupAvailable: false,
        }}
        selected={false}
        now={new Date('2026-09-21T09:00:00Z')}
        location={stores[0].coordinates}
        onSelect={() => undefined}
        onOpen={() => undefined}
      />,
    );
    expect(
      screen.getByText(open ? 'Відчинено до 22:00' : 'Тимчасово зачинено'),
    ).toBeTruthy();
    expect(screen.getByText(/Самовивіз недоступний/)).toBeTruthy();
    expect(
      within(screen.getByTestId('store-card-store-1')).getByTestId(
        'store-distance',
      ),
    ).toBeTruthy();
  },
);

test('catalog shortcut waits for cart confirmation and cancellation preserves context', async () => {
  useSelectedStore.setState({ storeId: 'store-1' });
  useCartStore.setState({
    items: [{ productId: 'product-1', storeId: 'store-1', quantity: 2 }],
  });
  setup('store-2');
  fireEvent.press(await screen.findByText('Переглянути асортимент'));
  expect(router.push).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Скасувати'));
  expect(useCartStore.getState().items).toHaveLength(1);
  expect(useSelectedStore.getState().storeId).toBe('store-1');
  fireEvent.press(screen.getByText('Переглянути асортимент'));
  fireEvent.press(screen.getByText('Перенести кошик'));
  await waitFor(() =>
    expect(useSelectedStore.getState().storeId).toBe('store-2'),
  );
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/catalog',
    params: { availableOnly: 'true' },
  });
});
test('detail repository error retries', async () => {
  const repo = createMockRepositories();
  const original = repo.stores.getById;
  repo.stores.getById = jest
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockImplementation(original);
  setup('store-1', repo);
  fireEvent.press(await screen.findByText('Повторити'));
  expect(await screen.findByText('Beerland Демо 1')).toBeTruthy();
});
test('popular and tap sections only show the available store assortment', async () => {
  const repo = createMockRepositories();
  const expected = await repo.products.list({
    storeId: 'store-2',
    availability: 'available',
  });
  const all = await repo.products.list();
  setup('store-2', repo);
  await waitFor(() =>
    expect(screen.queryAllByLabelText(/Про товар:/).length).toBeGreaterThan(0),
  );
  const allowed = new Set(
    expected
      .filter((p) => p.isPopular || p.servingType === 'draft')
      .map((p) => p.id),
  );
  for (const product of all.filter((p) => !allowed.has(p.id)))
    expect(screen.queryByLabelText(`Про товар: ${product.name}`)).toBeNull();
});

test('phone action uses platform Linking and reports a failure', async () => {
  const open = jest
    .spyOn(Linking, 'openURL')
    .mockRejectedValue(new Error('no handler'));
  const repo = createMockRepositories();
  repo.stores.getById = async () => ({
    ...stores[0],
    phone: '+380 (50) 123-45-67',
  });
  setup('store-1', repo);
  fireEvent.press(await screen.findByText('Зателефонувати'));
  expect(open).toHaveBeenCalledWith('tel:+380501234567');
  expect(
    await screen.findByText('Не вдалося відкрити посилання. Спробуйте ще раз.'),
  ).toBeTruthy();
  open.mockRestore();
});
test('store selection waits for persisted cart and store hydration', async () => {
  useSessionStore.setState({ hydrated: false });
  setup();
  await waitFor(() =>
    expect(screen.getByLabelText('Завантаження списку')).toBeTruthy(),
  );
  expect(screen.queryByLabelText('Обрати магазин: Beerland Демо 1')).toBeNull();
  act(() => useSessionStore.setState({ hydrated: true }));
  expect(await screen.findByTestId('store-card-store-1')).toBeTruthy();
});

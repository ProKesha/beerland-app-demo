import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';
import { createMockRepositories } from '@/services/mock/repositories';
import { demoOrders } from '@/services/mock/accountOrders';
import { demoLoyalty } from '@/services/mock/account';
import { createDiscoveryWrapper } from '@/test/createDiscoveryWrapper';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { LoyaltyScreen } from '@/features/loyalty/LoyaltyScreen';
import { FavoritesScreen } from '@/features/favorites/FavoritesScreen';
import { OrdersScreen } from '@/features/orders/OrdersScreen';
import { OrderDetailScreen } from '@/features/orders/OrderDetailScreen';
import { AddressesScreen } from '@/features/profile/AddressesScreen';
import { PersonalScreen } from '@/features/profile/PersonalScreen';
import { SupportScreen } from '@/features/profile/SupportScreen';
import { NotificationsScreen } from '@/features/profile/NotificationsScreen';
import { SettingsScreen } from '@/features/profile/SettingsScreen';
import { useFavoritesStore } from '@/stores/favorites';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useAddressStore } from '@/stores/checkout';
import { useNotificationPreferences } from '@/stores/notifications';
import { useSessionStore } from '@/stores/session';
import { testOrderInput } from '@/test/checkout';
import { formatMoney } from '@/utils/format';
import type { Repositories } from '@/repositories/contracts';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  },
}));
const address = {
  id: 'saved',
  city: 'Київ',
  street: 'Тестова',
  building: '1',
  isDefault: true,
};
function setup(
  element: React.ReactElement,
  r: Repositories = createMockRepositories({
    demoAccount: true,
    seedOrders: demoOrders(),
  }),
) {
  return {
    ...render(element, { wrapper: createDiscoveryWrapper(r).wrapper }),
    r,
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  useFavoritesStore.setState({ productIds: [] });
  useCartStore.setState({ items: [] });
  useSelectedStore.setState({ storeId: 'store-1' });
  useAddressStore.setState({ addresses: [], selectedId: null });
  useSessionStore.setState({ hydrated: true });
  useNotificationPreferences.setState({
    promotions: false,
    orders: true,
    loyalty: false,
  });
});
test('profile renders repository identity and live counts; all actions navigate', async () => {
  const r = createMockRepositories({
    demoAccount: true,
    seedOrders: demoOrders(),
  });
  await r.users.updateCurrent({ name: 'Олена', phone: '0501234567' });
  useFavoritesStore.setState({ productIds: ['product-1', 'product-2'] });
  useAddressStore.setState({ addresses: [address] });
  setup(<ProfileScreen />, r);
  expect(
    await screen.findByRole('header', { name: 'Олена' }),
  ).toBeOnTheScreen();
  expect(screen.getByText('+380501234567')).toBeOnTheScreen();
  await waitFor(() =>
    expect(screen.getByTestId('count-Замовлення')).toHaveTextContent('3'),
  );
  expect(screen.getByTestId('count-Обране')).toHaveTextContent('2');
  expect(screen.getByTestId('count-Адреси')).toHaveTextContent('1');
  for (const [label, path] of [
    ['Замовлення', '/orders'],
    ['Обране', '/favorites'],
    ['Адреси', '/addresses'],
    ['Особисті дані', '/profile/personal'],
    ['Сповіщення', '/settings/notifications'],
    ['Допомога', '/support'],
    ['Налаштування', '/settings'],
    ['Відкрити клубну картку', '/loyalty'],
  ]) {
    fireEvent.press(screen.getByLabelText(label));
    expect(router.push).toHaveBeenLastCalledWith(path);
  }
  act(() => useFavoritesStore.getState().toggle('product-1'));
  expect(screen.getByTestId('count-Обране')).toHaveTextContent('1');
});
test('profile loyalty failure remains isolated and exposes retry', async () => {
  const r = createMockRepositories();
  const load = jest
    .spyOn(r.loyalty, 'getCurrent')
    .mockRejectedValueOnce(Error('offline'))
    .mockResolvedValue(demoLoyalty);
  setup(<ProfileScreen />, r);
  fireEvent.press(await screen.findByRole('button', { name: 'Повторити' }));
  expect(await screen.findByText('Silver')).toBeOnTheScreen();
  expect(load).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText('Обране')).toBeOnTheScreen();
});
test('loyalty loads balance, tier, activity and enlarged real QR', async () => {
  const r = createMockRepositories({ demoAccount: true });
  const load = jest.spyOn(r.loyalty, 'getCurrent');
  setup(<LoyaltyScreen />, r);
  expect(await screen.findByText('Silver')).toBeOnTheScreen();
  expect(screen.getByText(/1\s240 бонусів/)).toBeOnTheScreen();
  expect(screen.getByText('+45 бонусів')).toBeOnTheScreen();
  expect(load).toHaveBeenCalled();
  expect(screen.getByTestId('loyalty-code')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Збільшити код' }));
  expect(screen.getByText('Покажіть код на касі')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Закрити вікно'));
});
test('favorites use global state, add to cart, open product and remove globally', async () => {
  useFavoritesStore.setState({ productIds: ['product-1'] });
  setup(<FavoritesScreen />);
  fireEvent.press(
    await screen.findByLabelText('Додати в кошик: Світлий берег'),
  );
  expect(useCartStore.getState().items[0]).toMatchObject({
    productId: 'product-1',
    storeId: 'store-1',
    quantity: 1,
  });
  fireEvent.press(screen.getByLabelText('Відкрити товар: Світлий берег'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/product/[id]',
    params: { id: 'product-1' },
  });
  fireEvent.press(screen.getByLabelText('Видалити з обраного: Світлий берег'));
  expect(useFavoritesStore.getState().productIds).toEqual([]);
  expect(screen.getByText('Тут ще немає улюблених')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Перейти до каталогу' }));
  expect(router.push).toHaveBeenCalledWith('/catalog');
});
test('unavailable favorite is visible but cannot be added', async () => {
  const r = createMockRepositories();
  const product = (await r.products.getById('product-1'))!;
  product.availability = 'unavailable';
  product.storeOffers = [];
  jest.spyOn(r.products, 'getById').mockResolvedValue(product);
  useFavoritesStore.setState({ productIds: [product.id] });
  setup(<FavoritesScreen />, r);
  expect(
    await screen.findByLabelText('Додати в кошик: Світлий берег'),
  ).toBeDisabled();
  expect(useCartStore.getState().items).toHaveLength(0);
});
test('removed product has recoverable favorite state', async () => {
  useFavoritesStore.setState({ productIds: ['gone'] });
  setup(<FavoritesScreen />);
  expect(await screen.findByText('Товар більше недоступний')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Видалити з обраного' }));
  expect(useFavoritesStore.getState().productIds).toEqual([]);
});
test('orders show newest first and newly created checkout order appears', async () => {
  const r = createMockRepositories({
    seedOrders: demoOrders(),
    now: () => new Date('2026-09-20T10:00:00Z'),
  });
  const created = await r.orders.create(await testOrderInput(r));
  setup(<OrdersScreen />, r);
  await screen.findByText(created.orderNumber);
  const cards = screen.getAllByTestId(/^order-/);
  expect(cards[0].props.testID).toBe(`order-${created.id}`);
  expect(cards).toHaveLength(4);
  fireEvent.press(
    screen.getByLabelText(`Детальніше про замовлення ${created.orderNumber}`),
  );
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/order/[id]',
    params: { id: created.id },
  });
});
test('orders repository failure can retry successfully', async () => {
  const r = createMockRepositories();
  jest
    .spyOn(r.orders, 'list')
    .mockRejectedValueOnce(Error('offline'))
    .mockResolvedValue(demoOrders());
  setup(<OrdersScreen />, r);
  fireEvent.press(await screen.findByRole('button', { name: 'Повторити' }));
  expect(await screen.findByText('BL-ДЕМО-1')).toBeOnTheScreen();
});
test.each(['pickup', 'delivery'] as const)(
  'order detail shows receipt totals and appropriate %s address',
  async (method) => {
    const order = demoOrders()[method === 'pickup' ? 0 : 1];
    setup(<OrderDetailScreen id={order.id} />);
    expect(await screen.findByText(`№ ${order.orderNumber}`)).toBeOnTheScreen();
    expect(screen.getByTestId('order-total')).toHaveTextContent(
      formatMoney(order.total),
    );
    expect(screen.getAllByText(order.items[0].name).length).toBe(1);
    if (method === 'delivery')
      expect(screen.getByTestId('delivery-address')).toHaveTextContent(
        'Київ, Демонстраційна вулиця, 1',
      );
    else expect(screen.queryByTestId('delivery-address')).toBeNull();
  },
);
test('invalid order shows not found with history navigation', async () => {
  setup(<OrderDetailScreen id="missing" />);
  expect(await screen.findByText('Замовлення не знайдено')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'До історії замовлень' }));
  expect(router.replace).toHaveBeenCalledWith('/orders');
});
test('repeat order adds available items and presents partial-success result', async () => {
  const r = createMockRepositories({ seedOrders: demoOrders() });
  const original = r.products.getById;
  jest
    .spyOn(r.products, 'getById')
    .mockImplementation((id, options) =>
      id === 'product-2' ? Promise.resolve(null) : original(id, options),
    );
  setup(<OrderDetailScreen id="demo-history-1" />, r);
  fireEvent.press(
    await screen.findByRole('button', { name: 'Повторити замовлення' }),
  );
  expect(await screen.findByText('Не все вдалося додати')).toBeOnTheScreen();
  expect(useCartStore.getState().items).toHaveLength(1);
});
test('repeat order store conflict uses centralized confirmation and cancel preserves cart', async () => {
  const old = { productId: 'product-1', storeId: 'store-2', quantity: 1 };
  useCartStore.setState({ items: [old] });
  setup(<OrderDetailScreen id="demo-history-1" />);
  fireEvent.press(
    await screen.findByRole('button', { name: 'Повторити замовлення' }),
  );
  expect(screen.getByText('Змінити магазин?')).toBeOnTheScreen();
  expect(useCartStore.getState().items).toEqual([old]);
  fireEvent.press(screen.getByRole('button', { name: 'Скасувати' }));
  expect(useCartStore.getState().items).toEqual([old]);
  fireEvent.press(screen.getByRole('button', { name: 'Повторити замовлення' }));
  fireEvent.press(screen.getByRole('button', { name: 'Перенести кошик' }));
  await waitFor(() =>
    expect(useCartStore.getState().items).toEqual([
      { productId: 'product-1', storeId: 'store-1', quantity: 2 },
    ]),
  );
  expect(screen.getByText('Не все вдалося додати')).toBeOnTheScreen();
  expect(
    useCartStore.getState().items.every((i) => i.storeId === 'store-1'),
  ).toBe(true);
});
test('address deletion requires confirmation and safely clears selection', async () => {
  useAddressStore.setState({ addresses: [address], selectedId: address.id });
  setup(<AddressesScreen />);
  fireEvent.press(screen.getByLabelText('Видалити адресу: Київ, Тестова, 1'));
  expect(useAddressStore.getState().addresses).toHaveLength(1);
  fireEvent.press(screen.getByRole('button', { name: 'Скасувати' }));
  expect(useAddressStore.getState().addresses).toHaveLength(1);
  fireEvent.press(screen.getByLabelText('Видалити адресу: Київ, Тестова, 1'));
  fireEvent.press(
    screen.getByRole('button', { name: 'Підтвердити видалення' }),
  );
  expect(useAddressStore.getState()).toMatchObject({
    addresses: [],
    selectedId: null,
  });
});
test('address form adds, edits and sets default through the shared store', async () => {
  setup(<AddressesScreen />);
  fireEvent.press(screen.getByRole('button', { name: 'Додати адресу' }));
  fireEvent.changeText(screen.getByTestId('address-street'), 'Тестова');
  fireEvent.changeText(screen.getByTestId('address-building'), '8');
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти адресу' }));
  await waitFor(() =>
    expect(useAddressStore.getState().addresses).toHaveLength(1),
  );
  fireEvent.press(screen.getByLabelText('Редагувати адресу: Київ, Тестова, 8'));
  fireEvent.changeText(screen.getByTestId('address-building'), '9');
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти адресу' }));
  await waitFor(() =>
    expect(useAddressStore.getState().addresses[0].building).toBe('9'),
  );
  expect(useAddressStore.getState().addresses[0].isDefault).toBe(true);
});
test('personal form validates and saves through repository', async () => {
  const r = createMockRepositories({ demoAccount: true });
  const save = jest.spyOn(r.users, 'updateCurrent');
  setup(<PersonalScreen />, r);
  fireEvent.press(await screen.findByRole('button', { name: 'Зберегти дані' }));
  expect(await screen.findByText('Вкажіть ім’я')).toBeOnTheScreen();
  expect(save).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByTestId('personal-name'), 'Олена');
  fireEvent.changeText(screen.getByTestId('personal-phone'), '0501234567');
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти дані' }));
  expect(await screen.findByText('Дані збережено')).toBeOnTheScreen();
  expect(save).toHaveBeenCalledWith({
    name: 'Олена',
    phone: '+380501234567',
    email: '',
  });
});
test('support FAQ toggles and unconfigured contact is disabled', () => {
  setup(<SupportScreen />);
  const button = screen.getByRole('button', { name: 'Як змінити магазин?' });
  expect(button.props.accessibilityState.expanded).toBe(false);
  fireEvent.press(button);
  expect(button.props.accessibilityState.expanded).toBe(true);
  fireEvent.press(button);
  expect(button.props.accessibilityState.expanded).toBe(false);
  expect(
    screen.getByRole('button', { name: 'Написати підтримці' }),
  ).toBeDisabled();
});
test('notification controls update local preferences without permissions', () => {
  setup(<NotificationsScreen />);
  fireEvent(screen.getByLabelText('Акції та новинки'), 'valueChange', true);
  expect(useNotificationPreferences.getState().promotions).toBe(true);
});
test('settings exposes Ukrainian language and disabled unsupplied legal links', () => {
  setup(<SettingsScreen />);
  expect(screen.getByText('Українська')).toBeOnTheScreen();
  expect(
    screen.getByRole('button', { name: 'Політика конфіденційності' }),
  ).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Сповіщення' }));
  expect(router.push).toHaveBeenCalledWith('/settings/notifications');
});

test('complete reorder commits only once during repeated presses', async () => {
  const r = createMockRepositories();
  const order = await r.orders.create(await testOrderInput(r));
  setup(<OrderDetailScreen id={order.id} />, r);
  const button = await screen.findByRole('button', {
    name: 'Повторити замовлення',
  });
  fireEvent.press(button);
  fireEvent.press(button);
  expect(await screen.findByText('Товари додано до кошика')).toBeOnTheScreen();
  expect(useCartStore.getState().items).toEqual([
    { productId: 'product-1', storeId: 'store-1', quantity: 2 },
  ]);
});
test('account controls wait for local persistence hydration', () => {
  useSessionStore.setState({ hydrated: false });
  setup(<NotificationsScreen />);
  expect(screen.queryByLabelText('Акції та новинки')).toBeNull();
  expect(screen.getByLabelText('Завантаження списку')).toBeOnTheScreen();
  act(() => useSessionStore.setState({ hydrated: true }));
  expect(screen.getByLabelText('Акції та новинки')).toBeOnTheScreen();
});

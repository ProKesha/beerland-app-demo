import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { CartScreen } from '@/features/cart/CartScreen';
import { CheckoutScreen } from '@/features/checkout/CheckoutScreen';
import {
  AddressBook,
  AddressForm,
} from '@/features/checkout/components/AddressBook';
import { OrderSuccessScreen } from '@/features/orders/OrderSuccessScreen';
import { useCreateOrder } from '@/features/orders/useCreateOrder';
import { useCartQuote, fetchCartQuote } from '@/features/cart/useCartQuote';
import { StorePicker } from '@/features/home/components/StoreSelectorCard';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useSessionStore } from '@/stores/session';
import { useCheckoutStore, useAddressStore } from '@/stores/checkout';
import { createDiscoveryWrapper } from '@/test/createDiscoveryWrapper';
import { createMockRepositories } from '@/services/mock/repositories';
import { checkoutItem, checkoutDetails, testOrderInput } from '@/test/checkout';
import type { Repositories } from '@/repositories/contracts';
import { formatMoney } from '@/utils/format';
import { uah } from '@/features/cart/pricing';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useCartStore.setState({ items: [{ ...checkoutItem, quantity: 1 }] });
  useSelectedStore.setState({ storeId: 'store-1' });
  useFulfillmentStore.setState({ method: 'pickup' });
  useSessionStore.setState({ hydrated: true });
  useCheckoutStore.getState().reset();
  useAddressStore.setState({ addresses: [], selectedId: null });
});
afterEach(cleanup);
function setup(
  ui: React.ReactElement,
  repo: Repositories = createMockRepositories(),
) {
  return render(ui, { wrapper: createDiscoveryWrapper(repo).wrapper });
}
async function cartReady() {
  await screen.findByTestId('cart-checkout');
}
async function checkoutReady() {
  await screen.findByTestId('order-total');
}
function fillContacts() {
  fireEvent.changeText(
    screen.getByTestId('customer-name'),
    'Тестовий покупець',
  );
  fireEvent.changeText(screen.getByTestId('customer-phone'), '0501234567');
}
function confirmAge() {
  fireEvent.press(screen.getByTestId('age-confirmation'));
}
function submit() {
  fireEvent.press(screen.getByTestId('submit-order'));
}

test('checkout age confirmation exposes its checked state and can be toggled off', async () => {
  setup(<CheckoutScreen />);
  await checkoutReady();
  const checkbox = () =>
    screen.getByRole('checkbox', {
      name: 'Підтверджую, що мені виповнилося 18 років.',
    });
  expect(checkbox()).not.toBeChecked();
  fireEvent.press(checkbox());
  expect(checkbox()).toBeChecked();
  fireEvent.press(checkbox());
  expect(checkbox()).not.toBeChecked();
  fillContacts();
  submit();
  expect(
    await screen.findByText('Підтвердіть, що вам виповнилося 18 років'),
  ).toBeOnTheScreen();
  expect(router.replace).not.toHaveBeenCalled();
});

test('empty cart has a catalog action', () => {
  useCartStore.setState({ items: [] });
  setup(<CartScreen />);
  expect(screen.getByText('У кошику поки порожньо')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Перейти до каталогу'));
  expect(router.push).toHaveBeenCalledWith('/catalog');
});
test('hydration waits before showing empty cart or editable checkout', () => {
  useSessionStore.setState({ hydrated: false });
  setup(<CheckoutScreen />);
  expect(screen.queryByTestId('customer-name')).toBeNull();
});
test('cart displays variants separately and quantity totals update immediately', async () => {
  useCartStore
    .getState()
    .addItem({ ...checkoutItem, variantId: '1000-ml', quantity: 1 });
  setup(<CartScreen />);
  await cartReady();
  expect(screen.getAllByText('Світлий берег')).toHaveLength(2);
  expect(screen.getByText('1 л')).toBeOnTheScreen();
  expect(screen.getByTestId('order-total')).toHaveTextContent(
    formatMoney(uah(15000)),
  );
  fireEvent.press(screen.getByLabelText('Збільшити: Світлий берег, 500 мл'));
  expect(screen.getByTestId('order-total')).toHaveTextContent(
    formatMoney(uah(20000)),
  );
  fireEvent.press(screen.getByLabelText('Зменшити: Світлий берег, 500 мл'));
  expect(screen.getByTestId('order-total')).toHaveTextContent(
    formatMoney(uah(15000)),
  );
});
test('quantity stops at the variant maximum and removal targets one variant', async () => {
  useCartStore.setState({
    items: [
      { ...checkoutItem, quantity: 12 },
      { ...checkoutItem, variantId: '1000-ml', quantity: 1 },
    ],
  });
  setup(<CartScreen />);
  await cartReady();
  expect(
    screen.getByLabelText('Збільшити: Світлий берег, 500 мл'),
  ).toBeDisabled();
  fireEvent.press(screen.getByLabelText('Видалити: Світлий берег, 500 мл'));
  expect(useCartStore.getState().items).toEqual([
    { ...checkoutItem, variantId: '1000-ml', quantity: 1 },
  ]);
});
test('an over-limit persisted quantity can be reduced without hiding its actual total', async () => {
  useCartStore.setState({ items: [{ ...checkoutItem, quantity: 13 }] });
  setup(<CartScreen />);
  await cartReady();
  expect(screen.getByTestId('cart-checkout')).toBeDisabled();
  expect(screen.getByLabelText('Світлий берег, 500 мл: 13')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Зменшити: Світлий берег, 500 мл'));
  expect(screen.getByTestId('cart-checkout')).toBeEnabled();
});
test('unavailable variant blocks checkout without dropping the cart line', async () => {
  useCartStore.setState({ items: [{ ...checkoutItem, variantId: '1500-ml' }] });
  setup(<CartScreen />);
  await cartReady();
  expect(screen.getByText('Немає в обраному магазині')).toBeOnTheScreen();
  expect(screen.getByTestId('cart-checkout')).toBeDisabled();
  expect(useCartStore.getState().items).toHaveLength(1);
});
test('cart repository error can be retried', async () => {
  const repo = createMockRepositories();
  jest
    .spyOn(repo.products, 'getById')
    .mockRejectedValueOnce(new Error('offline'));
  setup(<CartScreen />, repo);
  fireEvent.press(await screen.findByText('Повторити'));
  await cartReady();
});
test('Home fulfillment state carries into cart and delivery fee switches synchronously', async () => {
  useFulfillmentStore.setState({ method: 'delivery' });
  setup(<CartScreen />);
  await cartReady();
  expect(screen.getByTestId('order-total')).toHaveTextContent(
    formatMoney(uah(11000)),
  );
  fireEvent.press(screen.getByRole('button', { name: 'Самовивіз' }));
  expect(useFulfillmentStore.getState().method).toBe('pickup');
  expect(screen.getByTestId('order-total')).toHaveTextContent(
    formatMoney(uah(5000)),
  );
});
test('cart rechecks inventory before navigating to checkout', async () => {
  const repo = createMockRepositories();
  const get = jest.spyOn(repo.products, 'getById');
  setup(<CartScreen />, repo);
  await cartReady();
  const count = get.mock.calls.length;
  fireEvent.press(screen.getByTestId('cart-checkout'));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/checkout'));
  expect(get.mock.calls.length).toBeGreaterThan(count);
});
test('changed price requires a second review before checkout', async () => {
  const repo = createMockRepositories();
  setup(<CartScreen />, repo);
  await cartReady();
  const product = (await repo.products.getById('product-1'))!;
  product.storeOffers = [
    { storeId: 'store-1', availability: 'available', price: uah(8000) },
  ];
  jest.spyOn(repo.products, 'getById').mockResolvedValue(product);
  fireEvent.press(screen.getByTestId('cart-checkout'));
  await screen.findByText('Ціни оновилися. Перевірте підсумок і продовжте.');
  expect(router.push).not.toHaveBeenCalled();
  expect(screen.getByTestId('order-total')).toHaveTextContent(
    formatMoney(uah(8000)),
  );
  fireEvent.press(screen.getByTestId('cart-checkout'));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/checkout'));
});
test('store switch prompts and cancel preserves cart and store selection', async () => {
  const repo = createMockRepositories();
  const onSelect = jest.fn();
  setup(
    <StorePicker
      visible
      stores={await repo.stores.list()}
      selectedId="store-1"
      onSelect={onSelect}
      onClose={jest.fn()}
    />,
    repo,
  );
  fireEvent.press(screen.getByLabelText('Обрати магазин: Beerland Демо 2'));
  expect(screen.getByText('Змінити магазин?')).toBeOnTheScreen();
  expect(useCartStore.getState().items).toHaveLength(1);
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Скасувати'));
  expect(useCartStore.getState().items).toHaveLength(1);
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Обрати магазин: Beerland Демо 2'));
  fireEvent.press(screen.getByRole('button', { name: 'Перенести кошик' }));
  await waitFor(() =>
    expect(useCartStore.getState().items).toEqual([
      { ...checkoutItem, quantity: 1, storeId: 'store-2' },
    ]),
  );
  expect(onSelect).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'store-2' }),
  );
});
test('checkout validates contacts, age and address without creating an order', async () => {
  useFulfillmentStore.setState({ method: 'delivery' });
  const repo = createMockRepositories();
  const create = jest.spyOn(repo.orders, 'create');
  setup(<CheckoutScreen />, repo);
  await checkoutReady();
  submit();
  await screen.findByText('Вкажіть ім’я');
  expect(screen.getByText('Додайте адресу доставки')).toBeOnTheScreen();
  expect(
    screen.getByText('Підтвердіть, що вам виповнилося 18 років'),
  ).toBeOnTheScreen();
  expect(create).not.toHaveBeenCalled();
});
test('address form shows inline validation and saves structured data locally', async () => {
  const saved = jest.fn();
  setup(<AddressForm onSaved={saved} onCancel={jest.fn()} />);
  fireEvent.press(screen.getByText('Зберегти адресу'));
  await screen.findByText('Вкажіть вулицю');
  expect(screen.getByText('Вкажіть будинок')).toBeOnTheScreen();
  fireEvent.changeText(screen.getByTestId('address-street'), 'Тестова');
  fireEvent.changeText(screen.getByTestId('address-building'), '17');
  fireEvent.changeText(screen.getByTestId('address-entrance'), '2');
  fireEvent.press(screen.getByText('Зберегти адресу'));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(useAddressStore.getState().addresses[0]).toMatchObject({
    city: 'Київ',
    street: 'Тестова',
    building: '17',
    entrance: '2',
    isDefault: true,
  });
  expect(await AsyncStorage.getItem('beerland:addresses')).toContain('Тестова');
});
test('saved address selection works and edit opens the existing address', () => {
  useAddressStore
    .getState()
    .save({ id: 'a', city: 'Київ', street: 'Тестова', building: '1' });
  useAddressStore
    .getState()
    .save({ id: 'b', city: 'Київ', street: 'Інша', building: '2' });
  setup(<AddressBook />);
  fireEvent.press(screen.getByLabelText('Обрати адресу: Київ, Тестова, 1'));
  expect(useAddressStore.getState().selectedId).toBe('a');
  fireEvent.press(
    within(screen.getByTestId('saved-a')).getByText('Редагувати'),
  );
  expect(screen.getByTestId('address-building')).toHaveDisplayValue('1');
});
test('pickup submits structured payload, comments and payment; success clears cart', async () => {
  const repo = createMockRepositories();
  const create = jest.spyOn(repo.orders, 'create');
  setup(<CheckoutScreen />, repo);
  await checkoutReady();
  fillContacts();
  confirmAge();
  fireEvent.press(screen.getByTestId('payment-cashOnDelivery'));
  fireEvent.changeText(screen.getByTestId('order-comment'), 'Не телефонуйте');
  submit();
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/order/success',
      params: { id: 'mock-order-1042' },
    }),
  );
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      paymentMethod: 'cashOnDelivery',
      comment: 'Не телефонуйте',
      customer: {
        name: 'Тестовий покупець',
        phone: '+380501234567',
        email: '',
      },
      address: undefined,
      ageConfirmed: true,
      fulfillmentType: 'pickup',
      total: uah(5000),
    }),
  );
  expect(useCartStore.getState().items).toEqual([]);
});
test('transferred cart uses target prices and completes checkout at one store', async () => {
  const repo = createMockRepositories();
  const create = jest.spyOn(repo.orders, 'create');
  const cart = setup(<CartScreen />, repo);
  await cartReady();
  fireEvent.press(screen.getByRole('button', { name: 'Змінити магазин' }));
  fireEvent.press(
    await screen.findByLabelText('Обрати магазин: Beerland Демо 2'),
  );
  fireEvent.press(screen.getByRole('button', { name: 'Перенести кошик' }));
  await waitFor(() =>
    expect(useSelectedStore.getState().storeId).toBe('store-2'),
  );
  await waitFor(() =>
    expect(screen.getByTestId('cart-checkout')).toBeEnabled(),
  );
  fireEvent.press(screen.getByTestId('cart-checkout'));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/checkout'));
  const transferred = [...useCartStore.getState().items];
  const quote = await fetchCartQuote(repo, transferred, 'store-2', 'pickup');
  cart.unmount();
  setup(<CheckoutScreen />, repo);
  await checkoutReady();
  fillContacts();
  confirmAge();
  fireEvent.press(screen.getByTestId('payment-cashOnDelivery'));
  submit();
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      storeId: 'store-2',
      total: quote.totals.total,
      items: expect.arrayContaining([
        expect.objectContaining({ storeId: 'store-2' }),
      ]),
    }),
  );
});
test('delivery submits saved structured address and delivery fee', async () => {
  useFulfillmentStore.setState({ method: 'delivery' });
  useAddressStore.getState().save({
    id: 'a',
    city: 'Київ',
    street: 'Тестова',
    building: '1',
    apartment: '2',
  });
  const repo = createMockRepositories();
  const create = jest.spyOn(repo.orders, 'create');
  setup(<CheckoutScreen />, repo);
  await checkoutReady();
  fillContacts();
  confirmAge();
  submit();
  await waitFor(() => expect(create).toHaveBeenCalled());
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      address: expect.objectContaining({ apartment: '2' }),
      fulfillmentType: 'delivery',
      deliveryFee: uah(6000),
      total: uah(11000),
    }),
  );
});
test('repository errors preserve cart and allow a successful retry', async () => {
  let fail = true;
  const repo = createMockRepositories({
    beforeCreate: async () => {
      if (fail) throw new Error('offline');
    },
  });
  const create = jest.spyOn(repo.orders, 'create');
  setup(<CheckoutScreen />, repo);
  await checkoutReady();
  fillContacts();
  confirmAge();
  submit();
  await screen.findByText('Не вдалося оформити замовлення');
  expect(useCartStore.getState().items).toHaveLength(1);
  fail = false;
  submit();
  await waitFor(() => expect(useCartStore.getState().items).toHaveLength(0));
  expect(create.mock.calls[0][0].idempotencyKey).toBe(
    create.mock.calls[1][0].idempotencyKey,
  );
});
test('submission loading disables final CTA and prevents duplicate orders', async () => {
  let release!: () => void;
  const deferred = new Promise<void>((resolve) => {
    release = resolve;
  });
  const repo = createMockRepositories({ beforeCreate: () => deferred });
  const create = jest.spyOn(repo.orders, 'create');
  setup(<CheckoutScreen />, repo);
  await checkoutReady();
  fillContacts();
  confirmAge();
  submit();
  submit();
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId('submit-order')).toBeDisabled();
  expect(screen.getByTestId('customer-name')).toBeDisabled();
  await act(async () => release());
  await waitFor(() => expect(router.replace).toHaveBeenCalled());
  expect(await repo.orders.list()).toHaveLength(1);
});
test('success screen shows persisted receipt number, total and a home action', async () => {
  const repo = createMockRepositories();
  const order = await repo.orders.create(await testOrderInput(repo));
  setup(<OrderSuccessScreen id={order.id} />, repo);
  expect(await screen.findByTestId('order-number')).toHaveTextContent(
    '№ BL-1042',
  );
  expect(screen.getByTestId('success-total')).toHaveTextContent(
    formatMoney(uah(10000)),
  );
  fireEvent.press(screen.getByText('На головну'));
  expect(router.replace).toHaveBeenCalledWith('/');
});
test('missing success receipt is handled without a fabricated confirmation', async () => {
  setup(<OrderSuccessScreen id="missing" />);
  expect(await screen.findByText('Замовлення не знайдено')).toBeOnTheScreen();
  expect(screen.queryByText('Замовлення прийнято')).toBeNull();
});
test('checkout back explicitly returns to cart and uses keyboard/safe area screen', async () => {
  setup(<CheckoutScreen />);
  await checkoutReady();
  expect(screen.getByTestId('checkout-screen')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('До кошика'));
  expect(router.replace).toHaveBeenCalledWith('/cart');
});
test('a price change at final submit updates review and prevents creating an unreviewed order', async () => {
  const repo = createMockRepositories();
  const create = jest.spyOn(repo.orders, 'create');
  setup(<CheckoutScreen />, repo);
  await checkoutReady();
  fillContacts();
  confirmAge();
  const product = (await repo.products.getById('product-1'))!;
  product.storeOffers = [
    { storeId: 'store-1', availability: 'available', price: uah(7000) },
  ];
  jest.spyOn(repo.products, 'getById').mockResolvedValue(product);
  submit();
  await screen.findByText(
    'Ціни або наявність змінилися. Перевірте оновлений підсумок і підтвердьте ще раз.',
  );
  expect(create).not.toHaveBeenCalled();
  expect(screen.getByTestId('order-total')).toHaveTextContent(
    formatMoney(uah(7000)),
  );
  submit();
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
});
test('two checkout hook instances share a synchronous submission lock', async () => {
  let release!: () => void;
  const deferred = new Promise<void>((resolve) => {
    release = resolve;
  });
  const repo = createMockRepositories({ beforeCreate: () => deferred });
  const quote = await fetchCartQuote(
    repo,
    useCartStore.getState().items,
    'store-1',
    'pickup',
  );
  const { result } = renderHook(
    () => ({ a: useCreateOrder(), b: useCreateOrder() }),
    { wrapper: createDiscoveryWrapper(repo).wrapper },
  );
  let task!: ReturnType<typeof result.current.a.submit>;
  await act(async () => {
    task = result.current.a.submit(checkoutDetails, quote);
    expect(
      await result.current.b.submit(checkoutDetails, quote),
    ).toBeUndefined();
  });
  await act(async () => {
    release();
    await task;
  });
  expect(await repo.orders.list()).toHaveLength(1);
});
test('new items added while submitting survive successful checkout', async () => {
  let release!: () => void;
  const deferred = new Promise<void>((resolve) => {
    release = resolve;
  });
  const repo = createMockRepositories({ beforeCreate: () => deferred });
  const quote = await fetchCartQuote(
    repo,
    useCartStore.getState().items,
    'store-1',
    'pickup',
  );
  const { result } = renderHook(() => useCreateOrder(), {
    wrapper: createDiscoveryWrapper(repo).wrapper,
  });
  let task!: ReturnType<typeof result.current.submit>;
  await act(async () => {
    task = result.current.submit(checkoutDetails, quote);
  });
  await act(async () => {
    useCartStore
      .getState()
      .addItem({ productId: 'product-7', storeId: 'store-1', quantity: 1 });
    release();
    await task;
  });
  expect(useCartStore.getState().items).toEqual([
    { productId: 'product-7', storeId: 'store-1', quantity: 1 },
  ]);
});
test('quantity changes reuse inventory resources without an extra network request', async () => {
  const repo = createMockRepositories();
  const get = jest.spyOn(repo.products, 'getById');
  const { result } = renderHook(() => useCartQuote(), {
    wrapper: createDiscoveryWrapper(repo).wrapper,
  });
  await waitFor(() => expect(result.current.data?.canCheckout).toBe(true));
  const before = get.mock.calls.length;
  act(() => useCartStore.getState().setQuantity('product-1', 'store-1', 2));
  expect(result.current.data?.totals.total).toEqual(uah(10000));
  expect(get).toHaveBeenCalledTimes(before);
});

test('inventory disappearing at final submission blocks the repository and preserves cart', async () => {
  const repo = createMockRepositories();
  const create = jest.spyOn(repo.orders, 'create');
  setup(<CheckoutScreen />, repo);
  await checkoutReady();
  fillContacts();
  confirmAge();
  jest.spyOn(repo.products, 'getById').mockResolvedValue(null);
  submit();
  await screen.findByText(
    'Кошик потребує уваги. Перевірте наявність товарів і спосіб отримання.',
  );
  expect(create).not.toHaveBeenCalled();
  expect(useCartStore.getState().items).toHaveLength(1);
  expect(screen.getByTestId('submit-order')).toBeDisabled();
});

test('checkout recheck rejects a cart edited during the inventory request', async () => {
  const repo = createMockRepositories();
  const quote = await fetchCartQuote(
    repo,
    useCartStore.getState().items,
    'store-1',
    'pickup',
  );
  const product = quote.lines[0].product;
  let release!: () => void;
  const deferred = new Promise<void>((resolve) => {
    release = resolve;
  });
  jest.spyOn(repo.products, 'getById').mockImplementation(async () => {
    await deferred;
    return product;
  });
  const create = jest.spyOn(repo.orders, 'create');
  const { result } = renderHook(() => useCreateOrder(), {
    wrapper: createDiscoveryWrapper(repo).wrapper,
  });
  await act(async () => {
    const task = result.current.submit(checkoutDetails, quote);
    useCartStore.getState().setQuantity('product-1', 'store-1', 3);
    release();
    await expect(task).rejects.toThrow(
      /Кошик змінився|Ціни або наявність змінилися/,
    );
  });
  expect(create).not.toHaveBeenCalled();
  expect(useCartStore.getState().items[0].quantity).toBe(3);
});

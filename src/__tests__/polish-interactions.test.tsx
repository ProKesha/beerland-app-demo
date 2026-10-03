import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { QuantityControl } from '@/components/ui';
import { ProductImage } from '@/features/product/components/ProductImage';
import { resolveProductImage } from '@/assets/images';
import { CheckoutScreen } from '@/features/checkout/CheckoutScreen';
import { CartScreen } from '@/features/cart/CartScreen';
import { createMockRepositories } from '@/services/mock/repositories';
import { createDiscoveryWrapper } from '@/test/createDiscoveryWrapper';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useSessionStore } from '@/stores/session';
import { useAddressStore, useCheckoutStore } from '@/stores/checkout';
import { useAuthFlow } from '@/features/auth/flow';
import { OtpScreen, PhoneScreen } from '@/features/auth/Screens';
import { formatMoney } from '@/utils/format';
import { uah } from '@/features/cart/pricing';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/config/env', () => ({
  config: { demoAuthEnabled: true, developmentToolsEnabled: true },
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  useSessionStore.setState({ status: 'guest', user: null, hydrated: true });
  useCartStore.setState({
    items: [{ productId: 'product-1', storeId: 'store-1', quantity: 2 }],
  });
  useSelectedStore.setState({ storeId: 'store-1' });
  useFulfillmentStore.setState({ method: 'pickup' });
  useAddressStore.setState({ addresses: [], selectedId: null, seeded: true });
  useCheckoutStore.getState().reset();
  useAuthFlow.getState().reset();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('quantity events in one render batch count every tap and stop at the bound', () => {
  const change = jest.fn();
  render(<QuantityControl value={1} min={1} max={4} onChange={change} />);
  const plus = screen.getByRole('button', { name: 'Збільшити: Кількість' });
  act(() => {
    for (let index = 0; index < 6; index++) fireEvent.press(plus);
  });
  expect(change.mock.calls.map(([value]) => value)).toEqual([2, 3, 4]);
});
test('external controlled quantity changes replace the value used for the next tap', () => {
  const change = jest.fn();
  const { rerender } = render(
    <QuantityControl value={1} min={1} max={8} onChange={change} />,
  );
  fireEvent.press(screen.getByRole('button', { name: 'Збільшити: Кількість' }));
  rerender(<QuantityControl value={5} min={1} max={8} onChange={change} />);
  fireEvent.press(screen.getByRole('button', { name: 'Зменшити: Кількість' }));
  expect(change).toHaveBeenLastCalledWith(4);
});
test('a rapid cart quantity burst updates live quantities and derived totals', async () => {
  const r = createMockRepositories();
  render(<CartScreen />, { wrapper: createDiscoveryWrapper(r).wrapper });
  const plus = await screen.findByRole('button', {
    name: 'Збільшити: Світлий берег, 500 мл',
  });
  act(() => {
    fireEvent.press(plus);
    fireEvent.press(plus);
    fireEvent.press(plus);
  });
  expect(useCartStore.getState().items[0].quantity).toBe(5);
  expect(await screen.findByTestId('order-total')).toHaveTextContent(
    formatMoney(uah(25000)),
  );
});
test('an initial checkout inventory failure exposes retry and preserves the cart', async () => {
  const r = createMockRepositories();
  jest
    .spyOn(r.products, 'getById')
    .mockRejectedValueOnce(Error('internal sensitive details'));
  render(<CheckoutScreen />, { wrapper: createDiscoveryWrapper(r).wrapper });
  fireEvent.press(await screen.findByRole('button', { name: 'Повторити' }));
  await waitFor(() => expect(screen.getByTestId('submit-order')).toBeEnabled());
  expect(useCartStore.getState().items[0].quantity).toBe(2);
  expect(screen.queryByText(/internal sensitive/)).toBeNull();
});
test('a stalled product photo becomes a named fallback and a changed source can load', () => {
  jest.useFakeTimers();
  const { rerender } = render(
    <ProductImage
      label="Лагер"
      source={{ uri: 'https://example.com/slow.png' }}
    />,
  );
  act(() => jest.advanceTimersByTime(12000));
  expect(screen.getByLabelText('Лагер: фото поки немає')).toBeOnTheScreen();
  expect(screen.queryByRole('progressbar')).toBeNull();
  rerender(
    <ProductImage
      label="Лагер"
      source={{ uri: 'https://example.com/valid.png' }}
    />,
  );
  expect(screen.getByRole('progressbar')).toBeOnTheScreen();
  fireEvent(
    screen.getByLabelText('Лагер', { includeHiddenElements: true }),
    'load',
  );
  act(() => jest.advanceTimersByTime(12000));
  expect(screen.getByLabelText('Лагер')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Лагер: фото поки немає')).toBeNull();
});
test.each([
  'https://',
  'http://example.com/image.png',
  'javascript:alert(1)',
  'https://user:password@example.com/image.png',
])('unsafe or malformed product image sources use fallback: %s', (source) => {
  expect(resolveProductImage(source)).toBeUndefined();
});
test('failed OTP restoration can retry and phone cancellation errors remain recoverable', async () => {
  const r = createMockRepositories({ authEnabled: true });
  const challenge = await r.auth.requestOtp('0501234567');
  const pending = jest
    .spyOn(r.auth, 'getPendingChallenge')
    .mockRejectedValueOnce(Error('disk'));
  jest.spyOn(r.auth, 'cancelChallenge').mockRejectedValueOnce(Error('disk'));
  render(<OtpScreen />, { wrapper: createDiscoveryWrapper(r).wrapper });
  fireEvent.press(
    await screen.findByRole('button', { name: 'Повторити відновлення коду' }),
  );
  await waitFor(() =>
    expect(useAuthFlow.getState().challenge?.id).toBe(challenge.id),
  );
  expect(pending).toHaveBeenCalledTimes(2);
  fireEvent.press(screen.getByRole('button', { name: 'Змінити номер' }));
  expect(
    await screen.findByText('Не вдалося змінити номер. Спробуйте ще раз.'),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Змінити номер' }));
  await waitFor(() => expect(useAuthFlow.getState().challenge).toBeNull());
});
test('phone fields and exit actions are disabled while an authentication operation is busy', () => {
  useAuthFlow.setState({ busy: true });
  render(<PhoneScreen />, { wrapper: createDiscoveryWrapper().wrapper });
  expect(screen.getByTestId('auth-phone')).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Продовжити як гість' }),
  ).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Назад' })).toBeDisabled();
});

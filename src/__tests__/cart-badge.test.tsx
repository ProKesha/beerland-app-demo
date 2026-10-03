import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { CartIcon } from '@/components/common/CartIcon';
import { ShopChrome } from '@/components/common/ShopChrome';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { commitCartTransfer } from '@/stores/cartTransfer';
import {
  countActiveCartLines,
  formatCartAccessibilityLabel,
  formatCartBadge,
} from '@/stores/cartSelectors';
import { prepareCartTransfer } from '@/features/cart/transfer';
import { createMockRepositories } from '@/services/mock/repositories';
import type { CartItem } from '@/types/domain';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const line: CartItem = {
  productId: 'product-1',
  storeId: 'store-1',
  quantity: 3,
};
const badge = () =>
  screen.getByTestId('cart-icon-badge', { includeHiddenElements: true });

beforeEach(async () => {
  jest.clearAllMocks();
  useCartStore.getState().clear();
  useSelectedStore.getState().select(null);
  await AsyncStorage.clear();
});

test('positions deduplicate product, canonical variant and store instead of quantities', () => {
  expect(
    countActiveCartLines([
      line,
      { ...line, quantity: 10, variantId: 'default' },
      { ...line, variantId: '1000-ml' },
      { ...line, storeId: 'store-2' },
      { ...line, productId: 'product-2' },
    ]),
  ).toBe(4);
});

test('identity tuples cannot collide when IDs contain separators', () => {
  expect(
    countActiveCartLines([
      { ...line, productId: 'a:b', variantId: 'c', storeId: 'd' },
      { ...line, productId: 'a', variantId: 'b:c', storeId: 'd' },
    ]),
  ).toBe(2);
});

test('only positive integer cart lines contribute to the badge', () => {
  expect(
    countActiveCartLines(
      [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map(
        (quantity, index) => ({
          ...line,
          productId: `invalid-${index}`,
          quantity,
        }),
      ),
    ),
  ).toBe(0);
  expect(countActiveCartLines([line])).toBe(1);
});

test.each([
  [0, 'Кошик, порожній'],
  [1, 'Кошик, 1 товар'],
  [2, 'Кошик, 2 товари'],
  [3, 'Кошик, 3 товари'],
  [4, 'Кошик, 4 товари'],
  [5, 'Кошик, 5 товарів'],
  [11, 'Кошик, 11 товарів'],
  [12, 'Кошик, 12 товарів'],
  [14, 'Кошик, 14 товарів'],
  [21, 'Кошик, 21 товар'],
  [22, 'Кошик, 22 товари'],
  [99, 'Кошик, 99 товарів'],
  [100, 'Кошик, 100 товарів'],
  [111, 'Кошик, 111 товарів'],
  [114, 'Кошик, 114 товарів'],
])(
  'cart accessibility uses Ukrainian plurals for %s positions',
  (count, label) => {
    expect(formatCartAccessibilityLabel(count)).toBe(label);
  },
);

test('badge presentation hides zero, shows integers and caps large values', () => {
  expect(formatCartBadge(0)).toBeUndefined();
  expect(formatCartBadge(1)).toBe('1');
  expect(formatCartBadge(99)).toBe('99');
  expect(formatCartBadge(100)).toBe('99+');
});

test('header cart badge reacts synchronously to adding, quantity changes, removal and clear', () => {
  render(<ShopChrome />);
  expect(
    screen.getByRole('button', { name: 'Кошик, порожній' }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByTestId('cart-icon-badge', { includeHiddenElements: true }),
  ).toBeNull();
  act(() => useCartStore.getState().addItem(line));
  expect(
    screen.getByRole('button', { name: 'Кошик, 1 товар' }),
  ).toBeOnTheScreen();
  expect(badge()).toHaveTextContent('1');
  act(() => useCartStore.getState().setQuantity('product-1', 'store-1', 6));
  expect(badge()).toHaveTextContent('1');
  act(() => {
    useCartStore.getState().addItem({ ...line, variantId: '1000-ml' });
    useCartStore.getState().addItem({ ...line, productId: 'product-2' });
  });
  expect(badge()).toHaveTextContent('3');
  expect(
    screen.getByRole('button', { name: 'Кошик, 3 товари' }),
  ).toBeOnTheScreen();
  act(() => {
    useCartStore.getState().removeItem('product-2', 'store-1');
  });
  expect(badge()).toHaveTextContent('2');
  act(() => useCartStore.getState().setQuantity('product-1', 'store-1', 0));
  expect(badge()).toHaveTextContent('1');
  act(() => {
    useCartStore.getState().clear();
  });
  expect(
    screen.getByRole('button', { name: 'Кошик, порожній' }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByTestId('cart-icon-badge', { includeHiddenElements: true }),
  ).toBeNull();
});

test('changing a variant keeps one position and merging into an existing variant removes one', () => {
  useCartStore.getState().addItem(line);
  render(<ShopChrome />);
  act(() => {
    useCartStore.getState().replaceVariant('product-1', 'store-1', '1000-ml');
  });
  expect(badge()).toHaveTextContent('1');
  act(() => useCartStore.getState().addItem({ ...line, variantId: 'default' }));
  expect(badge()).toHaveTextContent('2');
  act(() => {
    useCartStore
      .getState()
      .replaceVariant('product-1', 'store-1', 'default', '1000-ml');
  });
  expect(badge()).toHaveTextContent('1');
  expect(useCartStore.getState().items).toHaveLength(1);
  expect(useCartStore.getState().items[0].quantity).toBe(6);
});

test('persisted cart restoration refreshes the header count and canonical default identities', async () => {
  render(<ShopChrome />);
  await AsyncStorage.setItem(
    'beerland:cart',
    JSON.stringify({
      version: 1,
      state: {
        items: [
          line,
          { ...line, variantId: 'default', quantity: 1 },
          { ...line, variantId: '1000-ml', quantity: 2 },
        ],
      },
    }),
  );
  await act(() => useCartStore.persist.rehydrate());
  expect(
    screen.getByRole('button', { name: 'Кошик, 2 товари' }),
  ).toBeOnTheScreen();
  expect(badge()).toHaveTextContent('2');
});

test('repository store transfer preserves the badge count and immediately publishes target lines', async () => {
  const items = [line, { ...line, variantId: '1000-ml', quantity: 2 }];
  useCartStore.setState({ items });
  useSelectedStore.getState().select('store-1');
  render(<ShopChrome />);
  const transfer = await prepareCartTransfer(
    items,
    'store-2',
    'pickup',
    createMockRepositories(),
  );
  act(() => commitCartTransfer(transfer.items, 'store-2'));
  expect(
    screen.getByRole('button', { name: 'Кошик, 2 товари' }),
  ).toBeOnTheScreen();
  expect(badge()).toHaveTextContent('2');
  expect(useCartStore.getState().items).toEqual(
    items.map((item) => ({ ...item, storeId: 'store-2' })),
  );
});

test('large cart visually caps its badge while announcing the exact number of positions', () => {
  useCartStore.setState({
    items: Array.from({ length: 100 }, (_, index) => ({
      ...line,
      productId: `product-${index}`,
    })),
  });
  render(<ShopChrome />);
  expect(badge()).toHaveTextContent('99+');
  expect(
    screen.getByRole('button', { name: 'Кошик, 100 товарів' }),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Кошик, 100 товарів' }));
  expect(router.push).toHaveBeenCalledWith('/cart');
});

test('icon active shape comes from the cart store and navigator mode delegates its badge', () => {
  render(<CartIcon showBadge={false} />);
  expect(
    screen.queryByTestId('cart-content-indicator', {
      includeHiddenElements: true,
    }),
  ).toBeNull();
  act(() => useCartStore.getState().addItem(line));
  expect(
    screen.getByTestId('cart-content-indicator', {
      includeHiddenElements: true,
    }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByTestId('cart-icon-badge', { includeHiddenElements: true }),
  ).toBeNull();
});

import type { ReactElement } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type { Product, ProductVariant } from '@/types/domain';
import type { Repositories } from '@/repositories/contracts';
import { createMockRepositories } from '@/services/mock/repositories';
import { createDiscoveryWrapper } from '@/test/createDiscoveryWrapper';
import { ProductCard } from '@/features/product/components/ProductCard';
import { CartScreen } from '@/features/cart/CartScreen';
import {
  addProductToCart,
  addProductVariantToCart,
  stepProductCartLine,
} from '@/features/product/cartActions';
import { productVariants } from '@/features/product/variants';
import {
  formatProductQuantity,
  formatSellingUnit,
  priceUnit,
} from '@/features/product/quantityFormat';
import { prepareCartTransfer } from '@/features/cart/transfer';
import { commitCartTransfer } from '@/stores/cartTransfer';
import { createQuote, uah } from '@/features/cart/pricing';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useCheckoutStore } from '@/stores/checkout';
import { formatMoney } from '@/utils/format';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

let draft: Product;
let bottle: Product;
let snack: Product;

beforeEach(async () => {
  await AsyncStorage.clear();
  useCartStore.setState({ items: [] });
  useSelectedStore.setState({ storeId: 'store-1' });
  useSessionStore.setState({
    status: 'guest',
    user: null,
    hydrated: true,
    error: null,
  });
  useFulfillmentStore.setState({ method: 'pickup' });
  useCheckoutStore.getState().reset();
  const repository = createMockRepositories().products;
  draft = (await repository.getById('product-1'))!;
  bottle = (await repository.getById('product-8'))!;
  snack = (await repository.getById('product-7'))!;
});

afterEach(() => {
  cleanup();
  useCartStore.getState().clear();
  jest.restoreAllMocks();
});

function setup(
  ui: ReactElement,
  repositories: Repositories = createMockRepositories(),
) {
  return render(ui, {
    wrapper: createDiscoveryWrapper(repositories).wrapper,
  });
}

function card(product: Product, disabled = false) {
  return (
    <ProductCard
      product={product}
      onFavorite={jest.fn()}
      onAddToCart={(value) =>
        addProductToCart(value, useSelectedStore.getState().storeId!, !disabled)
      }
      disabled={disabled}
    />
  );
}

function firstLine() {
  return useCartStore.getState().items[0];
}

function variant(product: Product, id = 'default'): ProductVariant {
  return productVariants(product).find((entry) => entry.id === id)!;
}

test('draft card adds the minimum serving and switches only through available repository sizes', () => {
  setup(card(draft));
  fireEvent.press(screen.getByLabelText(`Додати в кошик: ${draft.name}`));
  expect(firstLine()).toEqual({
    productId: draft.id,
    storeId: 'store-1',
    quantity: 1,
  });
  expect(
    screen.getByLabelText(`${draft.name}, у кошику: 0,5 л`),
  ).toBeOnTheScreen();
  fireEvent.press(
    screen.getByLabelText(`Збільшити об’єм до 1 л: ${draft.name}`),
  );
  expect(firstLine()).toMatchObject({ variantId: '1000-ml', quantity: 1 });
  expect(
    screen.getByLabelText(`${draft.name}, у кошику: 1 л`),
  ).toBeOnTheScreen();
  expect(
    screen.getByLabelText(`Збільшити об’єм: ${draft.name}`),
  ).toBeDisabled();
  expect(useCartStore.getState().items).toHaveLength(1);
  expect(firstLine().variantId).not.toBe('1500-ml');
});

test('draft decrement moves to the previous serving and removes the minimum line', () => {
  useCartStore.setState({
    items: [
      {
        productId: draft.id,
        variantId: '1000-ml',
        storeId: 'store-1',
        quantity: 1,
      },
    ],
  });
  setup(card(draft));
  fireEvent.press(
    screen.getByLabelText(`Зменшити об’єм до 0,5 л: ${draft.name}`),
  );
  expect(firstLine()).toMatchObject({ variantId: 'default', quantity: 1 });
  fireEvent.press(screen.getByLabelText(`Видалити з кошика: ${draft.name}`));
  expect(useCartStore.getState().items).toEqual([]);
  expect(screen.getByLabelText(`Додати в кошик: ${draft.name}`)).toBeEnabled();
});

test('same-render draft taps reach the final supported size without duplicate lines', () => {
  useSelectedStore.setState({ storeId: 'store-2' });
  addProductToCart(draft, 'store-2', true);
  setup(card(draft));
  const plus = screen.getByLabelText(`Збільшити об’єм до 1 л: ${draft.name}`);
  act(() => {
    for (let index = 0; index < 8; index++) fireEvent.press(plus);
  });
  expect(useCartStore.getState().items).toEqual([
    {
      productId: draft.id,
      storeId: 'store-2',
      variantId: '1500-ml',
      quantity: 1,
    },
  ]);
  expect(
    screen.getByLabelText(`${draft.name}, у кошику: 1,5 л`),
  ).toBeOnTheScreen();
});

test('single-serving draft products disable increase and never invent larger volumes', async () => {
  const product =
    (await createMockRepositories().products.getById('product-5'))!;
  expect(product.variants).toBeUndefined();
  addProductToCart(product, 'store-1', true);
  setup(card(product));
  const plus = screen.getByLabelText(`Збільшити об’єм: ${product.name}`);
  expect(plus).toBeDisabled();
  fireEvent.press(plus);
  expect(firstLine()).toMatchObject({ productId: product.id, quantity: 1 });
  expect(firstLine().variantId).toBeUndefined();
});

test('unsorted serving metadata is ordered by amount and unavailable gaps are skipped', () => {
  const small = variant(draft);
  const large = variant(draft, '1500-ml');
  const product: Product = {
    ...draft,
    variants: [
      { ...large, storeOffers: undefined, availability: 'available' },
      {
        ...variant(draft, '1000-ml'),
        storeOffers: undefined,
        availability: 'unavailable',
      },
      small,
    ],
  };
  expect(addProductToCart(product, 'store-1', true)).toBe('added');
  expect(firstLine().variantId).toBeUndefined();
  stepProductCartLine(product, 'store-1', 1, true);
  expect(firstLine()).toMatchObject({ variantId: '1500-ml', quantity: 1 });
  stepProductCartLine(product, 'store-1', -1, true);
  expect(firstLine()).toMatchObject({ variantId: 'default', quantity: 1 });
});

test('fast add chooses the first available size when the minimum store offer is unavailable', () => {
  const product: Product = {
    ...draft,
    variants: productVariants(draft).map((entry) =>
      entry.id === 'default' ? { ...entry, storeOffers: [] } : entry,
    ),
  };
  expect(addProductToCart(product, 'store-1', true)).toBe('added');
  expect(firstLine()).toMatchObject({ variantId: '1000-ml', quantity: 1 });
});

test('draft increase skips same-volume variant aliases and reaches the next larger serving', () => {
  const small = variant(draft);
  const product: Product = {
    ...draft,
    variants: [
      small,
      { ...small, id: 'default-alias' },
      variant(draft, '1000-ml'),
    ],
  };
  addProductToCart(product, 'store-1', true);
  setup(card(product));
  fireEvent.press(
    screen.getByLabelText(`Збільшити об’єм до 1 л: ${product.name}`),
  );
  expect(useCartStore.getState().items).toEqual([
    {
      productId: product.id,
      storeId: 'store-1',
      variantId: '1000-ml',
      quantity: 1,
    },
  ]);
});

test.each(['unavailable', 'unknown'] as const)(
  '%s parent offer cannot be purchased through inline controls',
  (availability) => {
    const product: Product = {
      ...draft,
      storeOffers: [{ storeId: 'store-1', availability }],
    };
    setup(card(product));
    const add = screen.getByLabelText(`Додати в кошик: ${product.name}`);
    expect(add).toBeDisabled();
    fireEvent.press(add);
    expect(addProductToCart(product, 'store-1', true)).toBe('unavailable');
    expect(useCartStore.getState().items).toEqual([]);
  },
);

test('a missing explicit store offer is unavailable even when other stores stock the product', () => {
  const product = { ...draft, storeOffers: [] };
  expect(addProductToCart(product, 'store-1', true)).toBe('unavailable');
  expect(useCartStore.getState().items).toEqual([]);
});

test('changing a serving merges existing target lines and preserves integer multiplicity', () => {
  useCartStore.setState({
    items: [
      { productId: draft.id, storeId: 'store-1', quantity: 2 },
      {
        productId: draft.id,
        storeId: 'store-1',
        variantId: '1000-ml',
        quantity: 3,
      },
    ],
  });
  setup(card(draft));
  expect(
    screen.getByLabelText(`${draft.name}, у кошику: 2 × 0,5 л`),
  ).toBeOnTheScreen();
  expect(
    screen.getByText('Інші варіанти цього товару також у кошику'),
  ).toBeOnTheScreen();
  fireEvent.press(
    screen.getByLabelText(`Збільшити об’єм до 1 л: ${draft.name}`),
  );
  expect(useCartStore.getState().items).toEqual([
    {
      productId: draft.id,
      storeId: 'store-1',
      variantId: '1000-ml',
      quantity: 5,
    },
  ]);
  expect(
    screen.getByLabelText(`${draft.name}, у кошику: 5 × 1 л`),
  ).toBeOnTheScreen();
});

test('a serving collision that exceeds target stock leaves both original lines intact', () => {
  const product: Product = {
    ...draft,
    variants: productVariants(draft).map((entry) =>
      entry.id === '1000-ml'
        ? {
            ...entry,
            storeOffers: [
              { storeId: 'store-1', availability: 'available', maxQuantity: 4 },
            ],
          }
        : entry,
    ),
  };
  const items = [
    { productId: product.id, storeId: 'store-1', quantity: 2 },
    {
      productId: product.id,
      storeId: 'store-1',
      variantId: '1000-ml',
      quantity: 3,
    },
  ];
  useCartStore.setState({ items });
  setup(card(product));
  expect(
    screen.getByLabelText(`Збільшити об’єм до 1 л: ${product.name}`),
  ).toBeDisabled();
  expect(stepProductCartLine(product, 'store-1', 1, true)).toBe(false);
  expect(useCartStore.getState().items).toEqual(items);
});

test('serving changes leave a different store line untouched', () => {
  const other = { productId: draft.id, storeId: 'store-2', quantity: 7 };
  useCartStore.setState({
    items: [{ productId: draft.id, storeId: 'store-1', quantity: 2 }, other],
  });
  stepProductCartLine(draft, 'store-1', 1, true);
  expect(useCartStore.getState().items).toContainEqual(other);
  expect(useCartStore.getState().items).toContainEqual({
    productId: draft.id,
    storeId: 'store-1',
    variantId: '1000-ml',
    quantity: 2,
  });
});

test('packaged cards show integer pieces separately from package volume', () => {
  useSelectedStore.setState({ storeId: 'store-2' });
  setup(card(bottle));
  fireEvent.press(screen.getByLabelText(`Додати в кошик: ${bottle.name}`));
  expect(
    screen.getByLabelText(`${bottle.name}, у кошику: 1 шт.`),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText(`Збільшити кількість: ${bottle.name}`));
  expect(firstLine().quantity).toBe(2);
  expect(
    screen.getByLabelText(`${bottle.name}, у кошику: 2 шт.`),
  ).toBeOnTheScreen();
  expect(screen.getByText('/ шт.')).toBeOnTheScreen();
  expect(screen.getByText('500 мл')).toBeOnTheScreen();
});

test('two mounted packaged controls share live quantity during rapid alternating taps', () => {
  useSelectedStore.setState({ storeId: 'store-2' });
  addProductToCart(bottle, 'store-2', true);
  setup(
    <>
      {card(bottle)}
      {card(bottle)}
    </>,
  );
  const plus = screen.getAllByLabelText(`Збільшити кількість: ${bottle.name}`);
  act(() => {
    for (let index = 0; index < 6; index++) fireEvent.press(plus[index % 2]);
  });
  expect(useCartStore.getState().items).toHaveLength(1);
  expect(firstLine().quantity).toBe(7);
  expect(
    screen.getAllByLabelText(`${bottle.name}, у кошику: 7 шт.`),
  ).toHaveLength(2);
});

test('packaged decrement removes the last piece and repeated taps cannot make it negative', () => {
  useSelectedStore.setState({ storeId: 'store-2' });
  addProductToCart(bottle, 'store-2', true);
  setup(card(bottle));
  const minus = screen.getByLabelText(`Зменшити кількість: ${bottle.name}`);
  act(() => {
    for (let index = 0; index < 3; index++) fireEvent.press(minus);
  });
  expect(useCartStore.getState().items).toEqual([]);
});

test('rapid packaged taps stop at the store-specific limit', () => {
  useSelectedStore.setState({ storeId: 'store-2' });
  const product: Product = {
    ...bottle,
    variants: productVariants(bottle).map((entry) => ({
      ...entry,
      storeOffers: [
        { storeId: 'store-2', availability: 'available', maxQuantity: 3 },
      ],
    })),
  };
  addProductToCart(product, 'store-2', true);
  setup(card(product));
  const plus = screen.getByLabelText(`Збільшити кількість: ${product.name}`);
  act(() => {
    for (let index = 0; index < 8; index++) fireEvent.press(plus);
  });
  expect(firstLine().quantity).toBe(3);
  expect(
    screen.getByLabelText(`Збільшити кількість: ${product.name}`),
  ).toBeDisabled();
  expect(addProductToCart(product, 'store-2', true)).toBe('limit');
});

test('checkout maximum of 99 also caps products without a repository quantity limit', () => {
  useSelectedStore.setState({ storeId: 'store-2' });
  const product: Product = {
    ...bottle,
    variants: productVariants(bottle).map((entry) => ({
      ...entry,
      maxQuantity: undefined,
      storeOffers: undefined,
    })),
  };
  expect(
    addProductVariantToCart(product, variant(product), 'store-2', 98, true),
  ).toBe('added');
  expect(stepProductCartLine(product, 'store-2', 1, true)).toBe(true);
  expect(stepProductCartLine(product, 'store-2', 1, true)).toBe(false);
  expect(addProductToCart(product, 'store-2', true)).toBe('limit');
  expect(firstLine().quantity).toBe(99);
});

test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
  'variant add rejects invalid integer count %s',
  (quantity) => {
    expect(
      addProductVariantToCart(draft, variant(draft), 'store-1', quantity, true),
    ).toBe('unavailable');
    expect(useCartStore.getState().items).toEqual([]);
  },
);

test('stale store handlers cannot add or mutate the old store cart', () => {
  addProductToCart(draft, 'store-1', true);
  const items = useCartStore.getState().items;
  useSelectedStore.setState({ storeId: 'store-2' });
  expect(addProductToCart(draft, 'store-1', true)).toBe('stale');
  expect(stepProductCartLine(draft, 'store-1', 1, true)).toBe(false);
  expect(stepProductCartLine(draft, 'store-1', -1, true)).toBe(false);
  expect(useCartStore.getState().items).toEqual(items);
});

test('handlers wait for session hydration before adding or removing lines', () => {
  addProductToCart(draft, 'store-1', true);
  const items = useCartStore.getState().items;
  useSessionStore.setState({ hydrated: false });
  expect(addProductToCart(draft, 'store-1', true)).toBe('stale');
  expect(stepProductCartLine(draft, 'store-1', -1, true)).toBe(false);
  expect(useCartStore.getState().items).toEqual(items);
});

test('non-orderable stores block additions and increases while preserving removal', () => {
  expect(addProductToCart(draft, 'store-1', false)).toBe('unavailable');
  addProductToCart(draft, 'store-1', true);
  expect(stepProductCartLine(draft, 'store-1', 1, false)).toBe(false);
  expect(stepProductCartLine(draft, 'store-1', -1, false)).toBe(true);
  expect(useCartStore.getState().items).toEqual([]);
});

test('disabled store cards block add and serving increase while keeping removal accessible', () => {
  const { rerender } = setup(card(draft, true));
  const add = screen.getByLabelText(`Додати в кошик: ${draft.name}`);
  expect(add).toBeDisabled();
  fireEvent.press(add);
  expect(useCartStore.getState().items).toEqual([]);
  act(() => {
    addProductToCart(draft, 'store-1', true);
  });
  rerender(card(draft, true));
  expect(
    screen.getByLabelText(`Збільшити об’єм до 1 л: ${draft.name}`),
  ).toBeDisabled();
  const remove = screen.getByLabelText(`Видалити з кошика: ${draft.name}`);
  expect(remove).toBeEnabled();
  fireEvent.press(remove);
  expect(useCartStore.getState().items).toEqual([]);
});

test('unavailable packaged inventory cannot increase but its existing line can be reduced', () => {
  useSelectedStore.setState({ storeId: 'store-2' });
  useCartStore.setState({
    items: [{ productId: bottle.id, storeId: 'store-2', quantity: 2 }],
  });
  const product: Product = { ...bottle, storeOffers: [] };
  expect(stepProductCartLine(product, 'store-2', 1, true)).toBe(false);
  expect(firstLine().quantity).toBe(2);
  expect(stepProductCartLine(product, 'store-2', -1, true)).toBe(true);
  expect(firstLine().quantity).toBe(1);
});

test('serving prices keep their repository denominator and snack amounts are not pieces', () => {
  expect(priceUnit(draft, variant(draft))).toBe('500 мл');
  expect(priceUnit(draft, variant(draft, '1000-ml'))).toBe('1\u00a0000 мл');
  expect(priceUnit(bottle, variant(bottle))).toBe('шт.');
  expect(priceUnit(snack, variant(snack))).toBe('100 г');
  expect(formatProductQuantity(snack, variant(snack), 2)).toBe('2 × 100 г');
  const packed: Product = { ...snack, sellingUnit: 'pack' };
  const packedVariant = { ...variant(packed), sellingUnit: 'pack' as const };
  expect(priceUnit(packed, packedVariant)).toBe('уп.');
  expect(formatProductQuantity(packed, packedVariant, 3)).toBe('3 уп.');
  expect(formatSellingUnit('g')).toBe('г');
  expect(formatSellingUnit('kg')).toBe('кг');
});

test.each([
  ['g', 'г'],
  ['kg', 'кг'],
  ['ml', 'мл'],
  ['l', 'л'],
] as const)(
  'authoritative %s selling unit overrides the serving-volume price suffix',
  (sellingUnit, expected) => {
    const product = { ...snack, sellingUnit };
    expect(priceUnit(product)).toBe(expected);
    expect(priceUnit(product, { ...variant(snack), sellingUnit })).toBe(
      expected,
    );
    expect(priceUnit(product, { ...variant(snack), sellingUnit: 'pack' })).toBe(
      'уп.',
    );
  },
);

test('cart retains separate serving counts while volume changes preserve the count and totals', async () => {
  useCartStore.setState({
    items: [{ productId: draft.id, storeId: 'store-1', quantity: 2 }],
  });
  setup(<CartScreen />);
  const countPlus = await screen.findByLabelText(
    `Збільшити: ${draft.name}, 500 мл`,
  );
  fireEvent.press(countPlus);
  expect(firstLine().quantity).toBe(3);
  fireEvent.press(
    screen.getByLabelText(`Збільшити об’єм до 1 л: ${draft.name}`),
  );
  await waitFor(() =>
    expect(firstLine()).toMatchObject({ variantId: '1000-ml', quantity: 3 }),
  );
  expect(screen.getByLabelText(`${draft.name}, 1 л: 3`)).toBeOnTheScreen();
  expect(
    screen.getByLabelText(`Об’єм порції: ${draft.name}: 1 л`),
  ).toBeOnTheScreen();
  expect(screen.getByTestId('order-total')).toHaveTextContent(
    formatMoney(uah(30000)),
  );
});

test('rapid full-cart serving taps retain the live source variant and quantity', async () => {
  useSelectedStore.setState({ storeId: 'store-2' });
  useCartStore.setState({
    items: [{ productId: draft.id, storeId: 'store-2', quantity: 2 }],
  });
  setup(<CartScreen />);
  const plus = await screen.findByLabelText(
    `Збільшити об’єм до 1 л: ${draft.name}`,
  );
  act(() => {
    fireEvent.press(plus);
    fireEvent.press(plus);
    fireEvent.press(plus);
  });
  expect(useCartStore.getState().items).toEqual([
    {
      productId: draft.id,
      storeId: 'store-2',
      variantId: '1500-ml',
      quantity: 2,
    },
  ]);
});

test.each(['serving-first', 'count-first'] as const)(
  '%s taps in one render batch preserve both the serving and portion-count changes',
  async (order) => {
    useCartStore.setState({
      items: [{ productId: draft.id, storeId: 'store-1', quantity: 1 }],
    });
    setup(<CartScreen />);
    const servingPlus = await screen.findByLabelText(
      `Збільшити об’єм до 1 л: ${draft.name}`,
    );
    const countPlus = screen.getByLabelText(`Збільшити: ${draft.name}, 500 мл`);
    await act(async () => {
      if (order === 'serving-first') {
        fireEvent.press(servingPlus);
        fireEvent.press(countPlus);
      } else {
        fireEvent.press(countPlus);
        fireEvent.press(servingPlus);
      }
    });
    expect(useCartStore.getState().items).toEqual([
      {
        productId: draft.id,
        storeId: 'store-1',
        variantId: '1000-ml',
        quantity: 2,
      },
    ]);
    expect(screen.getByLabelText(`${draft.name}, 1 л: 2`)).toBeOnTheScreen();
    expect(screen.getByTestId('order-total')).toHaveTextContent(
      formatMoney(uah(20000)),
    );
  },
);

test('portion taps from source and target controls retain merged live quantities after a same-batch serving change', async () => {
  useCartStore.setState({
    items: [
      { productId: draft.id, storeId: 'store-1', quantity: 1 },
      {
        productId: draft.id,
        storeId: 'store-1',
        variantId: '1000-ml',
        quantity: 3,
      },
    ],
  });
  setup(<CartScreen />);
  const servingPlus = await screen.findByLabelText(
    `Збільшити об’єм до 1 л: ${draft.name}`,
  );
  const sourcePlus = screen.getByLabelText(`Збільшити: ${draft.name}, 500 мл`);
  const targetPlus = screen.getByLabelText(`Збільшити: ${draft.name}, 1 л`);
  await act(async () => {
    fireEvent.press(servingPlus);
    fireEvent.press(sourcePlus);
    fireEvent.press(targetPlus);
  });
  expect(useCartStore.getState().items).toEqual([
    {
      productId: draft.id,
      storeId: 'store-1',
      variantId: '1000-ml',
      quantity: 6,
    },
  ]);
  expect(screen.getByTestId('order-total')).toHaveTextContent(
    formatMoney(uah(60000)),
  );
});

test('an unavailable draft serving can move down to an available size without losing its portion count', async () => {
  useCartStore.setState({
    items: [
      {
        productId: draft.id,
        storeId: 'store-1',
        variantId: '1500-ml',
        quantity: 2,
      },
    ],
  });
  setup(<CartScreen />);
  const minus = await screen.findByLabelText(
    `Зменшити об’єм до 1 л: ${draft.name}`,
  );
  expect(screen.getByTestId('cart-checkout')).toBeDisabled();
  expect(minus).toBeEnabled();
  fireEvent.press(minus);
  await waitFor(() =>
    expect(useCartStore.getState().items).toEqual([
      {
        productId: draft.id,
        storeId: 'store-1',
        variantId: '1000-ml',
        quantity: 2,
      },
    ]),
  );
  expect(screen.getByLabelText(`${draft.name}, 1 л: 2`)).toBeOnTheScreen();
  expect(screen.getByTestId('cart-checkout')).toBeEnabled();
});

test('a closed store cart blocks amount and portion increases but keeps reductions and removal usable', async () => {
  useCartStore.setState({
    items: [{ productId: draft.id, storeId: 'store-1', quantity: 2 }],
  });
  const repositories = createMockRepositories();
  const store = (await repositories.stores.getById('store-1'))!;
  jest.spyOn(repositories.stores, 'getById').mockResolvedValue({
    ...store,
    temporarilyClosed: true,
  });
  setup(<CartScreen />, repositories);
  const servingPlus = await screen.findByLabelText(
    `Збільшити об’єм до 1 л: ${draft.name}`,
  );
  expect(servingPlus).toBeDisabled();
  expect(
    screen.getByLabelText(`Збільшити: ${draft.name}, 500 мл`),
  ).toBeDisabled();
  expect(screen.getByTestId('cart-checkout')).toBeDisabled();
  fireEvent.press(screen.getByLabelText(`Зменшити: ${draft.name}, 500 мл`));
  expect(firstLine().quantity).toBe(1);
  await act(async () => {
    fireEvent.press(
      screen.getByLabelText(`Видалити порцію з кошика: ${draft.name}`),
    );
  });
  expect(useCartStore.getState().items).toEqual([]);
});

test('persisted variant hydration updates an already mounted product control', async () => {
  setup(card(draft));
  await AsyncStorage.setItem(
    'beerland:cart',
    JSON.stringify({
      version: 1,
      state: {
        items: [
          {
            productId: draft.id,
            storeId: 'store-1',
            variantId: '1000-ml',
            quantity: 2,
          },
        ],
      },
    }),
  );
  await act(async () => useCartStore.persist.rehydrate());
  expect(
    screen.getByLabelText(`${draft.name}, у кошику: 2 × 1 л`),
  ).toBeOnTheScreen();
  fireEvent.press(
    screen.getByLabelText(`Зменшити об’єм до 0,5 л: ${draft.name}`),
  );
  expect(firstLine()).toMatchObject({ variantId: 'default', quantity: 2 });
});

test('store transfer preserves the selected serving and exposes target-store sizes and price', async () => {
  addProductVariantToCart(draft, variant(draft, '1000-ml'), 'store-1', 2, true);
  const repositories = createMockRepositories();
  const prepared = await prepareCartTransfer(
    useCartStore.getState().items,
    'store-2',
    'pickup',
    repositories,
  );
  commitCartTransfer(prepared.items, 'store-2');
  setup(card(draft));
  expect(firstLine()).toMatchObject({
    storeId: 'store-2',
    variantId: '1000-ml',
    quantity: 2,
  });
  expect(
    screen.getByLabelText(`${draft.name}, у кошику: 2 × 1 л`),
  ).toBeOnTheScreen();
  expect(screen.getByText(formatMoney(uah(10500)))).toBeOnTheScreen();
  fireEvent.press(
    screen.getByLabelText(`Збільшити об’єм до 1,5 л: ${draft.name}`),
  );
  expect(firstLine()).toMatchObject({ variantId: '1500-ml', quantity: 2 });
  const quote = createQuote(
    useCartStore.getState().items,
    [draft],
    prepared.resources.store,
    'pickup',
  );
  expect(quote.canCheckout).toBe(true);
  expect(quote.totals.total).toEqual(uah(31000));
});

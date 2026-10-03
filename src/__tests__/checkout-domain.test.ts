import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addressSchema,
  checkoutSchema,
  customerSchema,
  paymentMethods,
} from '@/features/checkout/model';
import {
  calculateTotals,
  cartKey,
  checkoutRules,
  createQuote,
  resolveCartLine,
  uah,
} from '@/features/cart/pricing';
import { fetchCartQuote } from '@/features/cart/useCartQuote';
import { createMockRepositories } from '@/services/mock/repositories';
import { createMockOrderRepository } from '@/services/mock/orders';
import { useAddressStore, useCheckoutStore } from '@/stores/checkout';
import { checkoutDetails, checkoutItem, testOrderInput } from '@/test/checkout';
import { useCartStore } from '@/stores/cart';
import { orderInputSchema } from '@/features/orders/model';

beforeEach(async () => {
  await AsyncStorage.clear();
  useAddressStore.setState({ addresses: [], selectedId: null });
  useCheckoutStore.getState().reset();
  useCartStore.setState({ items: [] });
});
const address = { id: 'a', city: 'Київ', street: 'Тестова', building: '1' };

test.each(['city', 'street', 'building'] as const)(
  'address requires non-blank %s',
  (key) => {
    expect(addressSchema.safeParse({ ...address, [key]: ' ' }).success).toBe(
      false,
    );
  },
);
test('address supports structured optional fields and trims values', () => {
  expect(
    addressSchema.parse({
      ...address,
      street: ' Тестова ',
      entrance: '2',
      floor: '3',
      intercom: '7',
      apartment: '42',
    }),
  ).toMatchObject({ street: 'Тестова', entrance: '2', floor: '3' });
});
test.each(['0501234567', '+380 (50) 123-45-67', '380501234567'])(
  'normalizes Ukrainian phone %s',
  (phone) => {
    expect(customerSchema.parse({ name: 'Тест', phone }).phone).toBe(
      '+380501234567',
    );
  },
);
test.each(['+48123456789', '050123', '+380abcdefgh', '05012345678'])(
  'rejects invalid phone %s',
  (phone) => {
    expect(customerSchema.safeParse({ name: 'Тест', phone }).success).toBe(
      false,
    );
  },
);
test('email is optional but must be valid when provided', () => {
  expect(
    customerSchema.safeParse({ ...checkoutDetails.customer, email: '' })
      .success,
  ).toBe(true);
  expect(
    customerSchema.safeParse({ ...checkoutDetails.customer, email: 'wrong' })
      .success,
  ).toBe(false);
});
test('delivery requires a complete address; pickup does not', () => {
  expect(checkoutSchema.safeParse(checkoutDetails).success).toBe(true);
  expect(
    checkoutSchema.safeParse({
      ...checkoutDetails,
      fulfillmentType: 'delivery',
    }).success,
  ).toBe(false);
  expect(
    checkoutSchema.safeParse({
      ...checkoutDetails,
      fulfillmentType: 'delivery',
      address,
    }).success,
  ).toBe(true);
});
test('age confirmation and required customer fields cannot be skipped', () => {
  expect(
    checkoutSchema.safeParse({ ...checkoutDetails, ageConfirmed: false })
      .success,
  ).toBe(false);
  expect(
    checkoutSchema.safeParse({
      ...checkoutDetails,
      customer: { name: '', phone: '' },
    }).success,
  ).toBe(false);
});
test('order comment is optional in the UI and bounded to 500 characters', () => {
  expect(
    checkoutSchema.safeParse({ ...checkoutDetails, comment: '' }).success,
  ).toBe(true);
  expect(
    checkoutSchema.safeParse({ ...checkoutDetails, comment: 'а'.repeat(500) })
      .success,
  ).toBe(true);
  expect(
    checkoutSchema.safeParse({ ...checkoutDetails, comment: 'а'.repeat(501) })
      .success,
  ).toBe(false);
});
test.each([
  ['ios', ['card', 'applePay', 'cashOnDelivery']],
  ['android', ['card', 'googlePay', 'cashOnDelivery']],
  ['web', ['card', 'cashOnDelivery']],
  ['unknown', ['card', 'cashOnDelivery']],
])('payment methods fail safely on %s', (platform, expected) => {
  expect(paymentMethods(platform as string)).toEqual(expected);
});
test('cart keys preserve product, variant and store identity', () => {
  expect(cartKey(checkoutItem)).toBe(
    cartKey({ ...checkoutItem, variantId: 'default' }),
  );
  expect(
    new Set([
      cartKey(checkoutItem),
      cartKey({ ...checkoutItem, variantId: '1000-ml' }),
      cartKey({ ...checkoutItem, storeId: 'store-2' }),
    ]).size,
  ).toBe(3);
});
test('subtotal and delivery totals use exact integer minor units', async () => {
  const repo = createMockRepositories();
  const quote = await fetchCartQuote(
    repo,
    [checkoutItem],
    'store-1',
    'delivery',
  );
  expect(quote.totals.subtotal).toEqual(uah(10000));
  expect(quote.totals.deliveryFee).toEqual(uah(6000));
  expect(quote.totals.total).toEqual(uah(16000));
  expect(calculateTotals(quote.lines, 'pickup').deliveryFee).toEqual(uah(0));
  expect(calculateTotals(quote.lines, 'pickup').total).toEqual(uah(10000));
});
test('variant discounts are included exactly once', async () => {
  const p = (await createMockRepositories().products.getById('product-1'))!;
  p.variants![0].oldPrice = uah(6500);
  const line = resolveCartLine(checkoutItem, p, 'store-1');
  expect(calculateTotals([line], 'pickup')).toMatchObject({
    subtotal: uah(13000),
    discount: uah(3000),
    total: uah(10000),
  });
});
test('fractional UAH values remain exact and invalid minor units are rejected', async () => {
  const p = (await createMockRepositories().products.getById('product-1'))!;
  p.variants![0].basePrice = uah(3333);
  p.storeOffers = undefined;
  const line = resolveCartLine({ ...checkoutItem, quantity: 3 }, p, 'store-1');
  expect(line.lineTotal).toEqual(uah(9999));
  expect(() => uah(1.5)).toThrow();
  expect(() => uah(Number.MAX_SAFE_INTEGER + 1)).toThrow();
});
test('minimum order and delivery fee are configurable; empty carts have no fee', async () => {
  const quote = await fetchCartQuote(
    createMockRepositories(),
    [checkoutItem],
    'store-1',
    'pickup',
  );
  expect(
    calculateTotals(quote.lines, 'delivery', {
      ...checkoutRules,
      minimumOrder: 30000,
      deliveryFee: 4500,
    }),
  ).toMatchObject({ belowMinimum: true, deliveryFee: uah(4500) });
  expect(calculateTotals([], 'delivery').total).toEqual(uah(0));
});
test.each([
  'missing',
  'variant',
  'unavailable',
  'store',
  'limit',
  'unknown',
] as const)(
  'quote blocks %s inventory issues without removing lines',
  async (reason) => {
    const repo = createMockRepositories();
    let p = await repo.products.getById('product-1');
    const item = { ...checkoutItem };
    if (reason === 'missing') p = null;
    if (reason === 'variant') item.productId = 'product-1';
    if (reason === 'unavailable') p!.storeOffers = [];
    if (reason === 'unknown')
      p!.storeOffers = [{ storeId: 'store-1', availability: 'unknown' }];
    if (reason === 'store') item.storeId = 'store-2';
    if (reason === 'limit') item.quantity = 13;
    const lineItem =
      reason === 'variant' ? { ...item, variantId: 'missing' } : item;
    const quote = createQuote(
      [lineItem],
      [p],
      await repo.stores.getById('store-1'),
      'pickup',
    );
    expect(quote.canCheckout).toBe(false);
    expect(quote.lines).toHaveLength(1);
    expect(quote.lines[0].issue).toBeTruthy();
  },
);
test('store fulfillment restrictions block an otherwise available cart', async () => {
  const repo = createMockRepositories();
  const p = await repo.products.getById('product-1');
  const store = (await repo.stores.getById('store-1'))!;
  expect(
    createQuote(
      [checkoutItem],
      [p],
      { ...store, deliveryAvailable: false },
      'delivery',
    ).canCheckout,
  ).toBe(false);
});
test('saved addresses persist, rehydrate, select, edit and retain one default', async () => {
  useAddressStore.getState().save(address);
  useAddressStore.getState().save({ ...address, id: 'b', building: '2' });
  useAddressStore.getState().select('a');
  await useAddressStore.persist.rehydrate();
  expect(useAddressStore.getState().selectedId).toBe('a');
  expect(useAddressStore.getState().addresses).toHaveLength(2);
  useAddressStore.getState().makeDefault('b');
  useAddressStore
    .getState()
    .save({ ...useAddressStore.getState().addresses[1], apartment: '7' });
  expect(
    useAddressStore.getState().addresses.filter((a) => a.isDefault),
  ).toHaveLength(1);
  useAddressStore.getState().remove('b');
  expect(useAddressStore.getState().selectedId).toBe('a');
  expect(useAddressStore.getState().addresses[0].isDefault).toBe(true);
});
test('invalid addresses and missing selections cannot enter local address book', () => {
  useAddressStore.getState().save({ ...address, street: '' });
  useAddressStore.getState().select('missing');
  expect(useAddressStore.getState().addresses).toEqual([]);
  expect(useAddressStore.getState().selectedId).toBeNull();
});
test('checkout draft persists contacts, payment and comment but no age or submission state', async () => {
  useCheckoutStore.getState().update({
    customer: { ...checkoutDetails.customer, email: '' },
    comment: 'Побажання',
  });
  useCheckoutStore.setState({ submitting: true });
  const raw = await AsyncStorage.getItem('beerland:checkout-draft');
  expect(raw).toContain('Побажання');
  expect(raw).not.toContain('submitting');
  expect(raw).not.toContain('ageConfirmed');
});
test('mock order creates a structured receipt with injectable time and no real payment', async () => {
  const repo = createMockRepositories({
    now: () => new Date('2026-09-19T12:00:00Z'),
  });
  const order = await repo.orders.create(await testOrderInput(repo));
  expect(order).toMatchObject({
    orderNumber: 'BL-1042',
    status: 'created',
    paymentStatus: 'unpaid',
    createdAt: '2026-09-19T12:00:00.000Z',
    customer: checkoutDetails.customer,
  });
  expect(order.items[0]).toMatchObject({
    name: 'Світлий берег',
    variantId: 'default',
    quantity: 2,
    unitPrice: uah(5000),
    lineTotal: uah(10000),
  });
});
test('repository deduplicates concurrent and retried requests by idempotency key', async () => {
  const repo = createMockRepositories();
  const input = await testOrderInput(repo);
  const [a, b] = await Promise.all([
    repo.orders.create(input),
    repo.orders.create(input),
  ]);
  expect(a.id).toBe(b.id);
  expect(await repo.orders.list()).toHaveLength(1);
  expect(
    (await repo.orders.create({ ...input, idempotencyKey: 'next' }))
      .orderNumber,
  ).toBe('BL-1043');
});
test('orders persist through a new repository and results cannot mutate stored receipts', async () => {
  const repo = createMockRepositories({ storage: AsyncStorage });
  const order = await repo.orders.create(await testOrderInput(repo));
  order.customer.name = 'Changed';
  const reopened = createMockOrderRepository({ storage: AsyncStorage });
  expect(await reopened.getById(order.id)).toMatchObject({
    customer: { name: checkoutDetails.customer.name },
  });
});
test('testable repository failure does not record a partial order', async () => {
  const repo = createMockRepositories({
    beforeCreate: async () => {
      throw new Error('offline');
    },
  });
  await expect(repo.orders.create(await testOrderInput(repo))).rejects.toThrow(
    'offline',
  );
  expect(await repo.orders.list()).toEqual([]);
});
test('durable storage failure can be retried without consuming an order number', async () => {
  const setItem = jest
    .fn()
    .mockRejectedValueOnce(new Error('full'))
    .mockResolvedValue(undefined);
  const repo = createMockRepositories({
    storage: { getItem: async () => null, setItem },
  });
  const input = await testOrderInput(repo);
  await expect(repo.orders.create(input)).rejects.toThrow('full');
  expect((await repo.orders.create(input)).orderNumber).toBe('BL-1042');
});
test('order boundary rejects mixed stores and unconfirmed age', async () => {
  const input = await testOrderInput(createMockRepositories());
  expect(
    orderInputSchema.safeParse({ ...input, ageConfirmed: false }).success,
  ).toBe(false);
  expect(
    orderInputSchema.safeParse({
      ...input,
      items: [{ ...input.items[0], storeId: 'other' }],
    }).success,
  ).toBe(false);
});

test('order boundary rejects inconsistent totals and mismatched currencies', async () => {
  const input = await testOrderInput(createMockRepositories());
  expect(orderInputSchema.safeParse({ ...input, total: uah(1) }).success).toBe(
    false,
  );
  expect(
    orderInputSchema.safeParse({ ...input, deliveryFee: uah(100) }).success,
  ).toBe(false);
  expect(
    orderInputSchema.safeParse({
      ...input,
      items: [
        { ...input.items[0], unitPrice: { amount: 5000, currency: 'USD' } },
      ],
    }).success,
  ).toBe(false);
});

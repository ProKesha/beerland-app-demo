import jsQR from 'jsqr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMockRepositories } from '@/services/mock/repositories';
import { createMockOrderRepository } from '@/services/mock/orders';
import {
  createLocalUserRepository,
  demoLoyalty,
} from '@/services/mock/account';
import { demoOrders } from '@/services/mock/accountOrders';
import { prepareReorder } from '@/features/orders/reorder';
import { loyaltyProgress } from '@/features/loyalty/rules';
import { loyaltyMatrix } from '@/features/loyalty/LoyaltyCode';
import { customerSchema } from '@/features/checkout/model';
import { orderStatus, orderSteps, orderDate } from '@/features/orders/status';
import { productVariants } from '@/features/product/variants';
import { useNotificationPreferences } from '@/stores/notifications';
import { useAddressStore } from '@/stores/checkout';
import { testOrderInput } from '@/test/checkout';
import type { PlacedOrder } from '@/features/orders/model';

beforeEach(async () => {
  await AsyncStorage.clear();
  useNotificationPreferences.setState({
    promotions: false,
    orders: true,
    loyalty: false,
  });
  useAddressStore.setState({ addresses: [], selectedId: null });
});
async function setup() {
  const r = createMockRepositories();
  const order = await r.orders.create(await testOrderInput(r));
  return { r, order };
}
test('demo account contains no invented personal name or contact', async () => {
  const user = await createLocalUserRepository().getCurrent();
  expect(user).toEqual({ id: 'demo-customer', name: '', addresses: [] });
});
test('local personal data persists, normalizes shared checkout phone and isolates results', async () => {
  const repo = createLocalUserRepository(AsyncStorage);
  const user = await repo.updateCurrent({
    name: 'Олена',
    phone: '(050) 123-45-67',
    email: 'test@example.com',
  });
  expect(user.phone).toBe('+380501234567');
  user.name = 'mutated';
  expect(
    (await createLocalUserRepository(AsyncStorage).getCurrent())?.name,
  ).toBe('Олена');
});
test.each([
  { name: 'A', phone: '0501234567' },
  { name: 'Олена', phone: '123' },
  { name: 'Олена', phone: '0501234567', email: 'bad' },
])('shared personal validation rejects %j', async (fields) => {
  expect(customerSchema.safeParse(fields).success).toBe(false);
  await expect(
    createLocalUserRepository().updateCurrent(fields),
  ).rejects.toThrow();
});
test('failed profile storage preserves prior data', async () => {
  const repo = createLocalUserRepository({
    getItem: async () => null,
    setItem: async () => {
      throw Error('full');
    },
  });
  await expect(
    repo.updateCurrent({ name: 'Олена', phone: '0501234567' }),
  ).rejects.toThrow('full');
  expect((await repo.getCurrent())?.name).toBe('');
});
test.each(['{broken', JSON.stringify({ name: 'A', phone: 'invalid' })])(
  'corrupt local profile can be recovered by saving valid fields: %s',
  async (raw) => {
    await AsyncStorage.setItem('beerland:local-profile:v1', raw);
    const repo = createLocalUserRepository(AsyncStorage);
    expect((await repo.getCurrent())?.name).toBe('');
    await repo.updateCurrent({ name: 'Олена', phone: '0501234567' });
    expect(
      (await createLocalUserRepository(AsyncStorage).getCurrent())?.phone,
    ).toBe('+380501234567');
  },
);
test('profile storage read failure can be retried without losing saved data', async () => {
  const getItem = jest
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(
      JSON.stringify({ name: 'Олена', phone: '+380501234567' }),
    );
  const repo = createLocalUserRepository({ getItem, setItem: jest.fn() });
  await expect(repo.getCurrent()).rejects.toThrow('offline');
  expect((await repo.getCurrent())?.name).toBe('Олена');
});
test('loyalty tier progress uses configuration and clamps out of range values', () => {
  expect(loyaltyProgress(demoLoyalty)).toEqual({
    progress: 1 - 760 / 1500,
    next: 'Gold',
  });
  expect(
    loyaltyProgress({ ...demoLoyalty, pointsToNextTier: 5000 }).progress,
  ).toBe(0);
  expect(
    loyaltyProgress({ ...demoLoyalty, pointsToNextTier: -1 }).progress,
  ).toBe(1);
  expect(loyaltyProgress({ ...demoLoyalty, tier: 'Gold' })).toEqual({
    progress: 1,
    next: undefined,
  });
  expect(loyaltyProgress({ ...demoLoyalty, tier: 'unknown' }).progress).toBe(0);
});
test('QR matrix uses an identifier only, quiet zone and actual encoded modules', () => {
  expect(demoLoyalty.qrPayload).toBe('beerland:demo:BL00001042');
  expect(demoLoyalty.qrPayload).not.toMatch(/@|\+380/);
  const matrix = loyaltyMatrix(demoLoyalty.qrPayload);
  expect(matrix.size).toBeGreaterThan(28);
  expect(matrix.path).toContain('M4,4');
  expect(matrix.path).not.toBe(loyaltyMatrix('another-id').path);
});
test('seed history merges with new checkout receipts and survives restart without duplicates', async () => {
  const r = createMockRepositories({
    seedOrders: demoOrders(),
    storage: AsyncStorage,
  });
  const order = await r.orders.create(await testOrderInput(r));
  expect(order.orderNumber).toBe('BL-1042');
  const second = createMockOrderRepository({
    seedOrders: demoOrders(),
    storage: AsyncStorage,
  });
  expect(await second.list()).toHaveLength(4);
  expect(await second.getById(order.id)).toEqual(order);
  expect(new Set((await second.list()).map((o) => o.id)).size).toBe(4);
});
test.each(Object.keys(orderStatus))(
  'status %s has an explicit Ukrainian label and semantic color',
  (status) => {
    expect(orderStatus[status as keyof typeof orderStatus].label).toMatch(
      /[А-Яа-яІіЇїЄє]/,
    );
    expect(orderStatus[status as keyof typeof orderStatus].color).toMatch(
      /info|warning|success|error/,
    );
  },
);
test('timeline selects delivery and pickup paths and final states', () => {
  const order = demoOrders()[1];
  expect(orderSteps(order)).toContain('outForDelivery');
  expect(orderSteps({ ...order, fulfillment: 'pickup' })).toContain('ready');
  expect(orderSteps({ ...order, status: 'cancelled' })).toEqual(['cancelled']);
  expect(orderSteps({ ...order, status: 'completed' })).toEqual(['completed']);
  expect(orderDate(order.createdAt)).toContain('19:42');
});
test('reorder uses current offers and returns changed prices, never historical prices in cart', async () => {
  const { r, order } = await setup();
  const product = (await r.products.getById('product-1'))!;
  product.variants = productVariants(product).map((v) => ({
    ...v,
    basePrice: { amount: 99900, currency: 'UAH' },
    storeOffers: [
      {
        storeId: 'store-1',
        availability: 'available',
        price: { amount: 99900, currency: 'UAH' },
      },
    ],
  }));
  jest.spyOn(r.products, 'getById').mockResolvedValue(product);
  const result = await prepareReorder(order, 'store-1', r.products);
  expect(result.changedPrices[0].currentPrice.amount).toBe(99900);
  expect(result.availableItems).toEqual([
    { productId: 'product-1', storeId: 'store-1', quantity: 2 },
  ]);
  expect(result.availableItems[0]).not.toHaveProperty('unitPrice');
});
test.each([
  'missing-product',
  'missing-variant',
  'unavailable-variant',
  'wrong-store',
] as const)('reorder rejects %s', async (kind) => {
  const { r, order } = await setup();
  const product = (await r.products.getById('product-1'))!;
  if (kind === 'missing-product')
    jest.spyOn(r.products, 'getById').mockResolvedValue(null);
  if (kind === 'missing-variant') order.items[0].variantId = 'gone';
  if (kind === 'unavailable-variant') {
    product.variants = productVariants(product).map((v) => ({
      ...v,
      availability: 'unavailable',
      storeOffers: [],
    }));
    jest.spyOn(r.products, 'getById').mockResolvedValue(product);
  }
  const result = await prepareReorder(
    order,
    kind === 'wrong-store' ? 'missing-store' : 'store-1',
    r.products,
  );
  expect(result.availableItems).toHaveLength(0);
  expect(result.unavailableItems).toHaveLength(1);
});
test('reorder returns partial success and preserves separate variants', async () => {
  const { r, order } = await setup();
  const product = (await r.products.getById('product-1'))!;
  const variant = productVariants(product)[0];
  product.variants = [
    variant,
    { ...variant, id: 'large', volume: { value: 1000, unit: 'ml' } },
  ];
  jest
    .spyOn(r.products, 'getById')
    .mockImplementation(async (id) => (id === 'product-1' ? product : null));
  const input: PlacedOrder = {
    ...order,
    items: [
      order.items[0],
      { ...order.items[0], variantId: 'large' },
      { ...order.items[0], productId: 'gone' },
    ],
  };
  const result = await prepareReorder(input, 'store-1', r.products);
  expect(result.availableItems).toHaveLength(2);
  expect(result.availableItems[1].variantId).toBe('large');
  expect(result.unavailableItems).toHaveLength(1);
});
test('quantity limits account for existing cart and duplicates in a receipt', async () => {
  const { r, order } = await setup();
  const product = (await r.products.getById('product-1'))!;
  product.variants = productVariants(product).map((v) => ({
    ...v,
    maxQuantity: 3,
    storeOffers: undefined,
  }));
  jest.spyOn(r.products, 'getById').mockResolvedValue(product);
  order.items.push({ ...order.items[0] });
  const result = await prepareReorder(order, 'store-1', r.products, [
    { productId: 'product-1', quantity: 2, storeId: 'store-1' },
  ]);
  expect(result.availableItems.reduce((sum, i) => sum + i.quantity, 0)).toBe(1);
  expect(result.unavailableItems.reduce((sum, i) => sum + i.quantity, 0)).toBe(
    3,
  );
});
test('reorder exposes store conflict without mutating source cart', async () => {
  const { r, order } = await setup();
  const cart = [{ productId: 'product-1', quantity: 1, storeId: 'store-2' }];
  expect(
    (await prepareReorder(order, 'store-1', r.products, cart)).storeConflict,
  ).toBe(true);
  expect(cart[0].storeId).toBe('store-2');
});
test('notification preferences persist and rehydrate', async () => {
  useNotificationPreferences.getState().toggle('promotions');
  await Promise.resolve();
  useNotificationPreferences.setState({ promotions: false });
  // Load a saved preference snapshot, independent of current in-memory defaults.
  await AsyncStorage.setItem(
    'beerland:notification-preferences',
    JSON.stringify({
      state: { promotions: true, orders: false, loyalty: true },
      version: 1,
    }),
  );
  await useNotificationPreferences.persist.rehydrate();
  expect(useNotificationPreferences.getState()).toMatchObject({
    promotions: true,
    orders: false,
    loyalty: true,
  });
});
test('saved address edits retain identity; deleting selected default safely selects remaining address', () => {
  const a = { id: 'a', city: 'Київ', street: 'Тестова', building: '1' };
  useAddressStore.getState().save(a);
  useAddressStore.getState().save({ ...a, id: 'b' });
  useAddressStore.getState().save({ ...a, building: '2' });
  expect(useAddressStore.getState().addresses).toHaveLength(2);
  useAddressStore.getState().makeDefault('a');
  useAddressStore.getState().remove('a');
  expect(useAddressStore.getState()).toMatchObject({
    selectedId: 'b',
    addresses: [expect.objectContaining({ id: 'b', isDefault: true })],
  });
});

test('rendered QR modules decode back to the exact non-sensitive payload', () => {
  const matrix = loyaltyMatrix(demoLoyalty.qrPayload);
  const scale = 8;
  const width = matrix.size * scale;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  for (const match of matrix.path.matchAll(/M(\d+),(\d+)h1v1h-1z/g)) {
    const x = Number(match[1]) * scale,
      y = Number(match[2]) * scale;
    for (let dy = 0; dy < scale; dy++)
      for (let dx = 0; dx < scale; dx++) {
        const i = ((y + dy) * width + x + dx) * 4;
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
      }
  }
  expect(jsQR(pixels, width, width)?.data).toBe(demoLoyalty.qrPayload);
});

test('demo address seed initializes a new book once without selecting checkout delivery', () => {
  useAddressStore.setState({ addresses: [], selectedId: null, seeded: false });
  const address = {
    id: 'demo',
    city: 'Київ',
    street: 'Демонстраційна',
    building: '1',
  };
  useAddressStore.getState().seed([address]);
  expect(useAddressStore.getState()).toMatchObject({
    seeded: true,
    selectedId: null,
    addresses: [{ ...address, isDefault: true }],
  });
  useAddressStore.getState().remove('demo');
  useAddressStore.getState().seed([address]);
  expect(useAddressStore.getState().addresses).toEqual([]);
});
test('legacy persisted empty address book is respected instead of seeded', async () => {
  await AsyncStorage.setItem(
    'beerland:addresses',
    JSON.stringify({ state: { addresses: [], selectedId: null }, version: 1 }),
  );
  useAddressStore.setState({ seeded: false });
  // Restore the legacy record after the in-memory reset has persisted its state.
  await AsyncStorage.setItem(
    'beerland:addresses',
    JSON.stringify({ state: { addresses: [], selectedId: null }, version: 1 }),
  );
  await useAddressStore.persist.rehydrate();
  expect(useAddressStore.getState().seeded).toBe(true);
});

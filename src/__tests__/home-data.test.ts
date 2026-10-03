import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMockRepositories } from '@/services/mock/repositories';
import {
  findReorder,
  resolveFulfillment,
} from '@/features/home/utils/homeData';
import { readCatalogIntent } from '@/features/catalog/catalogIntent';
import { resolveProductImage } from '@/assets/images';
import { useFulfillmentStore } from '@/stores/fulfillment';
import type { Order } from '@/types/domain';

test('draft filter combines serving type, store membership and availability', async () => {
  const repositories = createMockRepositories();
  const result = await repositories.products.list({
    storeId: 'store-1',
    servingType: 'draft',
    availability: 'available',
  });
  expect(result.map((p) => p.id)).toEqual([
    'product-1',
    'product-3',
    'product-5',
    'product-14',
    'product-17',
    'product-19',
    'product-22',
    'product-25',
  ]);
  const otherStore = await repositories.products.list({
    storeId: 'store-3',
    servingType: 'draft',
    availability: 'available',
  });
  expect(otherStore.map((p) => p.id)).toEqual([
    'product-2',
    'product-4',
    'product-12',
    'product-14',
    'product-17',
  ]);
});
test('promotions enforce active dates and store scope and clone responses', async () => {
  const repositories = createMockRepositories();
  expect(
    await repositories.promotions.list({ activeAt: '2025-01-01T00:00:00Z' }),
  ).toEqual([]);
  const global = await repositories.promotions.list({
    activeAt: '2026-09-16T00:00:00Z',
  });
  expect(global.map((p) => p.id)).toEqual(['discovery']);
  const scoped = await repositories.promotions.list({
    storeId: 'store-1',
    activeAt: '2026-09-16T00:00:00Z',
  });
  expect(scoped.map((p) => p.id)).toEqual(['discovery', 'evening']);
  scoped[0].title = 'Changed';
  expect(
    (
      await repositories.promotions.list({ activeAt: '2026-09-16T00:00:00Z' })
    )[0].title,
  ).not.toBe('Changed');
  const controller = new AbortController();
  controller.abort();
  await expect(
    repositories.promotions.list(
      { activeAt: '2026-09-16T00:00:00Z' },
      { signal: controller.signal },
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });
});
test('fulfillment reconciles delivery-only, pickup-only and unavailable stores', async () => {
  const store = (await createMockRepositories().stores.list())[0];
  expect(
    resolveFulfillment('delivery', { ...store, deliveryAvailable: false }),
  ).toBe('pickup');
  expect(
    resolveFulfillment('pickup', { ...store, pickupAvailable: false }),
  ).toBe('delivery');
  expect(
    resolveFulfillment('pickup', {
      ...store,
      pickupAvailable: false,
      deliveryAvailable: false,
    }),
  ).toBeNull();
});
test('fulfillment persists and rejects malformed stored values', async () => {
  await AsyncStorage.clear();
  useFulfillmentStore.setState({ method: 'pickup' });
  await AsyncStorage.setItem(
    'beerland:fulfillment',
    JSON.stringify({ version: 1, state: { method: 'delivery' } }),
  );
  await useFulfillmentStore.persist.rehydrate();
  expect(useFulfillmentStore.getState().method).toBe('delivery');
  await AsyncStorage.setItem(
    'beerland:fulfillment',
    JSON.stringify({ version: 1, state: { method: 'invalid' } }),
  );
  await useFulfillmentStore.persist.rehydrate();
  expect(useFulfillmentStore.getState().method).toBe('delivery');
  useFulfillmentStore.setState({ method: 'pickup' });
  await AsyncStorage.clear();
});
test('reorder requires every line to be available at the selected store', async () => {
  const products = await createMockRepositories().products.list();
  const order: Order = {
    id: '1',
    storeId: 'store-1',
    items: [{ productId: 'product-1', storeId: 'store-1', quantity: 2 }],
    total: { amount: 10000, currency: 'UAH' },
    status: 'completed',
    fulfillment: 'pickup',
    createdAt: '2026-09-16T12:00:00Z',
  };
  expect(findReorder([order], products, 'store-1')).toEqual(order);
  expect(findReorder([order], products, 'store-2')).toBeUndefined();
  expect(
    findReorder(
      [{ ...order, items: [{ ...order.items[0], productId: 'product-9' }] }],
      products,
      'store-1',
    ),
  ).toBeUndefined();
  expect(
    findReorder([{ ...order, status: 'cancelled' }], products, 'store-1'),
  ).toBeUndefined();
  expect(
    findReorder([{ ...order, items: [] }], products, 'store-1'),
  ).toBeUndefined();
});
test('catalog intent validates categories and preserves search and promotion identity', () => {
  expect(
    readCatalogIntent({
      category: 'ipa',
      q: ' lager ',
      promotionId: 'evening',
    }),
  ).toEqual({
    category: 'ipa',
    q: 'lager',
    promotionId: 'evening',
    collection: undefined,
  });
  expect(
    readCatalogIntent({ category: 'unknown', collection: ['popular'] })
      .category,
  ).toBeUndefined();
});
test('product image resolver distinguishes remote, local and missing media', () => {
  expect(resolveProductImage('https://example.com/beer.jpg')).toEqual({
    uri: 'https://example.com/beer.jpg',
  });
  expect(resolveProductImage('local-product-illustration')).toBeDefined();
  expect(resolveProductImage('')).toBeUndefined();
  expect(resolveProductImage('product-placeholder')).toBeUndefined();
});

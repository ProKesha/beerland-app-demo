import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import { useSelectedStore } from '@/stores/selectedStore';
const item = { productId: 'product-1', storeId: 'store-1', quantity: 1 };
beforeEach(async () => {
  useCartStore.getState().clear();
  useFavoritesStore.getState().clear();
  useSelectedStore.getState().select(null);
  await AsyncStorage.clear();
});
test('cart adds items and increases existing quantity without duplicate rows', () => {
  useCartStore.getState().addItem(item);
  expect(useCartStore.getState().items).toEqual([item]);
  useCartStore.getState().addItem(item);
  expect(useCartStore.getState().items).toEqual([{ ...item, quantity: 2 }]);
});
test('cart quantity can increase and decrease; zero removes the item', () => {
  useCartStore.getState().addItem(item);
  useCartStore.getState().setQuantity(item.productId, item.storeId, 3);
  expect(useCartStore.getState().items[0].quantity).toBe(3);
  useCartStore.getState().setQuantity(item.productId, item.storeId, 2);
  expect(useCartStore.getState().items[0].quantity).toBe(2);
  useCartStore.getState().setQuantity(item.productId, item.storeId, 0);
  expect(useCartStore.getState().items).toEqual([]);
});
test('cart removes one item and clears all items', () => {
  useCartStore.getState().addItem(item);
  useCartStore.getState().addItem({ ...item, productId: 'product-2' });
  useCartStore.getState().removeItem(item.productId, item.storeId);
  expect(useCartStore.getState().items.map((entry) => entry.productId)).toEqual(
    ['product-2'],
  );
  useCartStore.getState().clear();
  expect(useCartStore.getState().items).toEqual([]);
});
test('cart keeps quantities separate across stores and rejects invalid quantities', () => {
  useCartStore.getState().addItem(item);
  useCartStore.getState().addItem({ ...item, storeId: 'store-2' });
  useCartStore.getState().addItem({ ...item, quantity: -1 });
  useCartStore.getState().setQuantity(item.productId, item.storeId, 1.5);
  expect(useCartStore.getState().items).toHaveLength(2);
  expect(useCartStore.getState().items[0].quantity).toBe(1);
});
test('favorites add, remove and report membership', () => {
  expect(useFavoritesStore.getState().isFavorited(item.productId)).toBe(false);
  useFavoritesStore.getState().toggle(item.productId);
  expect(useFavoritesStore.getState().isFavorited(item.productId)).toBe(true);
  useFavoritesStore.getState().toggle(item.productId);
  expect(useFavoritesStore.getState().isFavorited(item.productId)).toBe(false);
});
test('selected store can change and clear', () => {
  useSelectedStore.getState().select('store-1');
  expect(useSelectedStore.getState().storeId).toBe('store-1');
  useSelectedStore.getState().select('store-2');
  expect(useSelectedStore.getState().storeId).toBe('store-2');
  useSelectedStore.getState().select(null);
  expect(useSelectedStore.getState().storeId).toBeNull();
});
test('valid persisted cart is restored without replacing actions', async () => {
  await AsyncStorage.setItem(
    'beerland:cart',
    JSON.stringify({ version: 1, state: { items: [item] } }),
  );
  await useCartStore.persist.rehydrate();
  expect(useCartStore.getState().items).toEqual([item]);
  useCartStore.getState().clear();
  expect(useCartStore.getState().items).toEqual([]);
});
test.each([
  'invalid-json',
  JSON.stringify({ version: 1, state: { items: [{ ...item, quantity: -1 }] } }),
  JSON.stringify({ version: 0, state: { items: [item] } }),
])('invalid or obsolete storage safely falls back: %s', async (value) => {
  await AsyncStorage.setItem('beerland:cart', value);
  await useCartStore.persist.rehydrate();
  expect(useCartStore.getState().items).toEqual([]);
  expect(typeof useCartStore.getState().addItem).toBe('function');
});
test('favorites and selected store persist only their intended fields', async () => {
  useFavoritesStore.getState().toggle('product-1');
  useSelectedStore.getState().select('store-2');
  expect(
    JSON.parse((await AsyncStorage.getItem('beerland:favorites'))!).state,
  ).toEqual({ productIds: ['product-1'] });
  expect(
    JSON.parse((await AsyncStorage.getItem('beerland:selected-store'))!).state,
  ).toEqual({ storeId: 'store-2' });
});

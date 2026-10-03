import { createMockRepositories } from '@/services/mock/repositories';
import { productVariants, variantOffer } from '@/features/product/variants';
import { productRecommendations } from '@/services/mock/productRecommendations';
import { useCartStore } from '@/stores/cart';
import { productSchema } from '@/types/domain';
import AsyncStorage from '@react-native-async-storage/async-storage';

afterEach(() => useCartStore.getState().clear());
test('legacy products get a stable default variant', async () => {
  const product =
    (await createMockRepositories().products.getById('product-15'))!;
  const [variant] = productVariants(product);
  expect(variant.id).toBe('default');
  expect(variant.basePrice).toEqual(product.price);
  expect(variant.volume).toEqual(product.volume);
});
test('explicit missing inventory, unavailable variants and parent inventory fail closed', async () => {
  const p = (await createMockRepositories().products.getById('product-1'))!;
  const variant = productVariants(p)[2];
  expect(variantOffer(p, variant, 'store-1').availability).toBe('unavailable');
  expect(variantOffer(p, variant, 'store-2').availability).toBe('available');
  expect(variantOffer(p, variant, 'store-3').availability).toBe('unavailable');
  expect(
    variantOffer(p, { ...variant, storeOffers: [] }, 'store-2').availability,
  ).toBe('unavailable');
  expect(
    variantOffer({ ...p, availability: 'unavailable' }, variant).availability,
  ).toBe('unavailable');
});
test('store overrides variant price, discount and order limit', async () => {
  const p = (await createMockRepositories().products.getById('product-1'))!;
  const variant = {
    ...productVariants(p)[1],
    storeOffers: [
      {
        storeId: 'store-1',
        availability: 'available' as const,
        price: { amount: 8500, currency: 'UAH' },
        oldPrice: { amount: 10000, currency: 'UAH' },
        maxQuantity: 2,
      },
    ],
  };
  expect(variantOffer(p, variant, 'store-1')).toEqual({
    price: { amount: 8500, currency: 'UAH' },
    oldPrice: { amount: 10000, currency: 'UAH' },
    availability: 'available',
    maxQuantity: 2,
  });
});
test('recommendations exclude current product, invalid references and unavailable store inventory', async () => {
  const repo = createMockRepositories().products;
  const p = (await repo.getById('product-1'))!;
  const snack = (await repo.getById('product-7'))!;
  const beer = (await repo.getById('product-8'))!;
  const results = productRecommendations(
    [
      { ...p, recommendedProductIds: ['missing', snack.id, 'blocked'] },
      snack,
      { ...snack, id: 'blocked', storeOffers: [] },
      beer,
    ],
    p.id,
    'store-1',
  );
  expect(results.pairings.map((item) => item.id)).toEqual([snack.id]);
  expect(results.related.some((item) => item.id === p.id)).toBe(false);
  expect(results.related.some((item) => item.id === beer.id)).toBe(false);
  expect(productRecommendations([p], 'missing')).toEqual({
    pairings: [],
    related: [],
  });
});
test('related ranking favors same category and never repeats current product', async () => {
  const repo = createMockRepositories().products;
  const recommendations = await repo.recommendations('product-1');
  expect(recommendations.related[0].category).toBe('lager');
  expect(recommendations.related.length).toBeGreaterThanOrEqual(4);
  expect(recommendations.related.every((p) => p.id !== 'product-1')).toBe(true);
});
test('cart updates/removes one variant without touching other variants or stores', () => {
  const cart = useCartStore.getState();
  const base = { productId: 'p', storeId: 's', quantity: 1 };
  cart.addItem(base);
  cart.addItem({ ...base, variantId: 'default' });
  cart.addItem({ ...base, variantId: 'large' });
  cart.addItem({ ...base, variantId: 'large', storeId: 'other' });
  expect(useCartStore.getState().items).toHaveLength(3);
  expect(useCartStore.getState().items[0].quantity).toBe(2);
  cart.setQuantity('p', 's', 4, 'large');
  expect(useCartStore.getState().items[1].quantity).toBe(4);
  cart.removeItem('p', 's', 'large');
  expect(useCartStore.getState().items.map((i) => i.storeId)).toEqual([
    's',
    'other',
  ]);
});
test('variant identity survives persisted cart hydration', async () => {
  const item = {
    productId: 'p',
    variantId: 'large',
    storeId: 's',
    quantity: 2,
  };
  await AsyncStorage.setItem(
    'beerland:cart',
    JSON.stringify({ version: 1, state: { items: [item] } }),
  );
  await useCartStore.persist.rehydrate();
  expect(useCartStore.getState().items).toEqual([item]);
});
test('enriched data is schema-valid and covers requested product types', async () => {
  const products = await createMockRepositories().products.list();
  expect(products).toHaveLength(32);
  expect(products.every((p) => productSchema.safeParse(p).success)).toBe(true);
  expect(products.filter((p) => p.variants).length).toBe(8);
});

import { productSchema, storeSchema } from '@/types/domain';
import { createMockRepositories } from '@/services/mock/repositories';
const repositories = createMockRepositories();
test('product repository returns typed, unique products covering the required categories', async () => {
  const products = await repositories.products.list();
  expect(products).toHaveLength(32);
  products.forEach((product) =>
    expect(productSchema.safeParse(product).success).toBe(true),
  );
  expect(new Set(products.map((product) => product.id)).size).toBe(
    products.length,
  );
  expect(new Set(products.map((product) => product.category)).size).toBe(7);
});
test('store repository returns typed store data and product store references resolve', async () => {
  const stores = await repositories.stores.list();
  expect(stores).toHaveLength(3);
  stores.forEach((store) =>
    expect(storeSchema.safeParse(store).success).toBe(true),
  );
  for (const product of await repositories.products.list()) {
    product.storeIds.forEach((id) =>
      expect(stores.some((store) => store.id === id)).toBe(true),
    );
  }
});
test('products are filtered by store and unknown stores have an empty assortment', async () => {
  const products = await repositories.products.list({ storeId: 'store-1' });
  expect(products.length).toBeGreaterThan(0);
  expect(products.length).toBeLessThan(32);
  expect(
    products.every((product) => product.storeIds.includes('store-1')),
  ).toBe(true);
  expect(await repositories.products.list({ storeId: 'unknown' })).toEqual([]);
});
test('lookup returns the matching record or null', async () => {
  expect(await repositories.products.getById('product-1')).toMatchObject({
    id: 'product-1',
  });
  expect(await repositories.stores.getById('store-1')).toMatchObject({
    id: 'store-1',
  });
  expect(await repositories.products.getById('unknown')).toBeNull();
  expect(await repositories.stores.getById('unknown')).toBeNull();
});
test('mock results are isolated from mutations', async () => {
  const first = await repositories.products.list();
  first[0].storeIds.push('invalid');
  expect((await repositories.products.list())[0].storeIds).not.toContain(
    'invalid',
  );
});
test('aborted requests reject without returning data', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    repositories.products.list({}, { signal: controller.signal }),
  ).rejects.toMatchObject({ name: 'AbortError' });
  await expect(
    repositories.stores.list({ signal: controller.signal }),
  ).rejects.toMatchObject({ name: 'AbortError' });
});
test('guest repositories do not invent user accounts or orders', async () => {
  expect(await repositories.users.getCurrent()).toBeNull();
  expect(await repositories.loyalty.getCurrent()).toBeNull();
  expect(await repositories.orders.list()).toEqual([]);
});

import { createMockRepositories } from '@/services/mock/repositories';
import { searchProducts } from '@/services/mock/searchProducts';
import {
  commerceGroupSchema,
  sellingUnitSchema,
  type CommerceGroup,
} from '@/types/domain';
import {
  readCatalogIntent,
  requestFromIntent,
} from '@/features/catalog/catalogIntent';

const repository = createMockRepositories().products;

test.each<CommerceGroup>(['onTap', 'bottled', 'snacks', 'other'])(
  '%s filters the explicit commerce group without introducing products',
  async (group) => {
    const all = await repository.list();
    const result = await repository.searchProducts({
      group,
      storeId: 'store-1',
    });
    expect(
      result.items.every((product) => product.commerceGroup === group),
    ).toBe(true);
    expect(
      result.items.every((product) =>
        all.some((existing) => existing.id === product.id),
      ),
    ).toBe(true);
    expect(all).toHaveLength(32);
    if (group === 'other') expect(result.total).toBe(0);
    else expect(result.total).toBeGreaterThan(0);
  },
);

test('list filtering also supports explicit commerce groups', async () => {
  const snacks = await repository.list({ commerceGroup: 'snacks' });
  expect(snacks).toHaveLength(6);
  expect(snacks.every((product) => product.category === 'snacks')).toBe(true);
  const bottled = await repository.list({ commerceGroup: 'bottled' });
  expect(
    bottled.every((product) => ['bottle', 'can'].includes(product.servingType)),
  ).toBe(true);
});

test('today on tap requires a store and changes with its actual assortment', async () => {
  expect((await repository.searchProducts({ group: 'onTap' })).total).toBe(0);
  const first = await repository.searchProducts({
    group: 'onTap',
    storeId: 'store-1',
  });
  const third = await repository.searchProducts({
    group: 'onTap',
    storeId: 'store-3',
  });
  expect(first.items.map((p) => p.id)).toContain('product-1');
  expect(first.items.map((p) => p.id)).not.toContain('product-2');
  expect(third.items.map((p) => p.id)).toContain('product-2');
  expect(third.items.map((p) => p.id)).not.toContain('product-1');
  for (const result of [first, third]) {
    expect(result.items.every((p) => p.availability === 'available')).toBe(
      true,
    );
    expect(result.items.map((p) => p.id)).not.toContain('product-9');
  }
});

test('today on tap excludes parent stock with no eligible serving offer', async () => {
  const product = (await repository.getById('product-1'))!;
  const unavailableServings = {
    ...product,
    variants: product.variants!.map((variant) => ({
      ...variant,
      availability: 'unavailable' as const,
      storeOffers: [
        { storeId: 'store-1', availability: 'unavailable' as const },
      ],
    })),
  };
  expect(
    searchProducts([unavailableServings], [], {
      group: 'onTap',
      storeId: 'store-1',
    }).total,
  ).toBe(0);
});

test('commerce filtering composes with query, subcategory, style, price, availability and sort', async () => {
  const result = await repository.searchProducts({
    group: 'bottled',
    subcategory: 'beer',
    query: 'IPA',
    category: 'ipa',
    storeId: 'store-3',
    filters: { availableOnly: true, price: 'special' },
    sort: 'price-asc',
  });
  expect(result.items.map((p) => p.id)).toEqual(['product-11']);
  expect(result.items[0].price.amount).toBe(11500);
  const nuts = await repository.searchProducts({
    group: 'snacks',
    subcategory: 'nuts',
  });
  expect(nuts.items.map((p) => p.id)).toEqual(['product-29']);
});

test('metadata only exposes subcategories represented by the existing repository assortment', async () => {
  const metadata = await repository.catalogMetadata();
  const all = await repository.list();
  expect(metadata.commerceGroups!.map((group) => group.id)).toEqual([
    'onTap',
    'bottled',
    'snacks',
    'other',
  ]);
  for (const group of metadata.commerceGroups!) {
    expect(
      group.subcategories.every((subcategory) =>
        all.some(
          (p) =>
            p.commerceGroup === group.id &&
            p.commerceSubcategory === subcategory.id,
        ),
      ),
    ).toBe(true);
  }
  expect(
    metadata.commerceGroups!.find((g) => g.id === 'other')?.subcategories,
  ).toEqual([]);
  expect(
    metadata
      .commerceGroups!.find((g) => g.id === 'snacks')
      ?.subcategories.map((s) => s.label),
  ).toEqual(
    expect.arrayContaining([
      'Грінки',
      'Сирні закуски',
      'Горішки',
      'Чипси / снеки',
    ]),
  );
  expect(
    metadata
      .commerceGroups!.find((g) => g.id === 'bottled')
      ?.subcategories.map((s) => s.label),
  ).toEqual(expect.arrayContaining(['Пиво', 'Сидр', 'Безалкогольні напої']));
});

test('commerce classification and selling units remain independent of product titles and existing prices', async () => {
  const bottle = (await repository.getById('product-8'))!;
  const draft = (await repository.getById('product-1'))!;
  const snack = (await repository.getById('product-7'))!;
  expect(bottle.sellingUnit).toBe('piece');
  expect(bottle.price.amount).toBe(8500);
  expect(draft.sellingUnit).toBeUndefined();
  expect(draft.price.amount).toBe(5000);
  expect(snack.sellingUnit).toBeUndefined();
  expect(snack.volume).toEqual({ value: 100, unit: 'g' });
  const renamed = {
    ...bottle,
    name: 'Житні грінки',
    shortDescription: 'Розливне пиво',
  };
  expect(searchProducts([renamed], [], { group: 'bottled' }).total).toBe(1);
  expect(searchProducts([renamed], [], { group: 'snacks' }).total).toBe(0);
});

test('an injected real other product is discoverable without a placeholder fixture', async () => {
  const existing = (await repository.getById('product-7'))!;
  const merchandise = {
    ...existing,
    commerceGroup: 'other' as const,
    commerceSubcategory: 'accessories',
  };
  expect(
    searchProducts([merchandise], [], {
      group: 'other',
      subcategory: 'accessories',
    }).items,
  ).toEqual([merchandise]);
});

test('canonical group links validate input and preserve existing collection/filter parameters', () => {
  expect(
    requestFromIntent(
      readCatalogIntent({
        group: 'bottled',
        subcategory: 'beer',
        q: 'IPA',
        category: 'ipa',
        availableOnly: 'true',
      }),
    ),
  ).toMatchObject({
    group: 'bottled',
    subcategory: 'beer',
    query: 'IPA',
    category: 'ipa',
    filters: { availableOnly: true },
  });
  expect(
    readCatalogIntent({ group: ['onTap'], subcategory: 'beer' }).group,
  ).toBeUndefined();
  expect(
    readCatalogIntent({ group: 'unknown', subcategory: 'beer' }).subcategory,
  ).toBeUndefined();
  expect(commerceGroupSchema.safeParse('unknown').success).toBe(false);
  expect(sellingUnitSchema.safeParse('bottle').success).toBe(false);
  for (const unit of ['piece', 'pack', 'g', 'kg', 'ml', 'l'])
    expect(sellingUnitSchema.safeParse(unit).success).toBe(true);
});

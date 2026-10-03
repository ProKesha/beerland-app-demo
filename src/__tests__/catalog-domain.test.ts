import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMockRepositories } from '@/services/mock/repositories';
import { searchProducts } from '@/services/mock/searchProducts';
import { productAtStore } from '@/utils/productOffer';
import {
  getBitternessLevel,
  productCount,
  type CatalogFilters,
} from '@/features/catalog/model';
import {
  readCatalogIntent,
  requestFromIntent,
} from '@/features/catalog/catalogIntent';
import { useDiscoveryPreferences } from '@/stores/discoveryPreferences';
import type { Product } from '@/types/domain';

const repository = createMockRepositories().products;
test.each([
  ['сВіТлИй БеРеГ', 'product-1'],
  ['IPA', 'product-3'],
  ['пшеничне', 'product-5'],
  ['Садова варта', 'product-24'],
  ['грейпфрут', 'product-11'],
])(
  'search matches name, style, brewery and description: %s',
  async (query, id) => {
    const result = await repository.searchProducts({ query });
    expect(result.items.map((p) => p.id)).toContain(id);
    expect(result.total).toBeLessThan(32);
  },
);
test.each<[CatalogFilters, (p: Product) => boolean]>([
  [{ styles: ['ipa', 'stout'] }, (p) => ['ipa', 'stout'].includes(p.category)],
  [{ servingTypes: ['can'] }, (p) => p.servingType === 'can'],
  [{ breweries: ['Садова варта'] }, (p) => p.brewery === 'Садова варта'],
  [{ abv: 'light' }, (p) => p.abv !== undefined && p.abv < 4],
  [{ abv: 'balanced' }, (p) => p.abv !== undefined && p.abv >= 4 && p.abv < 5],
  [{ abv: 'strong' }, (p) => p.abv !== undefined && p.abv >= 5 && p.abv < 6],
  [{ abv: 'bold' }, (p) => p.abv !== undefined && p.abv >= 6],
  [{ bitterness: ['high'] }, (p) => p.ibu !== undefined && p.ibu >= 50],
  [{ bitterness: ['low'] }, (p) => p.ibu !== undefined && p.ibu < 25],
  [{ price: 'budget' }, (p) => p.price.amount < 6000],
  [
    { price: 'everyday' },
    (p) => p.price.amount >= 6000 && p.price.amount < 10000,
  ],
  [
    { price: 'special' },
    (p) => p.price.amount >= 10000 && p.price.amount < 15000,
  ],
  [{ price: 'premium' }, (p) => p.price.amount >= 15000],
  [{ availableOnly: true }, (p) => p.availability === 'available'],
  [{ ownBrewery: true }, (p) => p.isOwnBrewery],
  [{ popular: true }, (p) => p.isPopular],
  [{ isNew: true }, (p) => p.isNew],
  [{ alcoholFree: true }, (p) => p.abv !== undefined && p.abv <= 0.5],
])('repository applies filter %j', async (filters, matches) => {
  const { items } = await repository.searchProducts({ filters });
  expect(items.length).toBeGreaterThan(0);
  expect(items.length).toBeLessThan(32);
  expect(items.every(matches)).toBe(true);
});
test('search, category, multiple filters and sorting compose', async () => {
  const page = await repository.searchProducts({
    query: 'IPA',
    category: 'ipa',
    storeId: 'store-2',
    filters: { abv: 'balanced', availableOnly: true, servingTypes: ['draft'] },
    sort: 'price-asc',
  });
  expect(page.items.map((p) => p.id)).toEqual(['product-3']);
});
test.each(['price-asc', 'price-desc', 'abv-asc', 'abv-desc'] as const)(
  'sort %s is numeric and stable',
  async (sort) => {
    const { items } = await repository.searchProducts({ sort });
    const values = items.flatMap((p) =>
      sort.startsWith('price')
        ? [p.price.amount]
        : p.abv === undefined
          ? []
          : [p.abv],
    );
    expect(values).toEqual(
      [...values].sort((a, b) => (sort.endsWith('asc') ? a - b : b - a)),
    );
    if (sort.startsWith('abv'))
      expect(items[items.length - 1].abv).toBeUndefined();
  },
);
test('new and popular sorting rank flagged products first', async () => {
  const newest = await repository.searchProducts({ sort: 'newest' });
  expect(newest.items[0].isNew).toBe(true);
  const popular = await repository.searchProducts({ sort: 'popular' });
  expect(popular.items[0].isPopular).toBe(true);
});
test('selected store changes offers, stock and price, and unavailable items sort last', async () => {
  const one = await repository.searchProducts({ storeId: 'store-1' });
  const three = await repository.searchProducts({ storeId: 'store-3' });
  expect(one.items.find((p) => p.id === 'product-11')?.availability).toBe(
    'unavailable',
  );
  expect(three.items.find((p) => p.id === 'product-11')?.availability).toBe(
    'available',
  );
  const firstUnavailable = one.items.findIndex(
    (p) => p.availability !== 'available',
  );
  expect(
    one.items
      .slice(firstUnavailable)
      .every((p) => p.availability !== 'available'),
  ).toBe(true);
  const only = await repository.searchProducts({
    storeId: 'store-1',
    filters: { availableOnly: true },
  });
  expect(only.items.find((p) => p.id === 'product-11')).toBeUndefined();
  const p = (await repository.getById('product-13'))!;
  expect(productAtStore(p, 'store-2').price.amount).toBe(p.price.amount + 500);
  expect(productAtStore(p, 'missing').availability).toBe('unavailable');
});
test('pagination does not skip or duplicate items and total remains unpaged', async () => {
  const first = await repository.searchProducts({ limit: 5 });
  const second = await repository.searchProducts({
    limit: 5,
    offset: first.nextOffset,
  });
  expect(first.total).toBe(32);
  expect(first.items).toHaveLength(5);
  expect(new Set([...first.items, ...second.items].map((p) => p.id)).size).toBe(
    10,
  );
});
test('promotion requests honor membership, date boundaries and selected store', async () => {
  expect(
    (await repository.searchProducts({ promotionId: 'discovery' })).items
      .map((p) => p.id)
      .sort(),
  ).toEqual(['product-1', 'product-3', 'product-4']);
  expect(
    (
      await repository.searchProducts({
        promotionId: 'evening',
        storeId: 'store-3',
      })
    ).total,
  ).toBe(0);
  const products = await repository.list();
  expect(
    searchProducts(
      products,
      [
        {
          id: 'expired',
          title: '',
          description: '',
          productIds: ['product-1'],
          storeIds: [],
          startsAt: '2000-01-01T00:00:00Z',
          endsAt: '2001-01-01T00:00:00Z',
        },
      ],
      { promotionId: 'expired' },
    ).total,
  ).toBe(0);
});
test.each([
  [undefined, undefined],
  [0, 'low'],
  [24, 'low'],
  [25, 'medium'],
  [49, 'medium'],
  [50, 'high'],
] as const)('central IBU boundaries: %s', (ibu, expected) => {
  expect(getBitternessLevel(ibu)).toBe(expected);
});
test.each([
  [1, '1 товар'],
  [2, '2 товари'],
  [11, '11 товарів'],
  [21, '21 товар'],
  [32, '32 товари'],
  [0, '0 товарів'],
])('Ukrainian plural: %s', (count, expected) => {
  expect(productCount(Number(count))).toBe(expected);
});
test('route aliases initialize all collection and draft parameters safely', () => {
  expect(
    requestFromIntent(
      readCatalogIntent({
        search: 'IPA',
        category: 'ipa',
        servingType: 'draft',
        ownBrewery: 'true',
        popular: 'true',
        promotion: 'discovery',
      }),
    ),
  ).toMatchObject({
    query: 'IPA',
    category: 'ipa',
    promotionId: 'discovery',
    filters: { servingTypes: ['draft'], ownBrewery: true, popular: true },
  });
  expect(
    requestFromIntent(
      readCatalogIntent({
        category: ['ipa'],
        servingType: 'unknown',
        popular: 'false',
      }),
    ),
  ).toMatchObject({ category: 'all', filters: {} });
});
test('recent searches persist, deduplicate, cap, remove and clear without clearing layout preference', async () => {
  await AsyncStorage.clear();
  const state = useDiscoveryPreferences.getState();
  state.clear();
  state.setViewMode('list');
  for (const q of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'IPA', ' ipa '])
    state.remember(q);
  expect(useDiscoveryPreferences.getState().recent).toEqual([
    'ipa',
    'g',
    'f',
    'e',
    'd',
    'c',
  ]);
  const saved = await AsyncStorage.getItem('beerland:discovery');
  useDiscoveryPreferences.setState({ recent: [], viewMode: 'grid' });
  await AsyncStorage.setItem('beerland:discovery', saved!);
  await useDiscoveryPreferences.persist.rehydrate();
  expect(useDiscoveryPreferences.getState().recent[0]).toBe('ipa');
  expect(useDiscoveryPreferences.getState().viewMode).toBe('list');
  state.remove('ipa');
  expect(useDiscoveryPreferences.getState().recent).not.toContain('ipa');
  state.clear();
  expect(useDiscoveryPreferences.getState().recent).toEqual([]);
  expect(useDiscoveryPreferences.getState().viewMode).toBe('list');
  useDiscoveryPreferences.setState({ recent: [], viewMode: 'grid' });
});

import { stores } from '@/services/mock/fixtures';
import {
  getStoreStatus,
  isStoreOpenNow,
  storeLocalTime,
} from '@/features/stores/hours';
import {
  distanceKm,
  sortStores,
  phoneUrl,
  directionsUrl,
} from '@/features/stores/location';
import { mapDocument } from '@/features/stores/map/document';
import {
  readCatalogIntent,
  requestFromIntent,
} from '@/features/catalog/catalogIntent';
const store = {
  ...stores[0],
  openingHours: [{ day: 1, opens: '11:00', closes: '23:00' }],
};
test.each([
  ['2026-09-21T07:00:00Z', false, 'Зачинено · відкриється о 11:00'],
  ['2026-09-21T08:00:00Z', true, 'Відчинено до 23:00'],
  ['2026-09-21T20:00:00Z', false, 'Зачинено сьогодні'],
  ['2026-09-22T09:00:00Z', false, 'Зачинено сьогодні'],
])('timezone-aware status at %s', (time, isOpen, label) => {
  expect(getStoreStatus(store, new Date(time))).toEqual({ isOpen, label });
});
test('temporary closure overrides hours', () =>
  expect(
    isStoreOpenNow(
      { ...store, temporarilyClosed: true },
      new Date('2026-09-21T09:00:00Z'),
    ),
  ).toBe(false));
test('overnight interval carries into next day and ends exclusively', () => {
  const night = {
    ...store,
    openingHours: [{ day: 7, opens: '22:00', closes: '02:00' }],
  };
  expect(isStoreOpenNow(night, new Date('2026-09-20T22:00:00Z'))).toBe(true);
  expect(isStoreOpenNow(night, new Date('2026-09-20T23:00:00Z'))).toBe(false);
});
test('multiple intervals and midday closure', () => {
  const split = {
    ...store,
    openingHours: [
      { day: 1, opens: '10:00', closes: '12:00' },
      { day: 1, opens: '14:00', closes: '20:00' },
    ],
  };
  expect(
    getStoreStatus(split, new Date('2026-09-21T10:00:00Z')).label,
  ).toContain('14:00');
});
test('winter timezone offset does not depend on device timezone', () =>
  expect(storeLocalTime(store, new Date('2026-01-05T09:00:00Z'))).toEqual({
    day: 1,
    minute: 660,
  }));
test('geographic distance and identical coordinates', () => {
  expect(distanceKm(stores[0].coordinates, stores[0].coordinates)).toBe(0);
  expect(
    distanceKm(stores[0].coordinates, stores[1].coordinates),
  ).toBeGreaterThan(450);
  expect(distanceKm(stores[0].coordinates, stores[1].coordinates)).toBeLessThan(
    480,
  );
});
test('selected first, then nearest; input is not mutated', () => {
  const input = [...stores];
  expect(
    sortStores(input, 'store-2', stores[2].coordinates).map((s) => s.id),
  ).toEqual(['store-2', 'store-3', 'store-1']);
  expect(input).toEqual(stores);
});
test('safe telephone links', () => {
  expect(phoneUrl('+380 (50) 123-45-67')).toBe('tel:+380501234567');
  expect(phoneUrl('javascript:alert(1)')).toBeNull();
});
test.each(['ios', 'android', 'web'])('directions on %s', (platform) =>
  expect(directionsUrl(store, platform)).toContain('50.45'),
);
test('map document escapes untrusted store content and supports selection', () => {
  const html = mapDocument({
    stores: [{ ...store, name: '</script><script>alert(1)' }],
    selectedStoreId: store.id,
  });
  expect(html).not.toContain('</script><script>alert(1)');
  expect(html).toContain('tiles.openfreemap.org');
  expect(html).toContain('updateSelection');
});
test('store catalog intent preserves draft and available-only filters', () => {
  expect(
    requestFromIntent(
      readCatalogIntent({ category: 'draft', availableOnly: 'true' }),
    ),
  ).toMatchObject({ category: 'draft', filters: { availableOnly: true } });
});

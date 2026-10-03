import type { Product } from '@/types/domain';

export const catalogCategories = [
  { id: 'all', label: 'Усе', icon: 'grid' },
  { id: 'draft', label: 'Розливне', icon: 'droplet' },
  { id: 'packaged', label: 'Пляшкове / Банкове', icon: 'package' },
  { id: 'ipa', label: 'IPA', icon: 'feather' },
  { id: 'lager', label: 'Лагер', icon: 'sun' },
  { id: 'ale', label: 'Ель', icon: 'sun' },
  { id: 'stout', label: 'Стаут / Портер', icon: 'moon' },
  { id: 'wheat', label: 'Пшеничне', icon: 'wind' },
  { id: 'cider', label: 'Сидр', icon: 'circle' },
  { id: 'non-alcoholic', label: 'Безалкогольне', icon: 'coffee' },
  { id: 'snacks', label: 'Снеки', icon: 'package' },
] as const;
export type CatalogCategory = (typeof catalogCategories)[number]['id'];
export type BitternessLevel = 'low' | 'medium' | 'high';
export const servingOptions = [
  { id: 'draft', label: 'Розливне' },
  { id: 'bottle', label: 'Пляшка' },
  { id: 'can', label: 'Банка' },
  { id: 'other', label: 'Інше' },
] as const;
export const styleOptions = catalogCategories.filter((c) =>
  ['ipa', 'lager', 'ale', 'stout', 'wheat', 'cider'].includes(c.id),
);
export const abvOptions = [
  { id: 'light', label: 'До 4%', min: 0, max: 4 },
  { id: 'balanced', label: '4–5%', min: 4, max: 5 },
  { id: 'strong', label: '5–6%', min: 5, max: 6 },
  { id: 'bold', label: '6%+', min: 6, max: Infinity },
] as const;
export const priceOptions = [
  { id: 'budget', label: 'До 60 ₴', min: 0, max: 6000 },
  { id: 'everyday', label: '60–100 ₴', min: 6000, max: 10000 },
  { id: 'special', label: '100–150 ₴', min: 10000, max: 15000 },
  { id: 'premium', label: '150 ₴+', min: 15000, max: Infinity },
] as const;
export const bitternessOptions = [
  { id: 'low', label: 'Низька' },
  { id: 'medium', label: 'Середня' },
  { id: 'high', label: 'Висока' },
] as const;
export const flagOptions = [
  { id: 'availableOnly', label: 'Лише в наявності' },
  { id: 'ownBrewery', label: 'Власна броварня' },
  { id: 'popular', label: 'Популярне' },
  { id: 'isNew', label: 'Новинки' },
  { id: 'alcoholFree', label: 'Безалкогольне' },
] as const;
export const sortOptions = [
  { id: 'popular', label: 'За популярністю' },
  { id: 'newest', label: 'Новинки' },
  { id: 'price-asc', label: 'Ціна: від нижчої' },
  { id: 'price-desc', label: 'Ціна: від вищої' },
  { id: 'abv-asc', label: 'Міцність: від нижчої' },
  { id: 'abv-desc', label: 'Міцність: від вищої' },
] as const;
export type CatalogSort = (typeof sortOptions)[number]['id'];
export interface CatalogFilters {
  styles?: Product['category'][];
  servingTypes?: Product['servingType'][];
  breweries?: string[];
  abv?: (typeof abvOptions)[number]['id'];
  bitterness?: BitternessLevel[];
  price?: (typeof priceOptions)[number]['id'];
  availableOnly?: boolean;
  ownBrewery?: boolean;
  popular?: boolean;
  isNew?: boolean;
  alcoholFree?: boolean;
}
export interface CatalogRequest {
  storeId?: string;
  query?: string;
  category?: CatalogCategory;
  filters?: CatalogFilters;
  sort?: CatalogSort;
  promotionId?: string;
  offset?: number;
  limit?: number;
}
export interface CatalogPage {
  items: Product[];
  total: number;
  nextOffset?: number;
}
export function getBitternessLevel(ibu?: number): BitternessLevel | undefined {
  if (ibu === undefined || !Number.isFinite(ibu) || ibu < 0) return undefined;
  return ibu < 25 ? 'low' : ibu < 50 ? 'medium' : 'high';
}
export function productCount(n: number) {
  const last = n % 10;
  const teen = n % 100 >= 11 && n % 100 <= 14;
  return `${n} ${!teen && last === 1 ? 'товар' : !teen && last >= 2 && last <= 4 ? 'товари' : 'товарів'}`;
}
export function activeFilters(filters: CatalogFilters) {
  const result: { key: keyof CatalogFilters; value?: string; label: string }[] =
    [];
  for (const key of [
    'styles',
    'servingTypes',
    'breweries',
    'bitterness',
  ] as const) {
    for (const value of filters[key] ?? []) {
      const options =
        key === 'styles'
          ? styleOptions
          : key === 'servingTypes'
            ? servingOptions
            : key === 'bitterness'
              ? bitternessOptions
              : [];
      result.push({
        key,
        value,
        label: options.find((o) => o.id === value)?.label ?? value,
      });
    }
  }
  for (const key of ['abv', 'price'] as const) {
    const value = filters[key];
    const options = key === 'abv' ? abvOptions : priceOptions;
    if (value)
      result.push({
        key,
        label: options.find((o) => o.id === value)?.label ?? value,
      });
  }
  flagOptions.forEach(({ id, label }) => {
    if (filters[id]) result.push({ key: id, label });
  });
  return result;
}
export function removeFilter(
  filters: CatalogFilters,
  key: keyof CatalogFilters,
  value?: string,
): CatalogFilters {
  const next = { ...filters };
  if (
    value &&
    (key === 'styles' ||
      key === 'servingTypes' ||
      key === 'breweries' ||
      key === 'bitterness')
  ) {
    Object.assign(next, { [key]: filters[key]?.filter((v) => v !== value) });
  } else delete next[key];
  return next;
}

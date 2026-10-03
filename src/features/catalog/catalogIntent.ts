import { homeCategories } from '@/features/home/utils/categories';
import {
  catalogCategories,
  type CatalogRequest,
  type CatalogFilters,
} from './model';
import type { Product } from '@/types/domain';
export type CatalogIntent = {
  q?: string;
  category?: string;
  collection?: string;
  promotionId?: string;
  servingType?: Product['servingType'];
  beerStyle?: Product['category'];
  popular?: boolean;
  ownBrewery?: boolean;
  availableOnly?: boolean;
};
export function readCatalogIntent(
  params: Record<string, string | string[] | undefined>,
): CatalogIntent {
  const single = (key: string) =>
    typeof params[key] === 'string'
      ? params[key].trim().slice(0, 200)
      : undefined;
  const category = single('category');
  const collection = single('collection');
  const servingType = single('servingType');
  const beerStyle = single('beerStyle')?.toLowerCase();
  return {
    q: single('q') || single('search') || undefined,
    category: catalogCategories.some((item) => item.id === category)
      ? category
      : undefined,
    collection:
      collection === 'popular' || collection === 'brewery'
        ? collection
        : undefined,
    promotionId: single('promotionId') || single('promotion') || undefined,
    servingType: ['draft', 'bottle', 'can', 'other'].includes(servingType ?? '')
      ? (servingType as Product['servingType'])
      : undefined,
    beerStyle: ['ipa', 'lager', 'ale', 'stout', 'wheat', 'cider'].includes(
      beerStyle ?? '',
    )
      ? (beerStyle as Product['category'])
      : undefined,
    availableOnly: single('availableOnly') === 'true' || undefined,
    popular: single('popular') === 'true' || undefined,
    ownBrewery: single('ownBrewery') === 'true' || undefined,
  };
}
export function requestFromIntent(intent: CatalogIntent): CatalogRequest {
  const filters: CatalogFilters = {};
  if (intent.availableOnly) filters.availableOnly = true;
  if (intent.collection === 'popular' || intent.popular) filters.popular = true;
  if (intent.collection === 'brewery' || intent.ownBrewery)
    filters.ownBrewery = true;
  if (intent.servingType) filters.servingTypes = [intent.servingType];
  if (intent.beerStyle) filters.styles = [intent.beerStyle];
  return {
    query: intent.q ?? '',
    category:
      catalogCategories.find((c) => c.id === intent.category)?.id ?? 'all',
    promotionId: intent.promotionId,
    filters,
    sort: 'popular',
  };
}
export function describeCatalogIntent(intent: CatalogIntent) {
  return [
    intent.q ? `Пошук: ${intent.q}` : undefined,
    homeCategories.find((item) => item.id === intent.category)?.label,
    intent.collection === 'popular'
      ? 'Популярне зараз'
      : intent.collection === 'brewery'
        ? 'Від нашої броварні'
        : undefined,
    intent.promotionId ? 'Обрана добірка' : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}

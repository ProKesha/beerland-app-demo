import type { Product, Promotion } from '@/types/domain';
import {
  abvOptions,
  priceOptions,
  getBitternessLevel,
  type CatalogRequest,
  type CatalogPage,
} from '@/features/catalog/model';
import { productAtStore } from '@/utils/productOffer';
import { getBeerStyleTheme } from '@/theme/beerStyles';

const normalize = (text: string) =>
  text.normalize('NFKC').toLocaleLowerCase('uk-UA').trim();
/** Pure mock adapter. All AND composition is here, never in the rendering layer. */
export function searchProducts(
  products: Product[],
  promotions: Promotion[],
  request: CatalogRequest,
): CatalogPage {
  const { filters: f = {}, category = 'all', storeId } = request;
  const words = normalize(request.query ?? '')
    .split(/\s+/)
    .filter(Boolean);
  const promotion = promotions.find(
    (p) =>
      p.id === request.promotionId &&
      Date.parse(p.startsAt) <= Date.now() &&
      (!p.endsAt || Date.now() < Date.parse(p.endsAt)) &&
      (!p.storeIds.length || (!!storeId && p.storeIds.includes(storeId))),
  );
  const range = abvOptions.find((r) => r.id === f.abv);
  const price = priceOptions.find((r) => r.id === f.price);
  const items = products
    .map((p) => productAtStore(p, storeId))
    .filter((p) => {
      const alcoholFree = p.abv !== undefined && p.abv <= 0.5;
      const categoryMatches =
        category === 'all' ||
        (category === 'draft'
          ? p.servingType === 'draft'
          : category === 'packaged'
            ? ['bottle', 'can'].includes(p.servingType)
            : category === 'non-alcoholic'
              ? alcoholFree
              : p.category === category);
      const haystack = normalize(
        [
          p.name,
          p.shortDescription,
          p.beerStyle,
          p.brewery,
          getBeerStyleTheme(p.category).label,
        ].join(' '),
      );
      return (
        categoryMatches &&
        words.every((word) => haystack.includes(word)) &&
        (!request.promotionId || !!promotion?.productIds.includes(p.id)) &&
        (!f.styles?.length || f.styles.includes(p.category)) &&
        (!f.servingTypes?.length || f.servingTypes.includes(p.servingType)) &&
        (!f.breweries?.length ||
          (!!p.brewery && f.breweries.includes(p.brewery))) &&
        (!range ||
          (p.abv !== undefined && p.abv >= range.min && p.abv < range.max)) &&
        (!price ||
          (p.price.amount >= price.min && p.price.amount < price.max)) &&
        (!f.bitterness?.length ||
          (!!getBitternessLevel(p.ibu) &&
            f.bitterness.includes(getBitternessLevel(p.ibu)!))) &&
        (!f.availableOnly || p.availability === 'available') &&
        (!f.ownBrewery || p.isOwnBrewery) &&
        (!f.popular || p.isPopular) &&
        (!f.isNew || p.isNew) &&
        (!f.alcoholFree || alcoholFree)
      );
    });
  items.sort((a, b) => {
    // Stock is a leading group for every sort. Explicit sorts apply within each group.
    const stock =
      Number(b.availability === 'available') -
      Number(a.availability === 'available');
    if (storeId && stock) return stock;
    let order = 0;
    switch (request.sort) {
      case 'price-asc':
        order = a.price.amount - b.price.amount;
        break;
      case 'price-desc':
        order = b.price.amount - a.price.amount;
        break;
      case 'abv-asc':
      case 'abv-desc':
        if (a.abv === undefined || b.abv === undefined)
          order = Number(a.abv === undefined) - Number(b.abv === undefined);
        else order = (a.abv - b.abv) * (request.sort === 'abv-desc' ? -1 : 1);
        break;
      case 'newest':
        order =
          Number(b.isNew) - Number(a.isNew) ||
          (b.releasedAt ?? '').localeCompare(a.releasedAt ?? '');
        break;
      default:
        order = Number(b.isPopular) - Number(a.isPopular);
    }
    return order || a.id.localeCompare(b.id, 'en', { numeric: true });
  });
  const offset = Math.max(0, Math.floor(request.offset ?? 0));
  const limit = Math.max(1, Math.min(100, Math.floor(request.limit ?? 36)));
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    nextOffset: offset + limit < items.length ? offset + limit : undefined,
  };
}

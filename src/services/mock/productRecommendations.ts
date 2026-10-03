import type { Product } from '@/types/domain';
import { productAtStore } from '@/utils/productOffer';
import { productVariants, variantOffer } from '@/features/product/variants';

export function productRecommendations(
  products: Product[],
  id: string,
  storeId?: string,
) {
  const source = products.find((product) => product.id === id);
  if (!source) return { pairings: [], related: [] };
  const candidates = products
    .filter((p) => p.id !== id)
    .map((p) => productAtStore(p, storeId))
    .filter(
      (p) =>
        variantOffer(p, productVariants(p)[0], storeId).availability ===
        'available',
    );
  const pairings =
    source.category === 'snacks'
      ? []
      : candidates
          .filter(
            (p) =>
              p.category === 'snacks' &&
              (!source.recommendedProductIds ||
                source.recommendedProductIds.includes(p.id)),
          )
          .slice(0, 5);
  const score = (p: Product) =>
    (p.category === source.category ? 8 : 0) +
    (p.brewery && p.brewery === source.brewery ? 2 : 0) +
    p.flavorProfile.filter((tag) => source.flavorProfile.includes(tag)).length;
  const related = candidates
    .filter((p) => (p.category === 'snacks') === (source.category === 'snacks'))
    .map((p) => ({ product: p, score: score(p) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) => b.score - a.score || a.product.id.localeCompare(b.product.id),
    )
    .slice(0, 6)
    .map((entry) => entry.product);
  return { pairings, related };
}

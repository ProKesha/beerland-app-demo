import type { Product } from '@/types/domain';

/** Store offers override base fields; missing records in an explicit inventory are unavailable. */
export function productAtStore(product: Product, storeId?: string): Product {
  if (!storeId) return product;
  const offer = product.storeOffers?.find((item) => item.storeId === storeId);
  return {
    ...product,
    availability: product.storeOffers
      ? (offer?.availability ?? 'unavailable')
      : product.storeIds.includes(storeId)
        ? product.availability
        : 'unavailable',
    price: offer?.price ?? product.price,
  };
}

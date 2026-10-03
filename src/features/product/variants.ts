import type { Product, ProductVariant } from '@/types/domain';
import { productAtStore } from '@/utils/productOffer';
import { formatVolume } from '@/utils/format';

/** The default SKU preserves the existing cards and persisted cart identity. */
export const DEFAULT_VARIANT = 'default';
export function variantLabel(variant: ProductVariant) {
  return variant.volume.unit === 'ml' && variant.volume.value >= 1000
    ? `${new Intl.NumberFormat('uk-UA').format(variant.volume.value / 1000)} л`
    : formatVolume(variant.volume);
}
export function productVariants(product: Product): ProductVariant[] {
  return (
    product.variants ?? [
      {
        id: DEFAULT_VARIANT,
        volume: product.volume,
        servingType: product.servingType,
        basePrice: product.price,
        availability: product.availability,
      },
    ]
  );
}

export function variantOffer(
  product: Product,
  variant: ProductVariant,
  storeId?: string,
) {
  const parent = productAtStore(product, storeId);
  const offer = storeId
    ? variant.storeOffers?.find((entry) => entry.storeId === storeId)
    : undefined;
  return {
    price:
      offer?.price ??
      (variant.id === DEFAULT_VARIANT && storeId
        ? product.storeOffers?.find((entry) => entry.storeId === storeId)?.price
        : undefined) ??
      variant.basePrice,
    oldPrice: offer?.oldPrice ?? variant.oldPrice,
    availability:
      parent.availability !== 'available'
        ? parent.availability
        : storeId && variant.storeOffers
          ? (offer?.availability ?? 'unavailable')
          : variant.availability,
    maxQuantity: offer?.maxQuantity ?? variant.maxQuantity,
  };
}

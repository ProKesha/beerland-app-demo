import type { Product } from '@/types/domain';
import { commerceGroups, type CatalogMetadata } from '@/features/catalog/model';
import { productVariants, variantOffer } from '@/features/product/variants';

// Explicit records describe the existing snack assortment, never title parsing.
const snackSubcategories: Record<string, string> = {
  'product-7': 'croutons',
  'product-10': 'cheese',
  'product-29': 'nuts',
  'product-30': 'chips',
  'product-31': 'cheese',
  'product-32': 'chips',
};
const subcategoryLabels: Record<string, string> = {
  beer: 'Пиво',
  cider: 'Сидр',
  alcoholFree: 'Безалкогольні напої',
  croutons: 'Грінки',
  nuts: 'Горішки',
  chips: 'Чипси / снеки',
  cheese: 'Сирні закуски',
};

/** The product has already been projected to the requested store's offer. */
export function isAvailableOnTapAtStore(product: Product, storeId?: string) {
  return (
    !!storeId &&
    product.commerceGroup === 'onTap' &&
    product.availability === 'available' &&
    productVariants(product).some(
      (variant) =>
        variant.servingType === 'draft' &&
        variantOffer(product, variant, storeId).availability === 'available',
    )
  );
}

/** Adapter classification of the current demo data, independent of rendering. */
export function enrichProductCommerce(product: Product): Product {
  const commerceGroup =
    product.category === 'snacks'
      ? 'snacks'
      : product.servingType === 'draft'
        ? 'onTap'
        : product.servingType === 'bottle' || product.servingType === 'can'
          ? 'bottled'
          : 'other';
  const commerceSubcategory =
    commerceGroup === 'snacks'
      ? snackSubcategories[product.id]
      : commerceGroup === 'other'
        ? undefined
        : product.abv !== undefined && product.abv <= 0.5
          ? 'alcoholFree'
          : product.category === 'cider'
            ? 'cider'
            : 'beer';
  return {
    ...product,
    commerceGroup,
    commerceSubcategory,
    // Snack gram servings and draft serving prices retain their original units.
    ...(commerceGroup === 'bottled' ? { sellingUnit: 'piece' as const } : {}),
  };
}

export function catalogMetadata(products: Product[]): CatalogMetadata {
  return {
    breweries: [
      ...new Set(products.flatMap((p) => (p.brewery ? [p.brewery] : []))),
    ].sort(),
    commerceGroups: commerceGroups.map(({ id, label }) => ({
      id,
      label,
      subcategories: [
        ...new Set(
          products
            .filter((p) => p.commerceGroup === id)
            .flatMap((p) =>
              p.commerceSubcategory ? [p.commerceSubcategory] : [],
            ),
        ),
      ].map((subcategory) => ({
        id: subcategory,
        label: subcategoryLabels[subcategory] ?? subcategory,
      })),
    })),
  };
}

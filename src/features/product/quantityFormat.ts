import type { Product, ProductVariant } from '@/types/domain';
import { formatVolume } from '@/utils/format';

const units = {
  piece: 'шт.',
  pack: 'уп.',
  g: 'г',
  kg: 'кг',
  ml: 'мл',
  l: 'л',
} as const;
export function formatSellingUnit(unit: keyof typeof units) {
  return units[unit];
}
export function formatServingAmount(variant: ProductVariant) {
  return variant.volume.unit === 'ml'
    ? `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 3 }).format(variant.volume.value / 1000)} л`
    : formatVolume(variant.volume);
}
/** Prices remain per repository serving; pieces do not change bottle volume. */
export function priceUnit(product: Product, variant?: ProductVariant) {
  const serving = variant?.servingType ?? product.servingType;
  const sellingUnit = variant?.sellingUnit ?? product.sellingUnit;
  if (sellingUnit) return formatSellingUnit(sellingUnit);
  if (serving === 'bottle' || serving === 'can')
    return formatSellingUnit('piece');
  return formatVolume(variant?.volume ?? product.volume);
}
export function formatProductQuantity(
  product: Product,
  variant: ProductVariant,
  quantity: number,
) {
  const sellingUnit = variant.sellingUnit ?? product.sellingUnit;
  if (
    variant.servingType === 'bottle' ||
    variant.servingType === 'can' ||
    sellingUnit === 'piece' ||
    sellingUnit === 'pack'
  )
    return `${quantity} ${formatSellingUnit(sellingUnit === 'pack' ? 'pack' : 'piece')}`;
  const amount =
    variant.servingType === 'draft'
      ? formatServingAmount(variant)
      : formatVolume(variant.volume);
  return quantity === 1 ? amount : `${quantity} × ${amount}`;
}

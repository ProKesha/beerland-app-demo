import { useLayoutEffect, useRef } from 'react';
import type { CartItem, Product } from '@/types/domain';
import { QuantityControl } from '@/components/ui';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import {
  adjacentServing,
  canChangeServing,
  stepProductCartLine,
} from '@/features/product/cartActions';
import { productVariants } from '@/features/product/variants';
import { formatServingAmount } from '@/features/product/quantityFormat';

export function ServingControl({
  product,
  item,
  canOrder,
  onVariantChange,
}: {
  product: Product;
  item: CartItem;
  canOrder: boolean;
  onVariantChange?: (variantId: string) => void;
}) {
  const items = useCartStore((s) => s.items);
  const selected = useSelectedStore((s) => s.storeId);
  const hydrated = useSessionStore((s) => s.hydrated);
  const source = useRef(item.variantId ?? 'default');
  useLayoutEffect(() => {
    source.current = item.variantId ?? 'default';
  }, [item.variantId]);
  const variant = productVariants(product).find(
    (v) => v.id === (item.variantId ?? 'default'),
  );
  if (!variant || variant.servingType !== 'draft') return null;
  const next = adjacentServing(product, item, 1);
  const previous = adjacentServing(product, item, -1);
  const current = selected === item.storeId && hydrated;
  return (
    <QuantityControl
      value={1}
      displayValue={formatServingAmount(variant)}
      label={`Об’єм порції: ${product.name}`}
      incrementLabel={
        next
          ? `Збільшити об’єм до ${formatServingAmount(next)}: ${product.name}`
          : `Збільшити об’єм: ${product.name}`
      }
      decrementLabel={
        previous
          ? `Зменшити об’єм до ${formatServingAmount(previous)}: ${product.name}`
          : `Видалити порцію з кошика: ${product.name}`
      }
      incrementDisabled={
        !current ||
        !canOrder ||
        !next ||
        !canChangeServing(product, item, 1, items)
      }
      decrementDisabled={
        !current ||
        (!canOrder && !!previous) ||
        !canChangeServing(product, item, -1, items)
      }
      onStep={(direction) => {
        const result = stepProductCartLine(
          product,
          item.storeId,
          direction,
          canOrder,
          source.current,
        );
        if (typeof result === 'string') {
          source.current = result;
          onVariantChange?.(result);
        }
      }}
    />
  );
}

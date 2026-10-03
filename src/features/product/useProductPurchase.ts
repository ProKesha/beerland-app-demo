import { useState } from 'react';
import type { Product, ProductVariant } from '@/types/domain';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import { useStores } from '@/features/stores/useStores';
import { useToast } from '@/components/ui';
import { productVariants, variantOffer } from './variants';
import { addProductVariantToCart, quantityLimit } from './cartActions';

export function useProductPurchase(product: Product) {
  const hydrated = useSessionStore((s) => s.hydrated);
  const storeId = useSelectedStore((s) => s.storeId) ?? undefined;
  const stores = useStores({ enabled: hydrated });
  const store = stores.data?.find((s) => s.id === storeId);
  const variants = productVariants(product);
  const [variantId, setVariantId] = useState(variants[0].id);
  const [quantity, setQuantity] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const offer = variantOffer(product, variant, storeId);
  const cartItems = useCartStore((s) => s.items);
  const existing =
    cartItems.find(
      (item) =>
        item.productId === product.id &&
        item.storeId === storeId &&
        (item.variantId ?? 'default') === variant.id,
    )?.quantity ?? 0;
  const remaining = Math.max(
    0,
    (storeId ? quantityLimit(product, variant, storeId) : 99) - existing,
  );
  const selectedQuantity = Math.max(1, Math.min(quantity, remaining));
  const canOrder =
    !!store &&
    !store.temporarilyClosed &&
    (store.pickupAvailable || store.deliveryAvailable);
  const canBuy =
    hydrated && canOrder && offer.availability === 'available' && remaining > 0;
  const toast = useToast();
  const selectVariant = (next: ProductVariant) => {
    if (variantOffer(product, next, storeId).availability !== 'available')
      return;
    setVariantId(next.id);
  };
  const add = () => {
    if (!hydrated) return;
    if (!storeId) {
      setPickerOpen(true);
      return;
    }
    if (!canBuy) return;
    if (
      addProductVariantToCart(
        product,
        variant,
        storeId,
        selectedQuantity,
        canOrder,
      ) === 'added'
    )
      toast.show('Додано в кошик');
  };
  return {
    hydrated,
    storeId,
    store,
    stores,
    variants,
    variant,
    offer,
    quantity: selectedQuantity,
    setQuantity,
    selectVariant,
    canBuy,
    canOrder,
    remaining,
    add,
    pickerOpen,
    setPickerOpen,
  };
}

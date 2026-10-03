import { useReorder } from '@/features/orders/useReorder';
import { router } from 'expo-router';
import type { Order, Product } from '@/types/domain';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import { useToast } from '@/components/ui';
import { productVariants, variantOffer } from '@/features/product/variants';

export function useHomeActions(
  storeId: string | undefined,
  canOrder: boolean,
  chooseStore: () => void,
) {
  const toast = useToast();
  const repeat = useReorder();
  const favorites = useFavoritesStore((state) => state.productIds);
  const toggle = useFavoritesStore((state) => state.toggle);
  const addItem = useCartStore((state) => state.addItem);
  return {
    favorites,
    openProduct: (product: Product) =>
      router.push({ pathname: '/product/[id]', params: { id: product.id } }),
    favorite: (product: Product) => {
      const wasFavorite = useFavoritesStore
        .getState()
        .productIds.includes(product.id);
      toggle(product.id);
      toast.show(wasFavorite ? 'Видалено з обраного' : 'Додано в обране');
    },
    add: (product: Product) => {
      if (!storeId) {
        chooseStore();
        return;
      }
      const variant = productVariants(product)[0];
      const offer = variantOffer(product, variant, storeId);
      if (!canOrder || offer.availability !== 'available') {
        toast.show('Товар зараз недоступний у цьому магазині');
        return;
      }
      const existing =
        useCartStore
          .getState()
          .items.find(
            (item) =>
              item.productId === product.id &&
              item.storeId === storeId &&
              (item.variantId ?? 'default') === variant.id,
          )?.quantity ?? 0;
      if (offer.maxQuantity !== undefined && existing >= offer.maxQuantity) {
        toast.show('Максимальну кількість уже додано в кошик');
        return;
      }
      addItem({
        productId: product.id,
        ...(variant.id === 'default' ? {} : { variantId: variant.id }),
        storeId,
        quantity: 1,
      });
      toast.show('Додано в кошик');
    },
    reorder: (order: Order) => repeat.reorder(order),
    reorderFeedback: repeat.feedback,
    reordering: repeat.busy,
  };
}

import { useReorder } from '@/features/orders/useReorder';
import { router } from 'expo-router';
import type { Order, Product } from '@/types/domain';
import { useFavoritesStore } from '@/stores/favorites';
import { useToast } from '@/components/ui';
import { addProductToCart } from '@/features/product/cartActions';

export function useHomeActions(
  storeId: string | undefined,
  canOrder: boolean,
  chooseStore: () => void,
) {
  const toast = useToast();
  const repeat = useReorder();
  const favorites = useFavoritesStore((state) => state.productIds);
  const toggle = useFavoritesStore((state) => state.toggle);
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
      const result = addProductToCart(product, storeId, canOrder);
      if (result === 'stale') return;
      toast.show(
        result === 'added'
          ? 'Додано в кошик'
          : result === 'limit'
            ? 'Максимальну кількість уже додано в кошик'
            : 'Товар зараз недоступний у цьому магазині',
      );
    },
    reorder: (order: Order) => repeat.reorder(order),
    reorderFeedback: repeat.feedback,
    reordering: repeat.busy,
  };
}

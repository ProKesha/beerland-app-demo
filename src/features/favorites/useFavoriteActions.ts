import { router } from 'expo-router';
import { useToast } from '@/components/ui';
import { addProductToCart } from '@/features/product/cartActions';
import { useFavoritesStore } from '@/stores/favorites';
import { sessionOwner, useSessionStore } from '@/stores/session';
import type { Product } from '@/types/domain';

export function useFavoriteActions(
  storeId: string | undefined,
  canOrder: boolean,
) {
  const toast = useToast();
  const toggle = useFavoritesStore((state) => state.toggle);
  const owner = useSessionStore(sessionOwner);
  const isCurrentOwner = () => {
    const session = useSessionStore.getState();
    return session.hydrated && sessionOwner(session) === owner;
  };
  const remove = (id: string) => {
    if (!isCurrentOwner() || !useFavoritesStore.getState().isFavorited(id))
      return;
    toggle(id);
    toast.show('Видалено з обраного');
  };
  return {
    remove,
    openProduct: (product: Product) =>
      router.push({ pathname: '/product/[id]', params: { id: product.id } }),
    favorite: (product: Product) => remove(product.id),
    add: (product: Product) => {
      if (!isCurrentOwner()) return;
      if (!storeId) {
        router.push('/stores');
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
  };
}

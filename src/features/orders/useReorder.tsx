import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { AppText, Button, Modal } from '@/components/ui';
import { useRepositories } from '@/repositories/RepositoryProvider';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useStoreSelection } from '@/features/stores/useStoreSelection';
import { useStores } from '@/features/stores/useStores';
import type { Order } from '@/types/domain';
import { prepareReorder, type ReorderResult } from './reorder';
export function useReorder() {
  const repositories = useRepositories();
  const stores = useStores();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReorderResult | null>(null);
  const [error, setError] = useState(false);
  const last = useRef<Order | null>(null);
  const selection = useStoreSelection(stores.data ?? [], (store) =>
    useSelectedStore.getState().select(store.id),
  );
  async function commit(order: Order, storeId: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      // Retry against the latest cart if it changes during repository reads.
      const before = useCartStore.getState().items;
      const next = await prepareReorder(
        order,
        storeId,
        repositories.products,
        before,
      );
      if (
        useSelectedStore.getState().storeId !== storeId ||
        before !== useCartStore.getState().items ||
        next.storeConflict
      )
        throw new Error('Cart changed');
      next.availableItems.forEach(useCartStore.getState().addItem);
      setResult(next);
    } catch {
      setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const reorder = (order: Order, availableStores = stores.data) => {
    if (lock.current || selection.pending) return;
    last.current = order;
    const storeId = useSelectedStore.getState().storeId || order.storeId;
    const store = availableStores?.find((s) => s.id === storeId);
    if (
      !store ||
      store.temporarilyClosed ||
      (!store.deliveryAvailable && !store.pickupAvailable)
    ) {
      setError(true);
      return;
    }
    selection.choose(store, () => {
      void commit(order, store.id);
    });
  };
  return {
    reorder,
    busy,
    feedback: (
      <>
        {selection.confirmation}
        <Modal
          visible={!!result}
          title={
            result?.unavailableItems.length
              ? 'Не все вдалося додати'
              : 'Товари додано до кошика'
          }
          onClose={() => setResult(null)}
        >
          <AppText>
            {result?.availableItems.reduce((n, i) => n + i.quantity, 0) ?? 0}{' '}
            од. додано до кошика.{' '}
            {result?.unavailableItems.reduce((n, i) => n + i.quantity, 0) ?? 0}{' '}
            од. недоступні або перевищують ліміт.
          </AppText>
          {!!result?.changedPrices.length && (
            <AppText>
              Ціни змінилися. Використано поточні ціни магазину.
            </AppText>
          )}
          <Button
            label="До кошика"
            onPress={() => {
              setResult(null);
              router.push('/cart');
            }}
          />
        </Modal>
        <Modal
          visible={error}
          title="Не вдалося повторити замовлення"
          description="Перевірте обраний магазин і спробуйте ще раз."
          onClose={() => setError(false)}
        >
          <Button
            label="Спробувати ще раз"
            onPress={() => {
              setError(false);
              void stores.refetch().then((fresh) => {
                if (last.current) reorder(last.current, fresh.data);
              });
            }}
          />
          <Button
            label="Обрати магазин"
            variant="outline"
            onPress={() => {
              setError(false);
              router.push('/stores');
            }}
          />
        </Modal>
      </>
    ),
  };
}

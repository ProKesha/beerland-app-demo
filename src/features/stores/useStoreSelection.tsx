import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Store } from '@/types/domain';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useSessionStore } from '@/stores/session';
import { commitCartTransfer } from '@/stores/cartTransfer';
import { useRepositories } from '@/repositories/RepositoryProvider';
import { prepareCartTransfer } from '@/features/cart/transfer';
import { cartResourceKey } from '@/features/cart/useCartQuote';
import { AppText, Button, Modal, useToast } from '@/components/ui';

// All picker instances share the same in-flight transfer boundary.
let transferring = false;
/** Shared store selection for Home, Catalog, Product, Stores, Checkout and reorder. */
export function useStoreSelection(
  stores: Store[],
  onSelect: (store: Store) => void,
) {
  const [pending, setPending] = useState<{
    store: Store;
    after?: () => void;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const repositories = useRepositories();
  const client = useQueryClient();
  const toast = useToast();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const fulfillmentWarning = (store: Store) => {
    const method = useFulfillmentStore.getState().method;
    return (
      method === 'delivery' ? store.deliveryAvailable : store.pickupAvailable
    )
      ? ''
      : ' Обраний спосіб отримання недоступний. Оберіть доступний спосіб у кошику.';
  };
  const choose = (store: Store, after?: () => void) => {
    if (transferring || !useSessionStore.getState().hydrated) return;
    const items = useCartStore.getState().items;
    if (items.some((item) => item.storeId !== store.id)) {
      setError('');
      setPending({ store, after });
      return;
    }
    if (useSelectedStore.getState().storeId !== store.id) {
      useSelectedStore.getState().select(store.id);
      onSelect(store);
      const warning = fulfillmentWarning(store);
      if (warning) toast.show(warning.trim());
    }
    after?.();
  };
  const cancel = () => {
    if (transferring) return;
    setPending(null);
    setError('');
  };
  async function confirm() {
    if (!pending || transferring) return;
    transferring = true;
    setBusy(true);
    setError('');
    const original = useCartStore.getState().items;
    const originalStore = useSelectedStore.getState().storeId;
    const method = useFulfillmentStore.getState().method;
    try {
      const result = await prepareCartTransfer(
        original,
        pending.store.id,
        method,
        repositories,
      );
      if (!mounted.current) return;
      if (
        original !== useCartStore.getState().items ||
        originalStore !== useSelectedStore.getState().storeId ||
        method !== useFulfillmentStore.getState().method
      )
        throw new Error('Cart changed during validation');
      // Seed the exact freshly validated resources before the new selection renders.
      client.setQueryData(
        cartResourceKey(result.items, result.resources.store.id),
        result.resources,
      );
      commitCartTransfer(result.items, result.resources.store.id);
      setPending(null);
      const unavailable = result.quote.lines.some((line) => !line.available);
      const quantityConflict = result.quote.lines.some(
        (line) => line.item.quantity > line.maxQuantity,
      );
      toast.show(
        [
          unavailable
            ? 'Кошик перенесено. Деякі товари недоступні в цьому магазині.'
            : 'Кошик перенесено.',
          result.changedPrices.length
            ? 'Ціни оновлено відповідно до нового магазину.'
            : '',
          quantityConflict
            ? 'Перевірте кількість товарів: ліміти нового магазину відрізняються.'
            : '',
          fulfillmentWarning(result.resources.store).trim(),
        ]
          .filter(Boolean)
          .join(' '),
      );
      onSelect(result.resources.store);
      pending.after?.();
    } catch {
      if (mounted.current)
        setError(
          'Не вдалося перенести кошик. Поточні товари та магазин збережено. Спробуйте ще раз.',
        );
    } finally {
      transferring = false;
      if (mounted.current) setBusy(false);
    }
  }
  // Retain the shared signature; display names can come from any injected listing.
  const targetName =
    pending &&
    (stores.find((store) => store.id === pending.store.id)?.name ??
      pending.store.name);
  const confirmation = (
    <Modal
      visible={!!pending}
      title="Змінити магазин?"
      description="Перевіримо наявність товарів і перенесемо ваш кошик. Ціни та доступність можуть відрізнятися."
      onClose={cancel}
    >
      {!!targetName && <AppText variant="label">{targetName}</AppText>}
      {!!error && (
        <AppText accessibilityRole="alert" color="error">
          {error}
        </AppText>
      )}
      <Button
        label="Скасувати"
        variant="outline"
        disabled={busy}
        onPress={cancel}
      />
      <Button
        label={error ? 'Спробувати ще раз' : 'Перенести кошик'}
        testID="confirm-cart-transfer"
        loading={busy}
        onPress={() => {
          void confirm();
        }}
      />
    </Modal>
  );
  return { choose, confirmation, pending: !!pending, cancel, busy };
}

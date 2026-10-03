import { Platform } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/RepositoryProvider';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useCheckoutStore } from '@/stores/checkout';
import {
  checkoutSchema,
  paymentMethods,
  type CheckoutDetails,
} from '@/features/checkout/model';
import { cartResourceKey, fetchCartQuote } from '@/features/cart/useCartQuote';
import {
  cartKey,
  cartSignature,
  orderLines,
  quoteFingerprint,
  type CartQuote,
} from '@/features/cart/pricing';
import type { CreateOrderInput } from './model';
import { orderDetailKey } from './useOrder';
import { sessionOwner, useSessionStore } from '@/stores/session';

export class CheckoutReviewError extends Error {}
let requestSequence = 0;
export function useCreateOrder() {
  const repositories = useRepositories();
  const client = useQueryClient();
  const mutation = useMutation({
    retry: false,
    mutationFn: async ({
      details,
      reviewed,
    }: {
      details: CheckoutDetails;
      reviewed: CartQuote;
    }) => {
      const owner = sessionOwner(useSessionStore.getState());
      const validated = checkoutSchema.parse(details);
      if (!paymentMethods(Platform.OS).includes(validated.paymentMethod))
        throw new CheckoutReviewError('Оберіть доступний спосіб оплати.');
      const items = useCartStore.getState().items.map((item) => ({ ...item }));
      const storeId = useSelectedStore.getState().storeId;
      const method = useFulfillmentStore.getState().method;
      const signature = cartSignature(items, storeId, method);
      const fresh = await fetchCartQuote(repositories, items, storeId, method);
      client.setQueryData(cartResourceKey(items, storeId), {
        products: Object.fromEntries(
          fresh.lines.map((line) => [line.item.productId, line.product]),
        ),
        store: fresh.store,
      });
      if (
        owner !== sessionOwner(useSessionStore.getState()) ||
        signature !==
          cartSignature(
            useCartStore.getState().items,
            useSelectedStore.getState().storeId,
            useFulfillmentStore.getState().method,
          ) ||
        method !== validated.fulfillmentType
      )
        throw new CheckoutReviewError(
          'Кошик змінився. Перевірте замовлення ще раз.',
        );
      if (!fresh.canCheckout)
        throw new CheckoutReviewError(
          'Кошик потребує уваги. Перевірте наявність товарів і спосіб отримання.',
        );
      if (quoteFingerprint(fresh) !== quoteFingerprint(reviewed))
        throw new CheckoutReviewError(
          'Ціни або наявність змінилися. Перевірте оновлений підсумок і підтвердьте ще раз.',
        );
      const { belowMinimum: _belowMinimum, ...totals } = fresh.totals;
      const payload = {
        ...validated,
        ageConfirmed: true as const,
        ...totals,
        items: orderLines(fresh),
        storeId: storeId!,
        storeName: fresh.store!.name,
        storeAddress: fresh.store!.address,
        address: method === 'delivery' ? validated.address : undefined,
      };
      const payloadSignature = JSON.stringify(payload);
      let attempt = useCheckoutStore.getState().attempt;
      if (attempt?.signature !== payloadSignature) {
        attempt = {
          signature: payloadSignature,
          key: `checkout-${Date.now()}-${++requestSequence}`,
        };
        useCheckoutStore.setState({ attempt });
      }
      const input: CreateOrderInput = {
        ...payload,
        idempotencyKey: attempt.key,
      };
      const order = await repositories.orders.create(input);
      if (owner !== sessionOwner(useSessionStore.getState()))
        throw new CheckoutReviewError(
          'Сесію змінено. Перевірте замовлення у своєму профілі.',
        );
      // Preserve anything added from another screen while the request was in flight.
      for (const purchased of items) {
        const current = useCartStore
          .getState()
          .items.find((item) => cartKey(item) === cartKey(purchased));
        if (current)
          useCartStore
            .getState()
            .setQuantity(
              current.productId,
              current.storeId,
              Math.max(0, current.quantity - purchased.quantity),
              current.variantId,
            );
      }
      useCheckoutStore.getState().reset();
      client.setQueryData(orderDetailKey(order.id, owner), order);
      void client.invalidateQueries({ queryKey: ['orders', 'list'] });
      return order;
    },
  });
  const submit = async (details: CheckoutDetails, reviewed: CartQuote) => {
    // A shared synchronous lock also covers double clicks and two mounted checkout screens.
    if (useCheckoutStore.getState().submitting) return undefined;
    useCheckoutStore.setState({ submitting: true });
    try {
      return await mutation.mutateAsync({ details, reviewed });
    } finally {
      useCheckoutStore.setState({ submitting: false });
    }
  };
  return { ...mutation, submit };
}

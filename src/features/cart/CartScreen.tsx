import { useState } from 'react';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  Container,
  ErrorState,
  LoadingIndicator,
  Screen,
} from '@/components/ui';
import { EmptyState } from '@/components/common/EmptyState';
import { useCartStore } from '@/stores/cart';
import { useSessionStore } from '@/stores/session';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { FulfillmentSection } from '@/features/checkout/components/FulfillmentSection';
import { useCartQuote } from './useCartQuote';
import {
  cartKey,
  cartSignature,
  checkoutRules,
  quoteFingerprint,
  uah,
} from './pricing';
import { CartItemCard } from './components/CartItemCard';
import { OrderSummary } from './components/OrderSummary';
import { formatMoney } from '@/utils/format';
import { ShopPageBanner } from '@/components/common/ShopPageBanner';
export function CartScreen() {
  const items = useCartStore((s) => s.items);
  const hydrated = useSessionStore((s) => s.hydrated);
  const quote = useCartQuote();
  const store = quote.data?.store;
  const canOrder =
    !!store &&
    !store.temporarilyClosed &&
    (store.pickupAvailable || store.deliveryAvailable);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  async function checkout() {
    if (checking || !quote.data?.canCheckout) return;
    setChecking(true);
    setMessage('');
    const signature = cartSignature(
      items,
      useSelectedStore.getState().storeId,
      useFulfillmentStore.getState().method,
    );
    try {
      const fresh = await quote.refetch({ throwOnError: true });
      if (
        signature !==
        cartSignature(
          useCartStore.getState().items,
          useSelectedStore.getState().storeId,
          useFulfillmentStore.getState().method,
        )
      )
        return;
      if (!fresh.data?.canCheckout) {
        setMessage('Перевірте товари та спосіб отримання.');
        return;
      }
      if (quoteFingerprint(fresh.data) !== quoteFingerprint(quote.data)) {
        setMessage('Ціни оновилися. Перевірте підсумок і продовжте.');
        return;
      }
      router.push('/checkout');
    } catch {
      setMessage('Не вдалося перевірити кошик. Спробуйте ще раз.');
    } finally {
      setChecking(false);
    }
  }
  return (
    <Screen>
      <Container>
        <ShopPageBanner
          title="Кошик"
          subtitle="Ваші смаки вже майже з вами"
          label="BEERLAND / ПОКУПКИ"
        />
        {!hydrated ? (
          <LoadingIndicator />
        ) : items.length === 0 ? (
          <EmptyState
            variant="cart"
            action={{ onPress: () => router.push('/catalog') }}
          />
        ) : (
          <>
            <FulfillmentSection disabled={checking} />
            {quote.isError ? (
              <ErrorState
                onRetry={() => {
                  void quote.refetch();
                }}
              />
            ) : !quote.data ? (
              <LoadingIndicator />
            ) : (
              <>
                {quote.data.lines.map((line) => (
                  <CartItemCard
                    key={cartKey(line.item)}
                    line={line}
                    canOrder={canOrder}
                  />
                ))}
                {!quote.data.fulfillmentAvailable && (
                  <AppText color="error">
                    Оберіть доступний спосіб отримання та магазин.
                  </AppText>
                )}
                {quote.data.totals.belowMinimum && (
                  <AppText color="error">
                    Мінімальна сума замовлення —{' '}
                    {formatMoney(uah(checkoutRules.minimumOrder))}
                  </AppText>
                )}
                <Card>
                  <OrderSummary
                    totals={quote.data.totals}
                    incomplete={quote.data.lines.some(
                      (line) => !line.priceKnown,
                    )}
                  />
                </Card>
                {quote.data.lines.some((line) => !!line.issue) && (
                  <AppText
                    accessibilityRole="alert"
                    color="error"
                    variant="bodySmall"
                  >
                    Сума включає всі товари, зокрема недоступні. Оформлення
                    стане доступним після виправлення кошика.
                  </AppText>
                )}
                <AppText variant="caption" color="textSubtle">
                  Перед оформленням ще раз перевіримо ціни та наявність.
                </AppText>
                {!!message && (
                  <AppText accessibilityRole="alert" color="error">
                    {message}
                  </AppText>
                )}
                <Button
                  label="Оформити замовлення"
                  variant="accent"
                  testID="cart-checkout"
                  loading={checking}
                  disabled={!quote.data.canCheckout || quote.isFetching}
                  onPress={() => {
                    void checkout();
                  }}
                />
              </>
            )}
          </>
        )}
      </Container>
    </Screen>
  );
}

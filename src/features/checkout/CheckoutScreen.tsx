import { Controller } from 'react-hook-form';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  Container,
  ErrorState,
  LoadingIndicator,
  Screen,
  TextInput,
} from '@/components/ui';
import { EmptyState } from '@/components/common/EmptyState';
import { cartKey } from '@/features/cart/pricing';
import { OrderSummary } from '@/features/cart/components/OrderSummary';
import { useCheckoutStore } from '@/stores/checkout';
import { sessionOwner, useSessionStore } from '@/stores/session';
import { formatMoney } from '@/utils/format';
import { paymentLabels } from './model';
import { useCheckoutFlow } from './useCheckoutFlow';
import { AddressBook } from './components/AddressBook';
import { CheckoutSection } from './components/CheckoutSection';
import { FulfillmentSection } from './components/FulfillmentSection';
import { PaymentMethodSelector } from './components/PaymentMethodSelector';
import { AgeConfirmation } from './components/AgeConfirmation';
import { ContactFields } from './components/ContactFields';
import { ShopPageBanner } from '@/components/common/ShopPageBanner';

export function CheckoutScreen() {
  const hydrated = useSessionStore((s) => s.hydrated);
  const owner = useSessionStore(sessionOwner);
  return (
    <Screen keyboardAware includeBottomInset testID="checkout-screen">
      <Container>
        {hydrated ? <CheckoutContent key={owner} /> : <LoadingIndicator />}
      </Container>
    </Screen>
  );
}
function CheckoutContent() {
  const {
    submitting,
    items,
    method,
    address,
    quote,
    addressError,
    submitError,
    control,
    errors,
    selectedPayment,
    submit,
  } = useCheckoutFlow();
  return (
    <>
      <Button
        label="До кошика"
        variant="ghost"
        disabled={submitting}
        onPress={() => router.replace('/cart')}
      />
      <ShopPageBanner
        title="Оформлення замовлення"
        label="BEERLAND / ПОКУПКИ"
      />
      {items.length === 0 && !submitting ? (
        <EmptyState
          variant="cart"
          action={{ onPress: () => router.replace('/catalog') }}
        />
      ) : (
        <>
          <CheckoutSection title="Отримання">
            <FulfillmentSection disabled={submitting} />
          </CheckoutSection>
          {method === 'delivery' && (
            <CheckoutSection title="Адреса доставки">
              <AddressBook
                disabled={submitting}
                error={address ? undefined : addressError}
              />
            </CheckoutSection>
          )}
          <CheckoutSection title="Контактні дані">
            <ContactFields
              control={control}
              errors={errors}
              disabled={submitting}
            />
          </CheckoutSection>
          <CheckoutSection title="Спосіб оплати">
            <Controller
              control={control}
              name="paymentMethod"
              render={({ field }) => (
                <PaymentMethodSelector
                  value={field.value}
                  disabled={submitting}
                  onChange={(value) => {
                    field.onChange(value);
                    useCheckoutStore.getState().setPayment(value);
                  }}
                />
              )}
            />
          </CheckoutSection>
          <CheckoutSection title="Побажання">
            <Controller
              control={control}
              name="comment"
              render={({ field }) => (
                <TextInput
                  label="Коментар до замовлення"
                  testID="order-comment"
                  value={field.value}
                  onChangeText={(value) => {
                    field.onChange(value);
                    useCheckoutStore.getState().update({ comment: value });
                  }}
                  disabled={submitting}
                  multiline
                  maxLength={500}
                  helperText={`${field.value.length}/500`}
                  errorText={errors.comment?.message}
                />
              )}
            />
          </CheckoutSection>
          <CheckoutSection title="Склад замовлення">
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
                <AppText variant="bodySmall" color="textSubtle">
                  {quote.data.store?.name} ·{' '}
                  {method === 'delivery' ? 'Доставка' : 'Самовивіз'} ·{' '}
                  {paymentLabels[selectedPayment]}
                </AppText>
                {quote.data.lines.map((line) => (
                  <Card key={cartKey(line.item)}>
                    <AppText variant="label">
                      {line.product?.name ?? 'Товар недоступний'}
                    </AppText>
                    <AppText variant="bodySmall">
                      {line.variantLabel} · {line.item.quantity} шт. ·{' '}
                      {line.priceKnown
                        ? formatMoney(line.lineTotal)
                        : 'Не враховано в сумі'}
                    </AppText>
                    {line.issue && (
                      <AppText
                        color="error"
                        variant="bodySmall"
                        accessibilityRole="alert"
                      >
                        {line.issue}
                      </AppText>
                    )}
                  </Card>
                ))}
                {!quote.data.canCheckout && (
                  <AppText accessibilityRole="alert" color="error">
                    Перевірте кошик і доступний спосіб отримання перед
                    оформленням.
                  </AppText>
                )}
                <OrderSummary
                  totals={quote.data.totals}
                  incomplete={quote.data.lines.some((line) => !line.priceKnown)}
                />
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
              </>
            )}
          </CheckoutSection>
          <Controller
            control={control}
            name="ageConfirmed"
            render={({ field }) => (
              <AgeConfirmation
                checked={field.value}
                disabled={submitting}
                onChange={field.onChange}
                error={errors.ageConfirmed?.message}
              />
            )}
          />
          {!!submitError && (
            <Card accessibilityRole="alert">
              <AppText variant="title" color="error">
                Не вдалося оформити замовлення
              </AppText>
              <AppText variant="bodySmall">{submitError}</AppText>
            </Card>
          )}
          <Button
            label="Підтвердити замовлення"
            variant="accent"
            testID="submit-order"
            loading={submitting}
            disabled={!quote.data?.canCheckout || quote.isFetching}
            onPress={() => {
              void submit();
            }}
          />
        </>
      )}
    </>
  );
}

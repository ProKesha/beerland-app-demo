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
import { formatMoney } from '@/utils/format';
import { formatAddress, paymentLabels } from '@/features/checkout/model';
import { useOrder } from './useOrder';
import { ShopPageBanner } from '@/components/common/ShopPageBanner';
export function OrderSuccessScreen({ id }: { id?: string }) {
  const query = useOrder(id);
  const order = query.data;
  return (
    <Screen includeBottomInset>
      <Container>
        {query.isPending ? (
          <LoadingIndicator />
        ) : query.isError ? (
          <ErrorState
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : order ? (
          <>
            <ShopPageBanner
              title="Замовлення прийнято"
              subtitle="Дякуємо за замовлення"
              label="BEERLAND / ЗАМОВЛЕННЯ"
            />
            <AppText variant="priceLarge" testID="order-number">
              № {order.orderNumber}
            </AppText>
            <AppText>
              Це демонстраційне замовлення. Оплату не проведено, товари не
              передано в роботу магазину.
            </AppText>
            <Card>
              <AppText variant="title">
                {order.fulfillmentType === 'pickup' ? 'Самовивіз' : 'Доставка'}
              </AppText>
              <AppText>{order.storeName}</AppText>
              <AppText variant="bodySmall">
                {order.address
                  ? formatAddress(order.address)
                  : order.storeAddress}
              </AppText>
              <AppText variant="bodySmall">
                {paymentLabels[order.paymentMethod]} · Не сплачено
              </AppText>
              <AppText variant="price" testID="success-total">
                {formatMoney(order.total)}
              </AppText>
            </Card>
          </>
        ) : (
          <>
            <AppText variant="h1">Замовлення не знайдено</AppText>
            <AppText>Перевірте посилання на підтвердження.</AppText>
          </>
        )}
        <Button label="На головну" onPress={() => router.replace('/')} />
      </Container>
    </Screen>
  );
}

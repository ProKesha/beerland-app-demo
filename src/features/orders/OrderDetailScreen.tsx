import { router } from 'expo-router';
import { AppText, Button, Card, ErrorState } from '@/components/ui';
import { AccountPage } from '@/features/profile/AccountPage';
import { formatAddress, paymentLabels } from '@/features/checkout/model';
import { OrderSummary } from '@/features/cart/components/OrderSummary';
import { formatMoney } from '@/utils/format';
import { OrderCardSkeleton } from './OrderCard';
import { orderDate, orderStatus, orderSteps } from './status';
import { useReorder } from './useReorder';
import { useOrder } from './useOrder';
const payments = {
  paid: 'Сплачено',
  unpaid: 'Не сплачено',
  failed: 'Оплата не вдалася',
  refunded: 'Повернено',
};
export function OrderDetailScreen({ id }: { id: string }) {
  const repeat = useReorder();
  const query = useOrder(id);
  const order = query.data;
  return (
    <AccountPage title={order ? `№ ${order.orderNumber}` : 'Замовлення'}>
      {query.isPending ? (
        <OrderCardSkeleton />
      ) : query.isError ? (
        <ErrorState
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : !order ? (
        <>
          <AppText variant="h2">Замовлення не знайдено</AppText>
          <Button
            label="До історії замовлень"
            onPress={() => router.replace('/orders')}
          />
        </>
      ) : (
        <>
          <AppText variant="title" color={orderStatus[order.status].color}>
            {orderStatus[order.status].label}
          </AppText>
          <AppText>{orderDate(order.createdAt)}</AppText>
          <Card>
            <AppText variant="title">Стан замовлення</AppText>
            {orderSteps(order).map((step, index, steps) => (
              <AppText
                key={step}
                color={
                  index <= steps.indexOf(order.status)
                    ? 'success'
                    : 'textSubtle'
                }
              >
                {step === order.status ? '● ' : '○ '}
                {orderStatus[step].label}
                {step === order.status ? ' · поточний стан' : ''}
              </AppText>
            ))}
          </Card>
          <Card>
            <AppText variant="title">{order.storeName}</AppText>
            <AppText>
              {order.fulfillmentType === 'pickup' ? 'Самовивіз' : 'Доставка'}
            </AppText>
            <AppText>{order.storeAddress}</AppText>
            {order.fulfillmentType === 'delivery' && order.address && (
              <AppText testID="delivery-address">
                {formatAddress(order.address)}
              </AppText>
            )}
          </Card>
          <AppText variant="h2">Товари</AppText>
          {order.items.map((item, index) => (
            <Card key={`${item.productId}-${item.variantId}-${index}`}>
              <AppText variant="title">{item.name}</AppText>
              <AppText>
                {item.variantLabel} · {item.quantity} од.
              </AppText>
              <AppText>{formatMoney(item.unitPrice)} / од.</AppText>
              <AppText variant="price">{formatMoney(item.lineTotal)}</AppText>
            </Card>
          ))}
          <Card>
            <AppText>
              {paymentLabels[order.paymentMethod]} ·{' '}
              {payments[order.paymentStatus]}
            </AppText>
            <OrderSummary
              totals={{
                loyaltyDiscount: order.loyaltyDiscount,
                belowMinimum: false,
                subtotal: order.subtotal,
                discount: {
                  ...order.discount,
                  amount: order.discount.amount + order.loyaltyDiscount.amount,
                },
                deliveryFee: order.deliveryFee,
                total: order.total,
              }}
            />
          </Card>
          {!!order.comment && (
            <Card>
              <AppText variant="label">Коментар</AppText>
              <AppText>{order.comment}</AppText>
            </Card>
          )}
          <AppText variant="caption" color="textSubtle">
            Демонстраційне замовлення. Повторення перевірить наявність та ціни у
            поточному магазині.
          </AppText>
          <Button
            label="Повторити замовлення"
            loading={repeat.busy}
            onPress={() => repeat.reorder(order)}
          />
        </>
      )}
      {repeat.feedback}
    </AccountPage>
  );
}

import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Button, Card, Skeleton } from '@/components/ui';
import type { Order } from '@/types/domain';
import type { PlacedOrder } from './model';
import { orderDate, orderStatus } from './status';
import { formatMoney } from '@/utils/format';
import { shopPalette, spacing } from '@/theme/tokens';
export function OrderCard({
  order,
  storeName,
}: {
  order: Order;
  storeName?: string;
}) {
  const details = order as Partial<PlacedOrder>;
  return (
    <Card testID={`order-${order.id}`}>
      <View
        style={{
          height: spacing.xs,
          backgroundColor: shopPalette.gold,
          borderRadius: spacing.xs,
        }}
      />
      <AppText variant="title">{details.orderNumber || order.id}</AppText>
      <AppText variant="caption" color="textSubtle">
        {orderDate(order.createdAt)}
      </AppText>
      <AppText variant="label" color={orderStatus[order.status].color}>
        {orderStatus[order.status].label}
      </AppText>
      <AppText>{details.storeName || storeName || 'Магазин Beerland'}</AppText>
      <AppText variant="bodySmall">
        {order.fulfillment === 'pickup' ? 'Самовивіз' : 'Доставка'} ·{' '}
        {order.items.reduce((n, i) => n + i.quantity, 0)} од.
      </AppText>
      <AppText variant="price">{formatMoney(order.total)}</AppText>
      <Button
        label="Детальніше"
        accessibilityLabel={`Детальніше про замовлення ${details.orderNumber || order.id}`}
        variant="outline"
        onPress={() =>
          router.push({ pathname: '/order/[id]', params: { id: order.id } })
        }
      />
    </Card>
  );
}
export function OrderCardSkeleton() {
  return (
    <Card
      accessibilityLabel="Завантаження замовлення"
      accessibilityRole="progressbar"
    >
      <Skeleton width="45%" />
      <Skeleton />
      <Skeleton height={48} />
    </Card>
  );
}

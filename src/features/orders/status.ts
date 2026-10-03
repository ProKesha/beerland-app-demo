import type { Order } from '@/types/domain';
export const orderStatus: Record<
  Order['status'],
  { label: string; color: 'info' | 'warning' | 'success' | 'error' }
> = {
  created: { label: 'Прийнято', color: 'info' },
  pending: { label: 'Прийнято', color: 'info' },
  confirmed: { label: 'Підтверджено', color: 'info' },
  preparing: { label: 'Готуємо', color: 'warning' },
  ready: { label: 'Готове до видачі', color: 'success' },
  outForDelivery: { label: 'В дорозі', color: 'info' },
  delivering: { label: 'В дорозі', color: 'info' },
  completed: { label: 'Виконано', color: 'success' },
  cancelled: { label: 'Скасовано', color: 'error' },
};
export function orderDate(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  }).format(new Date(value));
}
export function orderSteps(order: Order): Order['status'][] {
  if (order.status === 'cancelled' || order.status === 'completed')
    return [order.status];
  return [
    'created',
    'confirmed',
    'preparing',
    order.fulfillment === 'delivery' ? 'outForDelivery' : 'ready',
    'completed',
  ];
}

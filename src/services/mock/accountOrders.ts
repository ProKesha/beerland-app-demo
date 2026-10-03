import { products, stores } from './fixtures';
import {
  productVariants,
  variantLabel,
  variantOffer,
} from '@/features/product/variants';
import { placedOrderSchema, type PlacedOrder } from '@/features/orders/model';
const money = (amount: number) => ({ amount, currency: 'UAH' });
/** Explicit fictional receipts. Separate IDs keep persisted customer receipts authoritative. */
export function demoOrders(): PlacedOrder[] {
  const store = stores[0];
  const items = products.slice(0, 2).map((product) => {
    const variant = productVariants(product)[0];
    const offer = variantOffer(product, variant, store.id);
    return {
      productId: product.id,
      variantId: variant.id,
      storeId: store.id,
      quantity: 1,
      name: product.name,
      variantLabel: variantLabel(variant),
      unitPrice: offer.price,
      lineTotal: offer.price,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal.amount, 0);
  return (['completed', 'preparing', 'cancelled'] as const).map(
    (status, index) =>
      placedOrderSchema.parse({
        id: `demo-history-${index + 1}`,
        idempotencyKey: `demo-history-${index + 1}`,
        orderNumber: `BL-ДЕМО-${index + 1}`,
        storeId: store.id,
        storeName: store.name,
        storeAddress: store.address,
        items,
        subtotal: money(subtotal),
        discount: money(0),
        loyaltyDiscount: money(0),
        deliveryFee: money(index === 1 ? 6000 : 0),
        total: money(subtotal + (index === 1 ? 6000 : 0)),
        fulfillment: index === 1 ? 'delivery' : 'pickup',
        fulfillmentType: index === 1 ? 'delivery' : 'pickup',
        ...(index === 1
          ? {
              address: {
                id: 'demo-receipt-address',
                city: 'Київ',
                street: 'Демонстраційна вулиця',
                building: '1',
                label: 'Приклад адреси',
              },
            }
          : {}),
        customer: {
          name: 'Демонстраційний покупець',
          phone: '+380000000000',
          email: '',
        },
        comment: 'Демонстраційне замовлення',
        ageConfirmed: true,
        status,
        paymentMethod: 'cashOnDelivery',
        paymentStatus: status === 'completed' ? 'paid' : 'unpaid',
        createdAt: `2026-09-${18 - index}T16:42:00.000Z`,
      }),
  );
}

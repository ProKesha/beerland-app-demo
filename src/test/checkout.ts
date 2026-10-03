import type { CheckoutDetails } from '@/features/checkout/model';
import { fetchCartQuote } from '@/features/cart/useCartQuote';
import { orderLines } from '@/features/cart/pricing';
import type { Repositories } from '@/repositories/contracts';
import type { CreateOrderInput } from '@/features/orders/model';
export const checkoutItem = {
  productId: 'product-1',
  storeId: 'store-1',
  quantity: 2,
};
export const checkoutDetails: CheckoutDetails = {
  customer: { name: 'Тестовий покупець', phone: '+380501234567', email: '' },
  paymentMethod: 'card',
  comment: 'Тестовий коментар',
  ageConfirmed: true,
  fulfillmentType: 'pickup',
};
export async function testOrderInput(
  repositories: Repositories,
): Promise<CreateOrderInput> {
  const quote = await fetchCartQuote(
    repositories,
    [checkoutItem],
    'store-1',
    'pickup',
  );
  const { belowMinimum: _belowMinimum, ...totals } = quote.totals;
  return {
    ...checkoutDetails,
    ageConfirmed: true,
    ...totals,
    items: orderLines(quote),
    storeId: 'store-1',
    storeName: quote.store!.name,
    storeAddress: quote.store!.address,
    idempotencyKey: 'test-request',
  };
}

import type { CartItem, Money, Product, Store } from '@/types/domain';
import type { FulfillmentMethod } from '@/stores/fulfillment';
import {
  productVariants,
  variantLabel,
  variantOffer,
} from '@/features/product/variants';
import type { OrderLine } from '@/features/orders/model';

/** All money is integer minor units (kopecks), matching the existing Money model. */
export const checkoutRules = {
  deliveryFee: 6000,
  minimumOrder: 0,
  maxQuantity: 99,
};
export function uah(amount: number): Money {
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new Error('Invalid money amount');
  return { amount, currency: 'UAH' };
}
export function cartKey(item: CartItem) {
  return JSON.stringify([
    item.productId,
    item.variantId ?? 'default',
    item.storeId,
  ]);
}
export function cartSignature(
  items: CartItem[],
  storeId: string | null,
  method: FulfillmentMethod,
) {
  return JSON.stringify({ items, storeId, method });
}
export interface CartLine {
  item: CartItem;
  product: Product | null;
  variantLabel: string;
  servingLabel: string;
  unitPrice: Money;
  lineTotal: Money;
  discount: number;
  maxQuantity: number;
  priceKnown: boolean;
  available: boolean;
  issue?: string;
}
export function resolveCartLine(
  item: CartItem,
  product: Product | null,
  storeId: string | null,
): CartLine {
  const variant =
    product &&
    productVariants(product).find(
      (v) => v.id === (item.variantId ?? 'default'),
    );
  const offer =
    product && variant ? variantOffer(product, variant, item.storeId) : null;
  const price = offer?.price ?? uah(0);
  const maxQuantity = Math.min(
    checkoutRules.maxQuantity,
    offer?.maxQuantity ?? checkoutRules.maxQuantity,
  );
  const quantityValid =
    Number.isSafeInteger(item.quantity) &&
    item.quantity > 0 &&
    item.quantity <= maxQuantity;
  const issue =
    !storeId || item.storeId !== storeId
      ? 'Товар з іншого магазину. Оберіть його магазин або видаліть товар.'
      : !product
        ? 'Товар більше недоступний'
        : !variant
          ? 'Обраного варіанта більше немає'
          : offer?.availability !== 'available'
            ? 'Немає в обраному магазині'
            : !quantityValid
              ? `Доступно не більше ${maxQuantity} шт. Зменште кількість.`
              : price.currency !== 'UAH'
                ? 'Не вдалося визначити ціну товару'
                : undefined;
  const oldAmount =
    offer?.oldPrice?.currency === price.currency
      ? offer.oldPrice.amount
      : price.amount;
  return {
    item,
    product,
    variantLabel: variant ? variantLabel(variant) : 'Варіант недоступний',
    servingLabel: variant
      ? {
          draft: 'Розливне',
          bottle: 'Пляшка',
          can: 'Банка',
          other: 'Пакування',
        }[variant.servingType]
      : '',
    unitPrice: price,
    lineTotal: uah(price.amount * item.quantity),
    discount: Math.max(0, oldAmount - price.amount) * item.quantity,
    maxQuantity,
    priceKnown: !!offer,
    available: !!product && !!variant && offer?.availability === 'available',
    issue,
  };
}
export function calculateTotals(
  lines: CartLine[],
  method: FulfillmentMethod,
  rules = checkoutRules,
) {
  const net = lines.reduce((sum, line) => sum + line.lineTotal.amount, 0);
  const discount = lines.reduce((sum, line) => sum + line.discount, 0);
  const deliveryFee =
    method === 'delivery' && lines.length > 0 ? rules.deliveryFee : 0;
  return {
    subtotal: uah(net + discount),
    discount: uah(discount),
    loyaltyDiscount: uah(0),
    deliveryFee: uah(deliveryFee),
    total: uah(net + deliveryFee),
    belowMinimum: lines.length > 0 && net < rules.minimumOrder,
  };
}
export function createQuote(
  items: CartItem[],
  products: (Product | null)[],
  store: Store | null,
  method: FulfillmentMethod,
) {
  const lines = items.map((item, index) =>
    resolveCartLine(item, products[index], store?.id ?? null),
  );
  const totals = calculateTotals(lines, method);
  const fulfillmentAvailable =
    !!store &&
    !store.temporarilyClosed &&
    (method === 'delivery' ? store.deliveryAvailable : store.pickupAvailable);
  const canCheckout =
    lines.length > 0 &&
    !!store &&
    fulfillmentAvailable &&
    !totals.belowMinimum &&
    lines.every((line) => !line.issue);
  return { lines, totals, store, fulfillmentAvailable, canCheckout };
}
export type CartQuote = ReturnType<typeof createQuote>;
export function quoteFingerprint(quote: CartQuote) {
  return JSON.stringify({
    lines: quote.lines.map((line) => [
      line.item,
      line.unitPrice,
      line.discount,
      line.issue,
    ]),
    totals: quote.totals,
    canCheckout: quote.canCheckout,
  });
}
export function orderLines(quote: CartQuote): OrderLine[] {
  if (!quote.canCheckout) throw new Error('Кошик потребує перевірки');
  return quote.lines.map((line) => ({
    ...line.item,
    variantId: line.item.variantId ?? 'default',
    name: line.product!.name,
    variantLabel: line.variantLabel,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
  }));
}

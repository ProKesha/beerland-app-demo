import { z } from 'zod';
import { moneySchema } from '@/types/domain';
import {
  addressSchema,
  customerSchema,
  paymentMethodSchema,
} from '@/features/checkout/model';

export const orderLineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  storeId: z.string().min(1),
  quantity: z.number().int().positive(),
  name: z.string(),
  variantLabel: z.string(),
  unitPrice: moneySchema,
  lineTotal: moneySchema,
});
export const orderInputSchema = z
  .object({
    idempotencyKey: z.string().min(1),
    storeId: z.string().min(1),
    storeName: z.string(),
    storeAddress: z.string(),
    fulfillmentType: z.enum(['delivery', 'pickup']),
    address: addressSchema.optional(),
    items: z.array(orderLineSchema).min(1),
    subtotal: moneySchema,
    discount: moneySchema,
    loyaltyDiscount: moneySchema,
    deliveryFee: moneySchema,
    total: moneySchema,
    paymentMethod: paymentMethodSchema,
    customer: customerSchema,
    comment: z.string().max(500),
    ageConfirmed: z.literal(true),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillmentType === 'delivery' && !v.address)
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: 'Додайте адресу доставки',
      });
    const net = v.items.reduce((sum, item) => sum + item.lineTotal.amount, 0);
    const amounts = [
      v.subtotal,
      v.discount,
      v.loyaltyDiscount,
      v.deliveryFee,
      v.total,
    ];
    if (
      amounts.some((money) => money.currency !== 'UAH') ||
      v.items.some(
        (item) =>
          item.unitPrice.currency !== 'UAH' ||
          item.lineTotal.currency !== 'UAH' ||
          item.lineTotal.amount !== item.unitPrice.amount * item.quantity,
      ) ||
      v.subtotal.amount - v.discount.amount !== net ||
      v.total.amount !==
        net - v.loyaltyDiscount.amount + v.deliveryFee.amount ||
      (v.fulfillmentType === 'pickup' && v.deliveryFee.amount !== 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['total'],
        message: 'Перевірте підсумок замовлення',
      });
    }
    if (v.items.some((item) => item.storeId !== v.storeId))
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'Товари мають належати одному магазину',
      });
  });
export const placedOrderSchema = orderInputSchema.safeExtend({
  id: z.string(),
  orderNumber: z.string(),
  createdAt: z.iso.datetime(),
  status: z.enum([
    'created',
    'confirmed',
    'preparing',
    'ready',
    'outForDelivery',
    'completed',
    'cancelled',
  ]),
  paymentStatus: z.enum(['unpaid', 'paid', 'failed', 'refunded']),
  // Retained for the existing Home order/reorder contract.
  fulfillment: z.enum(['delivery', 'pickup']),
});
export type OrderLine = z.infer<typeof orderLineSchema>;
export type CreateOrderInput = z.infer<typeof orderInputSchema>;
export type PlacedOrder = z.infer<typeof placedOrderSchema>;

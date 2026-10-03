import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .max(200, 'Не більше 200 символів')
  .optional();
export const addressSchema = z.object({
  id: z.string().min(1),
  label: optionalText,
  city: z
    .string()
    .trim()
    .min(2, 'Вкажіть місто')
    .max(80, 'Не більше 80 символів'),
  street: z
    .string()
    .trim()
    .min(2, 'Вкажіть вулицю')
    .max(120, 'Не більше 120 символів'),
  building: z
    .string()
    .trim()
    .min(1, 'Вкажіть будинок')
    .max(20, 'Не більше 20 символів'),
  apartment: optionalText,
  entrance: optionalText,
  floor: optionalText,
  intercom: optionalText,
  comment: z.string().trim().max(500, 'Не більше 500 символів').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});
export type Address = z.infer<typeof addressSchema>;
export const paymentMethodSchema = z.enum([
  'card',
  'applePay',
  'googlePay',
  'cashOnDelivery',
]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export const paymentLabels: Record<PaymentMethod, string> = {
  card: 'Онлайн карткою',
  applePay: 'Apple Pay',
  googlePay: 'Google Pay',
  cashOnDelivery: 'При отриманні',
};
export function paymentMethods(platform: string): PaymentMethod[] {
  return [
    'card',
    ...(platform === 'ios'
      ? ['applePay' as const]
      : platform === 'android'
        ? ['googlePay' as const]
        : []),
    'cashOnDelivery',
  ];
}
export function normalizePhone(value: string) {
  const digits = value.replace(/[\s()+-]/g, '');
  return digits.startsWith('0') ? `+38${digits}` : `+${digits}`;
}
export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Вкажіть ім’я')
    .max(80, 'Не більше 80 символів'),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(
      z.string().regex(/^\+380\d{9}$/, 'Вкажіть номер у форматі +380XXXXXXXXX'),
    ),
  email: z
    .union([z.literal(''), z.email('Перевірте електронну пошту')])
    .optional(),
});
export const checkoutSchema = z
  .object({
    customer: customerSchema,
    paymentMethod: paymentMethodSchema,
    comment: z.string().trim().max(500, 'Не більше 500 символів'),
    ageConfirmed: z
      .boolean()
      .refine(Boolean, 'Підтвердіть, що вам виповнилося 18 років'),
    fulfillmentType: z.enum(['delivery', 'pickup']),
    address: addressSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.fulfillmentType === 'delivery' && !value.address) {
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: 'Додайте адресу доставки',
      });
    }
  });
export type CheckoutDetails = z.infer<typeof checkoutSchema>;
export function formatAddress(address: Address) {
  return [
    address.city,
    `${address.street}, ${address.building}`,
    address.apartment && `кв. ${address.apartment}`,
  ]
    .filter(Boolean)
    .join(', ');
}

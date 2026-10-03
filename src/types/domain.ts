import type { Address } from '@/features/checkout/model';
import { z } from 'zod';

export const moneySchema = z.object({
  amount: z.number().int().nonnegative(),
  currency: z.string().length(3),
});
export const categorySchema = z.enum([
  'lager',
  'ipa',
  'ale',
  'stout',
  'wheat',
  'cider',
  'snacks',
]);
export const availabilitySchema = z.enum([
  'available',
  'unavailable',
  'unknown',
]);
const levelSchema = z.number().min(0).max(5);
const volumeSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(['ml', 'g']),
});
const servingTypeSchema = z.enum(['draft', 'bottle', 'can', 'other']);
export const productVariantSchema = z.object({
  id: z.string().min(1),
  volume: volumeSchema,
  servingType: servingTypeSchema,
  basePrice: moneySchema,
  oldPrice: moneySchema.optional(),
  availability: availabilitySchema,
  maxQuantity: z.number().int().positive().optional(),
  storeOffers: z
    .array(
      z.object({
        storeId: z.string(),
        availability: availabilitySchema,
        price: moneySchema.optional(),
        oldPrice: moneySchema.optional(),
        maxQuantity: z.number().int().positive().optional(),
      }),
    )
    .optional(),
});
export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  shortDescription: z.string(),
  category: categorySchema,
  servingType: z.enum(['draft', 'bottle', 'can', 'other']).default('other'),
  beerStyle: z.string().optional(),
  brewery: z.string().optional(),
  country: z.string(),
  image: z.string(),
  abv: z.number().min(0).max(100).optional(),
  ibu: z.number().nonnegative().optional(),
  density: z
    .object({ value: z.number().nonnegative(), unit: z.literal('plato') })
    .optional(),
  price: moneySchema,
  volume: z.object({ value: z.number().positive(), unit: z.enum(['ml', 'g']) }),
  availability: availabilitySchema,
  storeIds: z.array(z.string()),
  storeOffers: z
    .array(
      z.object({
        storeId: z.string(),
        availability: availabilitySchema,
        price: moneySchema.optional(),
      }),
    )
    .optional(),
  releasedAt: z.iso.datetime().optional(),
  tags: z.array(z.string()),
  isNew: z.boolean(),
  isPopular: z.boolean(),
  isOwnBrewery: z.boolean(),
  flavorProfile: z.array(z.string()),
  bitternessLevel: levelSchema.optional(),
  sweetnessLevel: levelSchema.optional(),
  acidityLevel: levelSchema.optional(),
  fullnessLevel: levelSchema.optional(),
  variants: z.array(productVariantSchema).min(1).optional(),
  recommendedProductIds: z.array(z.string()).optional(),
});
export const storeSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  address: z.string(),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  openingHours: z.array(
    z.object({
      day: z.number().int().min(1).max(7),
      opens: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      closes: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    }),
  ),
  phone: z.string().nullable(),
  /** Legacy adapter field; UI derives status from the schedule. */
  isOpen: z.boolean().optional(),
  timezone: z.string().optional(),
  temporarilyClosed: z.boolean().optional(),
  slug: z.string().optional(),
  image: z.string().optional(),
  features: z.array(z.string()).optional(),
  description: z.string().optional(),
  storeCode: z.string().optional(),
  deliveryAvailable: z.boolean(),
  pickupAvailable: z.boolean(),
});
export type Money = z.infer<typeof moneySchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;
export type Store = z.infer<typeof storeSchema>;
export type { Address } from '@/features/checkout/model';
export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  addresses: Address[];
}
export interface CartItem {
  productId: string;
  /** Missing ID is the canonical default variant, including persisted Phase 1–4 lines. */
  variantId?: string;
  storeId: string;
  quantity: number;
}
export interface Order {
  id: string;
  storeId: string;
  items: CartItem[];
  total: Money;
  status:
    | 'created'
    | 'outForDelivery'
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'delivering'
    | 'completed'
    | 'cancelled';
  fulfillment: 'pickup' | 'delivery';
  address?: Address;
  createdAt: string;
}
export const promotionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  image: z.string().optional(),
  productIds: z.array(z.string()),
  storeIds: z.array(z.string()),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime().optional(),
});
export type Promotion = z.infer<typeof promotionSchema>;
export interface LoyaltyActivity {
  id: string;
  points: number;
  description: string;
  createdAt: string;
}
export interface LoyaltyAccount {
  id: string;
  userId: string;
  membershipNumber: string;
  pointsBalance: number;
  tier: string;
  pointsToNextTier: number;
  totalEarned: number;
  totalSpent: number;
  qrPayload: string;
  updatedAt: string;
  activity: LoyaltyActivity[];
}

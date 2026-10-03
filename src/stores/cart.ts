import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import type { CartItem } from '@/types/domain';
import { persistence } from './persistence';
const itemSchema = z.object({
  productId: z.string().min(1),
  storeId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.number().int().positive(),
});
export const cartPersistenceSchema = z.object({ items: z.array(itemSchema) });
interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  setQuantity: (
    productId: string,
    storeId: string,
    quantity: number,
    variantId?: string,
  ) => void;
  removeItem: (productId: string, storeId: string, variantId?: string) => void;
  replaceVariant: (
    productId: string,
    storeId: string,
    nextVariantId: string,
    previousVariantId?: string,
  ) => void;
  clear: () => void;
}
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => {
        if (!itemSchema.safeParse(item).success) return;
        set((state) => {
          const exists = state.items.some(
            (entry) =>
              entry.productId === item.productId &&
              (entry.variantId ?? 'default') ===
                (item.variantId ?? 'default') &&
              entry.storeId === item.storeId,
          );
          return {
            items: exists
              ? state.items.map((entry) =>
                  entry.productId === item.productId &&
                  (entry.variantId ?? 'default') ===
                    (item.variantId ?? 'default') &&
                  entry.storeId === item.storeId
                    ? { ...entry, quantity: entry.quantity + item.quantity }
                    : entry,
                )
              : [...state.items, item],
          };
        });
      },
      setQuantity: (productId, storeId, quantity, variantId) => {
        if (!Number.isSafeInteger(quantity) || quantity < 0) return;
        set((state) => ({
          items: state.items.flatMap((item) =>
            item.productId === productId &&
            item.storeId === storeId &&
            (item.variantId ?? 'default') === (variantId ?? 'default')
              ? quantity === 0
                ? []
                : [{ ...item, quantity }]
              : [item],
          ),
        }));
      },
      removeItem: (productId, storeId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (item) =>
              item.productId !== productId ||
              item.storeId !== storeId ||
              (item.variantId ?? 'default') !== (variantId ?? 'default'),
          ),
        })),
      replaceVariant: (productId, storeId, nextVariantId, previousVariantId) =>
        set((state) => {
          const source = state.items.find(
            (item) =>
              item.productId === productId &&
              item.storeId === storeId &&
              (item.variantId ?? 'default') ===
                (previousVariantId ?? 'default'),
          );
          if (!source || (source.variantId ?? 'default') === nextVariantId)
            return state;
          const other = state.items.find(
            (item) =>
              item.productId === productId &&
              item.storeId === storeId &&
              (item.variantId ?? 'default') === nextVariantId,
          );
          return {
            items: [
              ...state.items.filter(
                (item) => item !== source && item !== other,
              ),
              {
                ...source,
                variantId: nextVariantId,
                quantity: source.quantity + (other?.quantity ?? 0),
              },
            ],
          };
        }),
      clear: () => set({ items: [] }),
    }),
    persistence('cart', cartPersistenceSchema, (state: CartState) => ({
      items: state.items,
    })),
  ),
);

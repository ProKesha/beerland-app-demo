import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import { persistence } from './persistence';
import {
  addressSchema,
  paymentMethodSchema,
  type Address,
  type PaymentMethod,
} from '@/features/checkout/model';

export const checkoutDraftSchema = z.object({
  customer: z.object({
    name: z.string().max(80),
    phone: z.string().max(30),
    email: z.string().max(160),
  }),
  comment: z.string().max(500),
  paymentMethod: paymentMethodSchema,
  attempt: z
    .object({ signature: z.string(), key: z.string() })
    .nullable()
    .default(null),
});
export type CheckoutDraft = z.infer<typeof checkoutDraftSchema>;
const emptyDraft: CheckoutDraft = {
  customer: { name: '', phone: '', email: '' },
  comment: '',
  paymentMethod: 'card',
  attempt: null,
};
interface CheckoutState extends CheckoutDraft {
  submitting: boolean;
  update: (draft: Partial<CheckoutDraft>) => void;
  setPayment: (paymentMethod: PaymentMethod) => void;
  reset: () => void;
}
export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      ...emptyDraft,
      submitting: false,
      update: (draft) => set(draft),
      setPayment: (paymentMethod) => set({ paymentMethod }),
      reset: () => set({ ...emptyDraft, submitting: false }),
    }),
    persistence(
      'checkout-draft',
      checkoutDraftSchema,
      ({ customer, comment, paymentMethod, attempt }) => ({
        customer,
        comment,
        paymentMethod,
        attempt,
      }),
    ),
  ),
);

export const savedAddressesSchema = z.object({
  // Older saved books, including deliberately empty ones, must never be reseeded.
  seeded: z.boolean().default(true),
  addresses: z.array(addressSchema),
  selectedId: z.string().nullable(),
});
interface AddressState {
  seeded: boolean;
  seed: (addresses: Address[]) => void;
  addresses: Address[];
  selectedId: string | null;
  save: (address: Address) => void;
  select: (id: string) => void;
  makeDefault: (id: string) => void;
  remove: (id: string) => void;
}
/** Local address book adapter; persistence is isolated from UI and can be replaced at this boundary. */
export const useAddressStore = create<AddressState>()(
  persist(
    (set) => ({
      addresses: [],
      selectedId: null,
      seeded: false,
      seed: (incoming) =>
        set((state) => {
          if (state.seeded) return {};
          if (state.addresses.length) return { seeded: true };
          const addresses = incoming.map((address) =>
            addressSchema.parse(address),
          );
          return {
            seeded: true,
            addresses: addresses.map((address, index) => ({
              ...address,
              isDefault: index === 0,
            })),
            selectedId: null,
          };
        }),
      save: (address) => {
        const parsed = addressSchema.safeParse(address);
        if (!parsed.success) return;
        set((state) => {
          const next = {
            ...parsed.data,
            isDefault: parsed.data.isDefault || state.addresses.length === 0,
          };
          const addresses = [
            ...state.addresses
              .filter((a) => a.id !== next.id)
              .map((a) => (next.isDefault ? { ...a, isDefault: false } : a)),
            next,
          ];
          return { addresses, selectedId: next.id, seeded: true };
        });
      },
      select: (id) =>
        set((state) =>
          state.addresses.some((a) => a.id === id) ? { selectedId: id } : {},
        ),
      makeDefault: (id) =>
        set((state) =>
          state.addresses.some((a) => a.id === id)
            ? {
                addresses: state.addresses.map((a) => ({
                  ...a,
                  isDefault: a.id === id,
                })),
              }
            : {},
        ),
      remove: (id) =>
        set((state) => {
          let addresses = state.addresses.filter((a) => a.id !== id);
          if (addresses.length && !addresses.some((a) => a.isDefault))
            addresses = addresses.map((a, index) => ({
              ...a,
              isDefault: index === 0,
            }));
          return {
            addresses,
            seeded: true,
            selectedId:
              state.selectedId === id
                ? (addresses.find((a) => a.isDefault)?.id ?? null)
                : state.selectedId,
          };
        }),
    }),
    persistence(
      'addresses',
      savedAddressesSchema,
      ({ addresses, selectedId }) => ({ addresses, selectedId }),
    ),
  ),
);

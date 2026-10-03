import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import { persistence } from './persistence';
export type FulfillmentMethod = 'delivery' | 'pickup';
interface FulfillmentState {
  method: FulfillmentMethod;
  select: (method: FulfillmentMethod) => void;
}
export const useFulfillmentStore = create<FulfillmentState>()(
  persist(
    (set) => ({ method: 'pickup', select: (method) => set({ method }) }),
    persistence(
      'fulfillment',
      z.object({ method: z.enum(['delivery', 'pickup']) }),
      (state: FulfillmentState) => ({ method: state.method }),
    ),
  ),
);

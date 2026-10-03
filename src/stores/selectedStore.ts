import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import { persistence } from './persistence';
interface SelectedStoreState {
  storeId: string | null;
  select: (id: string | null) => void;
}
export const useSelectedStore = create<SelectedStoreState>()(
  persist(
    (set) => ({
      storeId: null,
      select: (storeId) => set({ storeId }),
    }),
    persistence(
      'selected-store',
      z.object({ storeId: z.string().min(1).nullable() }),
      (state: SelectedStoreState) => ({ storeId: state.storeId }),
    ),
  ),
);

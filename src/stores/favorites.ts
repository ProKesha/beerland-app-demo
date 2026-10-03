import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import { persistence } from './persistence';
interface FavoritesState {
  productIds: string[];
  toggle: (id: string) => void;
  clear: () => void;
  isFavorited: (id: string) => boolean;
}
export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      productIds: [],
      isFavorited: (id) => get().productIds.includes(id),
      toggle: (id) => {
        if (id.trim())
          set((state) => ({
            productIds: state.productIds.includes(id)
              ? state.productIds.filter((value) => value !== id)
              : [...state.productIds, id],
          }));
      },
      clear: () => set({ productIds: [] }),
    }),
    persistence(
      'favorites',
      z.object({ productIds: z.array(z.string().min(1)) }),
      (state: FavoritesState) => ({ productIds: state.productIds }),
    ),
  ),
);

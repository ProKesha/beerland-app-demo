import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import { persistence } from './persistence';
interface State {
  view: 'list' | 'map';
  setView: (view: State['view']) => void;
}
export const useStoreDiscovery = create<State>()(
  persist(
    (set) => ({ view: 'list', setView: (view) => set({ view }) }),
    persistence(
      'store-discovery',
      z.object({ view: z.enum(['list', 'map']) }),
      (state: State) => ({ view: state.view }),
    ),
  ),
);

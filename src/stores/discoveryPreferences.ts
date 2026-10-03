import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import { persistence } from './persistence';
interface Preferences {
  recent: string[];
  viewMode: 'grid' | 'list';
  remember: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
  setViewMode: (mode: 'grid' | 'list') => void;
}
export const useDiscoveryPreferences = create<Preferences>()(
  persist(
    (set) => ({
      recent: [],
      viewMode: 'grid',
      remember: (query) => {
        const value = query.trim().replace(/\s+/g, ' ').slice(0, 100);
        if (!value) return;
        set((state) => ({
          recent: [
            value,
            ...state.recent.filter(
              (q) =>
                q.toLocaleLowerCase('uk-UA') !==
                value.toLocaleLowerCase('uk-UA'),
            ),
          ].slice(0, 6),
        }));
      },
      remove: (query) =>
        set((state) => ({ recent: state.recent.filter((q) => q !== query) })),
      clear: () => set({ recent: [] }),
      setViewMode: (viewMode) => set({ viewMode }),
    }),
    persistence(
      'discovery',
      z.object({
        recent: z.array(z.string().min(1).max(100)).max(6),
        viewMode: z.enum(['grid', 'list']),
      }),
      (state: Preferences) => ({
        recent: state.recent,
        viewMode: state.viewMode,
      }),
    ),
  ),
);

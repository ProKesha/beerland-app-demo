import { create } from 'zustand';
import type { AuthUser } from '@/features/auth/types';
interface SessionState {
  status:
    'visitor' | 'guest' | 'authenticating' | 'authenticated' | 'authError';
  user: AuthUser | null;
  error: string | null;
  hydrated: boolean;
  hydrationError: boolean;
  hydrationRetry: number;
  setHydrated: (value: boolean) => void;
  setHydrationError: (value: boolean) => void;
  retryHydration: () => void;
  setStatus: (status: SessionState['status']) => void;
  setAuthenticated: (user: AuthUser) => void;
  setAuthError: (error: string) => void;
  clearAuth: () => void;
}
export function sessionOwner(
  state: Pick<SessionState, 'status' | 'user'>,
): string {
  return state.status === 'authenticated'
    ? (state.user?.id ?? 'guest')
    : 'guest';
}
// No authentication tokens or personal data are persisted.
export const useSessionStore = create<SessionState>((set) => ({
  status: 'visitor',
  user: null,
  error: null,
  hydrated: false,
  hydrationError: false,
  hydrationRetry: 0,
  setHydrated: (hydrated) => set({ hydrated }),
  setHydrationError: (hydrationError) => set({ hydrationError }),
  retryHydration: () =>
    set((state) => ({
      hydrationRetry: state.hydrationRetry + 1,
      hydrationError: false,
    })),
  setStatus: (status) => set({ status }),
  setAuthenticated: (user) =>
    set({ user, status: 'authenticated', error: null }),
  setAuthError: (error) => set({ status: 'authError', error, user: null }),
  clearAuth: () => set({ user: null, error: null, status: 'guest' }),
}));

import { create } from 'zustand';
import type { AuthChallenge, AuthUser } from './types';

const allowedDestinations = new Set([
  '/profile',
  '/orders',
  '/addresses',
  '/loyalty',
  '/favorites',
  '/checkout',
]);
export function safeReturnTo(value: unknown): string {
  return typeof value === 'string' && allowedDestinations.has(value)
    ? value
    : '/profile';
}
interface AuthFlowState {
  challenge: AuthChallenge | null;
  pendingUser: AuthUser | null;
  returnTo: string;
  busy: boolean;
  error: string | null;
  setChallenge: (challenge: AuthChallenge | null) => void;
  setPendingUser: (user: AuthUser | null) => void;
  setReturnTo: (path: string) => void;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}
export const useAuthFlow = create<AuthFlowState>((set) => ({
  challenge: null,
  pendingUser: null,
  returnTo: '/profile',
  busy: false,
  error: null,
  setChallenge: (challenge) => set({ challenge, error: null }),
  setPendingUser: (pendingUser) => set({ pendingUser }),
  setReturnTo: (path) => set({ returnTo: safeReturnTo(path) }),
  setBusy: (busy) => set({ busy }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      challenge: null,
      pendingUser: null,
      returnTo: '/profile',
      busy: false,
      error: null,
    }),
}));

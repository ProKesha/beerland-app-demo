import { AuthError } from '@/features/auth/model';
import type { Repositories } from './contracts';

/** Fail closed until real adapters exist. Never substitute demo business data. */
export function createUnavailableRepositories(): Repositories {
  const unavailable = async (): Promise<never> => {
    throw new Error('Service unavailable');
  };
  const authUnavailable = async (): Promise<never> => {
    throw new AuthError('unavailable');
  };
  return {
    auth: {
      requestOtp: authUnavailable,
      verifyOtp: authUnavailable,
      getPendingChallenge: async () => null,
      restoreSession: async () => null,
      updateProfile: authUnavailable,
      signOut: async () => undefined,
      cancelChallenge: async () => undefined,
    },
    products: {
      list: unavailable,
      getById: unavailable,
      recommendations: unavailable,
      searchProducts: unavailable,
      catalogMetadata: unavailable,
    },
    stores: { list: unavailable, getById: unavailable },
    orders: { list: unavailable, getById: unavailable, create: unavailable },
    users: { getCurrent: unavailable, updateCurrent: unavailable },
    loyalty: { getCurrent: unavailable },
    promotions: { list: unavailable },
  };
}

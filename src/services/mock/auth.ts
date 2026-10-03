import { z } from 'zod';
import type { AuthRepository } from '@/repositories/contracts';
import type { AuthChallenge, AuthUser } from '@/features/auth/types';
import {
  AuthError,
  otpSchema,
  phoneSchema,
  profileSchema,
} from '@/features/auth/model';
import { createDemoSessionPersistence } from '@/features/auth/sessionStorage';
import type { OrderStorage } from './orders';

const CHALLENGE_KEY = 'beerland:demo-auth-challenge:v1';
const ACCOUNT_PREFIX = 'beerland:demo-auth-account:v1:';
const challengeSchema = z.object({
  id: z.string(),
  phone: z.string(),
  expiresAt: z.number(),
  resendAvailableAt: z.number(),
  remainingAttempts: z.number().int().min(0),
  resendCount: z.number().int().min(0),
});
const accountSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
});
type Storage = OrderStorage & { removeItem?(key: string): Promise<unknown> };

export function createMockAuthRepository({
  enabled = false,
  storage,
  now = Date.now,
  resendMs = 60_000,
  ttlMs = 5 * 60_000,
  sessionMs = 30 * 24 * 60 * 60_000,
  code = __DEV__ ? '123456' : '',
}: {
  enabled?: boolean;
  storage?: Storage;
  now?: () => number;
  resendMs?: number;
  ttlMs?: number;
  sessionMs?: number;
  code?: string;
} = {}): AuthRepository {
  // Optimized demos must neither authenticate nor bundle the internal OTP value.
  enabled = __DEV__ && enabled;
  let challenge: AuthChallenge | null = null;
  let sessionPhone: string | null = null;
  let sequence = 0;
  let failNextRequest = false;
  const sessions = createDemoSessionPersistence(storage);
  const requireEnabled = () => {
    if (!enabled) throw new AuthError('unavailable');
  };
  const accountKey = (phone: string) => `${ACCOUNT_PREFIX}${phone}`;
  async function clear(key: string) {
    if (storage?.removeItem) await storage.removeItem(key);
    else await storage?.setItem(key, '');
  }
  async function readChallenge() {
    if (challenge) return challenge;
    const raw = await storage?.getItem(CHALLENGE_KEY);
    if (!raw) return null;
    try {
      challenge = challengeSchema.parse(JSON.parse(raw));
      return challenge;
    } catch {
      await clear(CHALLENGE_KEY);
      return null;
    }
  }
  async function userFor(phone: string): Promise<AuthUser> {
    const raw = await storage?.getItem(accountKey(phone));
    let profile: z.infer<typeof accountSchema> = { name: '' };
    if (raw) {
      try {
        profile = accountSchema.parse(JSON.parse(raw));
      } catch {
        // A malformed profile is treated as incomplete.
      }
    }
    return {
      id: `demo-${phone.slice(1)}`,
      phone,
      name: profile.name,
      email: profile.email,
      needsProfile: !profile.name,
      demo: true,
    };
  }
  const repository: AuthRepository = {
    getPendingChallenge: async () => {
      if (!enabled) return null;
      const current = await readChallenge();
      return current ? { ...current } : null;
    },
    requestOtp: async (input) => {
      requireEnabled();
      if (failNextRequest) {
        failNextRequest = false;
        throw new AuthError('service');
      }
      const phone = phoneSchema.safeParse(input);
      if (!phone.success) throw new AuthError('invalidPhone');
      const previous = await readChallenge();
      if (previous?.phone === phone.data && now() < previous.resendAvailableAt)
        throw new AuthError('resendWait');
      if (previous?.phone === phone.data && previous.resendCount >= 3)
        throw new AuthError('resendLimit');
      const next: AuthChallenge = {
        id: `demo-challenge-${now()}-${++sequence}`,
        phone: phone.data,
        expiresAt: now() + ttlMs,
        resendAvailableAt: now() + resendMs,
        remainingAttempts: 5,
        resendCount:
          previous?.phone === phone.data ? previous.resendCount + 1 : 0,
      };
      await storage?.setItem(CHALLENGE_KEY, JSON.stringify(next));
      challenge = next;
      return { ...next };
    },
    verifyOtp: async (id, input) => {
      requireEnabled();
      const current = await readChallenge();
      if (!current || current.id !== id)
        throw new AuthError('invalidChallenge');
      if (now() >= current.expiresAt) throw new AuthError('expired');
      if (current.remainingAttempts === 0) throw new AuthError('attempts');
      if (!otpSchema.safeParse(input).success || input !== code) {
        const next = {
          ...current,
          remainingAttempts: current.remainingAttempts - 1,
        };
        await storage?.setItem(CHALLENGE_KEY, JSON.stringify(next));
        challenge = next;
        throw new AuthError(
          next.remainingAttempts ? 'invalidCode' : 'attempts',
        );
      }
      const nextSession = {
        phone: current.phone,
        expiresAt: now() + sessionMs,
      };
      await sessions.write(nextSession);
      await clear(CHALLENGE_KEY);
      challenge = null;
      sessionPhone = current.phone;
      return userFor(current.phone);
    },
    restoreSession: async () => {
      if (!enabled) return null;
      const saved = await sessions.read();
      if (!saved) return null;
      try {
        if (now() >= saved.expiresAt) throw new AuthError('expired');
        const phone = phoneSchema.parse(saved.phone);
        sessionPhone = phone;
        return await userFor(phone);
      } catch {
        await sessions.clear();
        sessionPhone = null;
        return null;
      }
    },
    updateProfile: async (fields) => {
      requireEnabled();
      const saved = await sessions.read();
      if (
        !sessionPhone ||
        !saved ||
        now() >= saved.expiresAt ||
        saved.phone !== sessionPhone
      )
        throw new AuthError('expired');
      const profile = profileSchema.parse({
        name: fields.name,
        email: fields.email ?? '',
      });
      await storage?.setItem(accountKey(sessionPhone), JSON.stringify(profile));
      return userFor(sessionPhone);
    },
    signOut: async () => {
      await sessions.clear();
      sessionPhone = null;
    },
    cancelChallenge: async (id) => {
      const current = await readChallenge();
      if (current?.id === id) {
        await clear(CHALLENGE_KEY);
        challenge = null;
      }
    },
    development: enabled
      ? {
          failNextRequest: () => {
            failNextRequest = true;
          },
          expireChallenge: async () => {
            const current = await readChallenge();
            if (!current) return;
            challenge = { ...current, expiresAt: now() - 1 };
            await storage?.setItem(CHALLENGE_KEY, JSON.stringify(challenge));
          },
          allowResend: async () => {
            const current = await readChallenge();
            if (!current) return;
            challenge = { ...current, resendAvailableAt: now() - 1 };
            await storage?.setItem(CHALLENGE_KEY, JSON.stringify(challenge));
          },
          expireSession: async () => {
            const current = await sessions.read();
            if (current)
              await sessions.write({ ...current, expiresAt: now() - 1 });
          },
        }
      : undefined,
  };
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task);
    queue = next.catch(() => undefined);
    return next;
  };
  // Repository callers also get one-time consumption and deterministic rate limits.
  // UI locks alone cannot protect concurrent requests or cancellation races.
  return {
    ...repository,
    requestOtp: (phone) => serialize(() => repository.requestOtp(phone)),
    verifyOtp: (id, value) => serialize(() => repository.verifyOtp(id, value)),
    getPendingChallenge: () =>
      serialize(() => repository.getPendingChallenge()),
    restoreSession: () => serialize(() => repository.restoreSession()),
    updateProfile: (fields) =>
      serialize(() => repository.updateProfile(fields)),
    signOut: () => serialize(() => repository.signOut()),
    cancelChallenge: (id) => serialize(() => repository.cancelChallenge(id)),
    development: repository.development && {
      failNextRequest: repository.development.failNextRequest,
      expireChallenge: () =>
        serialize(() => repository.development!.expireChallenge()),
      allowResend: () => serialize(() => repository.development!.allowResend()),
      expireSession: () =>
        serialize(() => repository.development!.expireSession()),
    },
  };
}

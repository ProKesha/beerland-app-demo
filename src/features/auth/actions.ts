import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import type { Repositories } from '@/repositories/contracts';
import type { AuthUser } from './types';
import { authMessage, phoneSchema } from './model';
import { useAuthFlow } from './flow';
import { useSessionStore } from '@/stores/session';
import { activateDemoWorkspace, leaveDemoWorkspace } from './workspace';
import { claimGuestOrders } from '@/repositories/sessionAware';

let active = false;
async function run(task: () => Promise<boolean>): Promise<boolean> {
  if (active) return false;
  active = true;
  useAuthFlow.getState().setBusy(true);
  useAuthFlow.getState().setError(null);
  try {
    return await task();
  } catch (error) {
    useAuthFlow.getState().setError(authMessage(error));
    return false;
  } finally {
    active = false;
    useAuthFlow.getState().setBusy(false);
  }
}
export function requestAuthCode(repositories: Repositories, input: string) {
  return run(async () => {
    const parsed = phoneSchema.safeParse(input);
    if (!parsed.success) {
      useAuthFlow.getState().setError(parsed.error.issues[0].message);
      return false;
    }
    const challenge = await repositories.auth.requestOtp(parsed.data);
    useAuthFlow.getState().setChallenge(challenge);
    return true;
  });
}
export function resendAuthCode(repositories: Repositories) {
  return run(async () => {
    const current = useAuthFlow.getState().challenge;
    if (!current || Date.now() < current.resendAvailableAt) return false;
    const challenge = await repositories.auth.requestOtp(current.phone);
    useAuthFlow.getState().setChallenge(challenge);
    return true;
  });
}
export async function cancelAuthCode(repositories: Repositories) {
  const current = useAuthFlow.getState().challenge;
  if (current) await repositories.auth.cancelChallenge(current.id);
  useAuthFlow.getState().setChallenge(null);
}
async function finishSignIn(
  repositories: Repositories,
  client: QueryClient,
  user: AuthUser,
  choice?: 'separate' | 'transfer',
) {
  try {
    const result = await activateDemoWorkspace(user.id, repositories, choice);
    if (result === 'conflict') {
      useAuthFlow.getState().setPendingUser(user);
      return 'conflict';
    }
    await claimGuestOrders(repositories, user.id, AsyncStorage);
  } catch (error) {
    // OTP may already be consumed and account stores may already be published.
    // Block both layouts until startup recovery can finish the durable handoff.
    client.clear();
    useSessionStore.getState().setHydrated(false);
    useSessionStore.getState().setHydrationError(true);
    throw error;
  }
  client.clear();
  useSessionStore.getState().setAuthenticated(user);
  useAuthFlow.getState().setPendingUser(null);
  useAuthFlow.getState().setChallenge(null);
  return user.needsProfile ? 'profile' : 'done';
}
export function verifyAuthCode(
  repositories: Repositories,
  client: QueryClient,
  code: string,
) {
  return run(async () => {
    const challenge = useAuthFlow.getState().challenge;
    if (!challenge) {
      useAuthFlow
        .getState()
        .setError('Запит коду більше не активний. Почніть ще раз.');
      return false;
    }
    const user = await repositories.auth.verifyOtp(challenge.id, code);
    const result = await finishSignIn(repositories, client, user);
    return result !== 'conflict';
  });
}
export function resolveCartConflict(
  repositories: Repositories,
  client: QueryClient,
  choice: 'separate' | 'transfer',
) {
  return run(async () => {
    const user = useAuthFlow.getState().pendingUser;
    if (!user) return false;
    await finishSignIn(repositories, client, user, choice);
    return true;
  });
}
export function cancelPendingSignIn(
  repositories: Repositories,
  client: QueryClient,
) {
  return run(async () => {
    if (!useAuthFlow.getState().pendingUser) return false;
    await repositories.auth.signOut();
    client.clear();
    useSessionStore.getState().clearAuth();
    useAuthFlow.getState().reset();
    return true;
  });
}
export function completeAuthProfile(
  repositories: Repositories,
  client: QueryClient,
  fields: { name: string; email?: string },
) {
  return run(async () => {
    const user = await repositories.auth.updateProfile(fields);
    client.clear();
    useSessionStore.getState().setAuthenticated(user);
    return true;
  });
}
export function signOutOfDemo(repositories: Repositories, client: QueryClient) {
  return run(async () => {
    const user = useSessionStore.getState().user;
    if (!user) return false;
    await repositories.auth.signOut();
    try {
      await leaveDemoWorkspace(user.id);
    } catch (error) {
      // The account workspace may still be visible. Block navigation until
      // startup recovery can safely restore the guest snapshot.
      useSessionStore.getState().setHydrated(false);
      useSessionStore.getState().setHydrationError(true);
      throw error;
    }
    client.clear();
    useSessionStore.getState().clearAuth();
    useAuthFlow.getState().reset();
    return true;
  });
}

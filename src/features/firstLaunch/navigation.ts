import type { Href } from 'expo-router';
import type { FirstLaunchRecord } from '@/stores/firstLaunch';

export function safeProductId(value: unknown): string | null {
  const id = Array.isArray(value) ? value[0] : value;
  return typeof id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(id) ? id : null;
}
export function productIntentFromPath(path: string) {
  const match = /^\/product\/([^/?#]+)$/.exec(path);
  return match ? safeProductId(match[1]) : null;
}
export function firstLaunchDestination(
  state: Pick<
    FirstLaunchRecord,
    'ageStatus' | 'onboardingCompleted' | 'guestEntered'
  >,
  productId?: string | null,
): Href {
  const params = productId ? { product: productId } : {};
  if (state.ageStatus === 'unknown')
    return { pathname: '/age-verification', params };
  if (state.ageStatus === 'underage')
    return { pathname: '/restricted', params };
  if (!state.onboardingCompleted) return { pathname: '/onboarding', params };
  if (!state.guestEntered) return { pathname: '/guest-entry', params };
  return productId
    ? { pathname: '/product/[id]', params: { id: productId } }
    : '/';
}

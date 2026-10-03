import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/RepositoryProvider';
import { queryKeys } from '@/constants/queryKeys';
import { sessionOwner, useSessionStore } from '@/stores/session';
export const accountKeys = {
  user: ['account', 'user'] as const,
  loyalty: ['account', 'loyalty'] as const,
  userFor: (owner: string) => ['account', 'user', owner] as const,
  loyaltyFor: (owner: string) => ['account', 'loyalty', owner] as const,
};
export async function readForOwner<T>(
  owner: string,
  empty: T,
  read: () => Promise<T>,
): Promise<T> {
  if (sessionOwner(useSessionStore.getState()) !== owner) return empty;
  const data = await read();
  return sessionOwner(useSessionStore.getState()) === owner ? data : empty;
}
export function useUser() {
  const r = useRepositories();
  const owner = useSessionStore(sessionOwner);
  return useQuery({
    queryKey: accountKeys.userFor(owner),
    queryFn: ({ signal }) =>
      readForOwner(owner, null, () => r.users.getCurrent({ signal })),
  });
}
export function useLoyalty() {
  const r = useRepositories();
  const owner = useSessionStore(sessionOwner);
  return useQuery({
    queryKey: accountKeys.loyaltyFor(owner),
    queryFn: ({ signal }) =>
      readForOwner(owner, null, () => r.loyalty.getCurrent({ signal })),
  });
}
export function useOrders(options: { enabled?: boolean } = {}) {
  const r = useRepositories();
  const owner = useSessionStore(sessionOwner);
  return useQuery({
    queryKey: [...queryKeys.orders.list(), owner],
    enabled: options.enabled,
    queryFn: async ({ signal }) =>
      (await readForOwner(owner, [], () => r.orders.list({ signal }))).sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      ),
  });
}

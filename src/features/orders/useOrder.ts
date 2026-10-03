import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/RepositoryProvider';
import { sessionOwner, useSessionStore } from '@/stores/session';
import { readForOwner } from '@/features/profile/queries';

export const orderDetailKey = (id: string | undefined, owner: string) =>
  ['orders', 'detail', id, owner] as const;

export function useOrder(id?: string) {
  const { orders } = useRepositories();
  const owner = useSessionStore(sessionOwner);
  return useQuery({
    queryKey: orderDetailKey(id, owner),
    queryFn: ({ signal }) =>
      id
        ? readForOwner(owner, null, () => orders.getById(id, { signal }))
        : Promise.resolve(null),
  });
}

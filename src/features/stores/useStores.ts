import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { useRepositories } from '@/repositories/RepositoryProvider';
export function useStores({ enabled = true }: { enabled?: boolean } = {}) {
  const repositories = useRepositories();
  return useQuery({
    enabled,
    queryKey: queryKeys.stores.list(),
    queryFn: ({ signal }) => repositories.stores.list({ signal }),
  });
}

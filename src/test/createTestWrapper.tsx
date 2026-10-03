import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/repositories/RepositoryProvider';
import type { Repositories } from '@/repositories/contracts';
import { createMockRepositories } from '@/services/mock/repositories';
export function createTestWrapper(
  repositories: Repositories = createMockRepositories(),
) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <RepositoryProvider repositories={repositories}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </RepositoryProvider>
    );
  }
  return { wrapper: Wrapper, client };
}

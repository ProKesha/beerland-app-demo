import { createContext, useContext, type PropsWithChildren } from 'react';
import type { Repositories } from './contracts';
const RepositoryContext = createContext<Repositories | null>(null);
export function RepositoryProvider({
  repositories,
  children,
}: PropsWithChildren<{ repositories: Repositories }>) {
  return (
    <RepositoryContext.Provider value={repositories}>
      {children}
    </RepositoryContext.Provider>
  );
}
export function useRepositories() {
  const value = useContext(RepositoryContext);
  if (!value) throw new Error('RepositoryProvider is required');
  return value;
}

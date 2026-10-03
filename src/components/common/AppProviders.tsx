import { useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createQueryClient } from '@/config/queryClient';
import { useHydrateStores } from '@/hooks/useHydrateStores';
import { repositories } from '@/repositories';
import { RepositoryProvider } from '@/repositories/RepositoryProvider';
import { config } from '@/config/env';
import { RecoveryScreen } from './RecoveryScreen';
export function AppProviders({ children }: PropsWithChildren) {
  const [client] = useState(createQueryClient);
  useHydrateStores(repositories);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const listener = AppState.addEventListener('change', (state) =>
      focusManager.setFocused(state === 'active'),
    );
    return () => listener.remove();
  }, []);
  return (
    <SafeAreaProvider>
      <RepositoryProvider repositories={repositories}>
        <QueryClientProvider client={client}>
          {config.ready === false ? <RecoveryScreen configuration /> : children}
        </QueryClientProvider>
      </RepositoryProvider>
    </SafeAreaProvider>
  );
}

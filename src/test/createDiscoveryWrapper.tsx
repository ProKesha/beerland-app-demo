import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '@/components/ui';
import type { Repositories } from '@/repositories/contracts';
import { createTestWrapper } from './createTestWrapper';
export function createDiscoveryWrapper(repositories?: Repositories) {
  const { wrapper: DataProvider, client } = createTestWrapper(repositories);
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <DataProvider>
          <ToastProvider>{children}</ToastProvider>
        </DataProvider>
      </SafeAreaProvider>
    );
  }
  return { wrapper: Wrapper, client };
}

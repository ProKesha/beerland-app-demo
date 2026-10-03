// Internal review harness, loaded only behind the centralized development gate.
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/repositories/RepositoryProvider';
import { createMockRepositories } from '@/services/mock/repositories';
import { AppText, Button, Container, Screen } from '@/components/ui';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useSessionStore } from '@/stores/session';
import { useCheckoutStore, useAddressStore } from '@/stores/checkout';
import { CartScreen } from '@/features/cart/CartScreen';
import { CheckoutScreen } from '@/features/checkout/CheckoutScreen';
export function CheckoutVisualReview() {
  const [scenario, setScenario] = useState('');
  const [repositories] = useState(() => createMockRepositories());
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      }),
  );
  const select = (name: string) => {
    useSessionStore.setState({ hydrated: true });
    useSelectedStore.setState({ storeId: 'store-1' });
    useFulfillmentStore.setState({
      method: name === 'delivery' ? 'delivery' : 'pickup',
    });
    useCheckoutStore.getState().reset();
    useAddressStore.setState({ addresses: [], selectedId: null });
    useCartStore.setState({
      items:
        name === 'many'
          ? [
              { productId: 'product-1', storeId: 'store-1', quantity: 2 },
              {
                productId: 'product-1',
                variantId: '1000-ml',
                storeId: 'store-1',
                quantity: 3,
              },
              { productId: 'product-3', storeId: 'store-1', quantity: 1 },
              { productId: 'product-7', storeId: 'store-1', quantity: 4 },
            ]
          : [
              {
                productId: 'product-1',
                storeId: 'store-1',
                quantity: 1,
                ...(name === 'unavailable' ? { variantId: '1500-ml' } : {}),
              },
            ],
    });
    setScenario(name);
  };
  return (
    <RepositoryProvider repositories={repositories}>
      <QueryClientProvider client={client}>
        {!scenario ? (
          <Screen>
            <Container>
              <AppText>Локальна перевірка макетів</AppText>
              {['one', 'many', 'unavailable', 'delivery', 'pickup'].map(
                (name) => (
                  <Button
                    key={name}
                    label={name}
                    testID={`scenario-${name}`}
                    onPress={() => select(name)}
                  />
                ),
              )}
            </Container>
          </Screen>
        ) : scenario === 'delivery' || scenario === 'pickup' ? (
          <CheckoutScreen />
        ) : (
          <CartScreen />
        )}
      </QueryClientProvider>
    </RepositoryProvider>
  );
}

import { act, render, screen, waitFor } from '@testing-library/react-native';
import { CatalogScreen } from '@/features/catalog/CatalogScreen';
import { createMockRepositories } from '@/services/mock/repositories';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import { createDiscoveryWrapper as createTestWrapper } from '@/test/createDiscoveryWrapper';

beforeEach(() => {
  useSelectedStore.setState({ storeId: null });
  useSessionStore.setState({ hydrated: false });
});
afterEach(() => {
  useSelectedStore.setState({ storeId: null });
  useSessionStore.setState({ hydrated: false });
});

test('catalog waits for restored preferences before requesting store assortment', async () => {
  const repositories = createMockRepositories();
  const list = jest.spyOn(repositories.products, 'searchProducts');
  const { wrapper } = createTestWrapper(repositories);
  render(<CatalogScreen />, { wrapper });

  expect(screen.getByTestId('catalog-loading')).toBeOnTheScreen();
  expect(list).not.toHaveBeenCalled();

  act(() => {
    useSelectedStore.setState({ storeId: 'store-1' });
    useSessionStore.getState().setHydrated(true);
  });

  await waitFor(() => expect(screen.getByText('32 товари')).toBeOnTheScreen());
  expect(list).toHaveBeenCalledTimes(1);
  expect(list).toHaveBeenCalledWith(
    expect.objectContaining({ storeId: 'store-1', offset: 0, limit: 36 }),
    { signal: expect.any(AbortSignal) },
  );
});

test('catalog requests all products after hydration when no store was saved', async () => {
  const { wrapper } = createTestWrapper();
  render(<CatalogScreen />, { wrapper });
  act(() => useSessionStore.getState().setHydrated(true));
  await waitFor(() => expect(screen.getByText('32 товари')).toBeOnTheScreen());
});

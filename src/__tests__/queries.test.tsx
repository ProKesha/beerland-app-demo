import { renderHook, waitFor } from '@testing-library/react-native';
import { useProducts } from '@/features/catalog/useProducts';
import { useStores } from '@/features/stores/useStores';
import { createMockRepositories } from '@/services/mock/repositories';
import { createTestWrapper } from '@/test/createTestWrapper';
test('useProducts receives typed products through its provider', async () => {
  const { wrapper } = createTestWrapper();
  const { result } = renderHook(() => useProducts(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(32);
});
test('useStores receives typed stores', async () => {
  const { wrapper } = createTestWrapper();
  const { result } = renderHook(() => useStores(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(3);
});
test('changing the store changes the query and forwards a cancellation signal', async () => {
  const repositories = createMockRepositories();
  const spy = jest.spyOn(repositories.products, 'list');
  const { wrapper } = createTestWrapper(repositories);
  const { result, rerender } = renderHook<
    ReturnType<typeof useProducts>,
    { storeId: string }
  >(({ storeId }) => useProducts({ storeId }), {
    wrapper,
    initialProps: { storeId: 'store-1' },
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(
    result.current.data?.every((product) =>
      product.storeIds.includes('store-1'),
    ),
  ).toBe(true);
  rerender({ storeId: 'unknown' });
  await waitFor(() => expect(result.current.data).toEqual([]));
  expect(spy).toHaveBeenLastCalledWith(
    { storeId: 'unknown' },
    { signal: expect.any(AbortSignal) },
  );
});
test('repository failures become query error states', async () => {
  const repositories = createMockRepositories();
  repositories.stores.list = jest.fn().mockRejectedValue(new Error('Offline'));
  const { wrapper } = createTestWrapper(repositories);
  const { result } = renderHook(() => useStores(), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error?.message).toBe('Offline');
});

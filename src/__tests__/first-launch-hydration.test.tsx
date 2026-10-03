import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMockRepositories } from '@/services/mock/repositories';
import { useHydrateStores } from '@/hooks/useHydrateStores';
import { useSessionStore } from '@/stores/session';

test('a stalled local startup shows recovery instead of spinning forever', async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
  useSessionStore.setState({
    hydrated: false,
    hydrationError: false,
    hydrationRetry: 0,
  });
  const repositories = createMockRepositories();
  repositories.users.getCurrent = () => new Promise(() => undefined);
  const { unmount } = renderHook(() => useHydrateStores(repositories));
  await act(async () => {
    jest.advanceTimersByTime(8000);
  });
  expect(useSessionStore.getState().hydrated).toBe(false);
  expect(useSessionStore.getState().hydrationError).toBe(true);
  act(() => useSessionStore.getState().retryHydration());
  expect(useSessionStore.getState().hydrationError).toBe(false);
  expect(useSessionStore.getState().hydrationRetry).toBe(1);
  unmount();
  jest.useRealTimers();
});

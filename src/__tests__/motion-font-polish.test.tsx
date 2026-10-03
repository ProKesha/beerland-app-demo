import { AccessibilityInfo, Text } from 'react-native';
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { FontProvider as FontProviderType } from '@/theme/FontProvider';

const { FontProvider } = jest.requireActual<{
  FontProvider: typeof FontProviderType;
}>('@/theme/FontProvider');
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  isLoaded: jest.fn(() => true),
  useFonts: jest.fn(() => [false, null]),
}));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => undefined),
  hideAsync: jest.fn(async () => undefined),
}));
beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('a stalled native font load dismisses the splash after eight seconds and shows usable content', async () => {
  jest.useFakeTimers();
  jest.mocked(useFonts).mockReturnValue([false, null]);
  render(
    <FontProvider>
      <Text>Відновлений застосунок</Text>
    </FontProvider>,
  );
  expect(screen.queryByText('Відновлений застосунок')).toBeNull();
  await act(async () => jest.advanceTimersByTime(8000));
  expect(screen.getByText('Відновлений застосунок')).toBeOnTheScreen();
  expect(SplashScreen.hideAsync).toHaveBeenCalled();
});
test('a font loading error releases the splash without waiting for the timeout', async () => {
  jest.mocked(useFonts).mockReturnValue([false, Error('font')]);
  render(
    <FontProvider>
      <Text>Beerland</Text>
    </FontProvider>,
  );
  expect(screen.getByText('Beerland')).toBeOnTheScreen();
  expect(SplashScreen.hideAsync).toHaveBeenCalled();
});
test('reduced motion reads the system preference and removes its listener on unmount', async () => {
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(true);
  const subscribe = jest.spyOn(AccessibilityInfo, 'addEventListener');
  const hook = renderHook(() => useReducedMotion());
  const remove = jest.spyOn(subscribe.mock.results[0].value, 'remove');
  await waitFor(() => expect(hook.result.current).toBe(true));
  hook.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});
test('a live reduced motion change wins over an older initial system read', async () => {
  let resolve!: (value: boolean) => void;
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(
    new Promise<boolean>((done) => {
      resolve = done;
    }),
  );
  const subscribe = jest.spyOn(AccessibilityInfo, 'addEventListener');
  const hook = renderHook(() => useReducedMotion());
  act(() => Reflect.apply(subscribe.mock.calls[0][1], undefined, [true]));
  expect(hook.result.current).toBe(true);
  await act(async () => resolve(false));
  expect(hook.result.current).toBe(true);
});

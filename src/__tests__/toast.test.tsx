import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';
import { ToastProvider, ToastRegion, useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { motion } from '@/theme/tokens';

function Actions() {
  const toast = useToast();
  return (
    <>
      <Button label="Перше" onPress={() => toast.show('Додано в кошик')} />
      <Button label="Друге" onPress={() => toast.show('Додано в обране')} />
      <Button label="Сховати" onPress={toast.dismiss} />
    </>
  );
}

function setup() {
  return render(
    <ToastProvider>
      <Actions />
      <ToastRegion />
    </ToastProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest
    .spyOn(AccessibilityInfo, 'isScreenReaderEnabled')
    .mockResolvedValue(false);
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});
async function press(name: string) {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
}

test('new feedback replaces old feedback and can be dismissed', async () => {
  setup();
  await press('Перше');
  expect(screen.getByTestId('app-toast')).toBeOnTheScreen();
  expect(screen.getByText('Додано в кошик')).toBeOnTheScreen();
  await press('Друге');
  expect(screen.queryByText('Додано в кошик')).toBeNull();
  expect(screen.getByText('Додано в обране')).toBeOnTheScreen();
  await press('Сховати');
  expect(screen.queryByTestId('app-toast')).toBeNull();
});

test('feedback disappears after two seconds and unmount clears its timer', async () => {
  const schedule = jest.spyOn(globalThis, 'setTimeout');
  const cancel = jest.spyOn(globalThis, 'clearTimeout');
  const view = setup();
  await press('Перше');
  expect(motion.toastDuration).toBe(2000);
  act(() => jest.advanceTimersByTime(1999));
  expect(screen.getByText('Додано в кошик')).toBeOnTheScreen();
  act(() => jest.advanceTimersByTime(1));
  expect(screen.queryByTestId('app-toast')).toBeNull();

  await press('Друге');
  const toastTimerIndex = schedule.mock.calls.findLastIndex(
    ([, delay]) => delay === motion.toastDuration,
  );
  const toastTimer = schedule.mock.results[toastTimerIndex].value;
  view.unmount();
  expect(cancel).toHaveBeenCalledWith(toastTimer);
});

test('a new message restarts the two-second timer', async () => {
  setup();
  await press('Перше');
  act(() => jest.advanceTimersByTime(1000));
  await press('Друге');
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByText('Додано в обране')).toBeOnTheScreen();
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.queryByTestId('app-toast')).toBeNull();
});

test('unmount ignores a pending screen-reader lookup', async () => {
  let resolveLookup!: (enabled: boolean) => void;
  jest.mocked(AccessibilityInfo.isScreenReaderEnabled).mockReturnValue(
    new Promise((resolve) => {
      resolveLookup = resolve;
    }),
  );
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  const view = setup();
  await press('Перше');
  view.unmount();
  await act(async () => {
    resolveLookup(true);
  });
  expect(announce).not.toHaveBeenCalled();
});

test('native screen reader hears feedback while the visible notice still expires', async () => {
  jest.mocked(AccessibilityInfo.isScreenReaderEnabled).mockResolvedValue(true);
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  setup();
  await press('Перше');
  expect(announce).toHaveBeenCalledWith('Додано в кошик');
  act(() => jest.advanceTimersByTime(motion.toastDuration));
  expect(screen.queryByTestId('app-toast')).toBeNull();
});

test('web feedback expires without querying native screen-reader state', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  setup();
  await press('Перше');
  expect(AccessibilityInfo.isScreenReaderEnabled).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(motion.toastDuration));
  expect(screen.queryByTestId('app-toast')).toBeNull();
});

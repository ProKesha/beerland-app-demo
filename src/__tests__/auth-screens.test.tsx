import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';
import { createMockRepositories } from '@/services/mock/repositories';
import { createDiscoveryWrapper } from '@/test/createDiscoveryWrapper';
import {
  PhoneScreen,
  OtpScreen,
  CompleteProfileScreen,
  MergeScreen,
} from '@/features/auth/Screens';
import { useAuthFlow } from '@/features/auth/flow';
import { useSessionStore } from '@/stores/session';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { AuthError } from '@/features/auth/model';
import { SettingsScreen } from '@/features/profile/SettingsScreen';
import { activateDemoWorkspace } from '@/features/auth/workspace';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => ({ returnTo: '/profile' }),
}));
jest.mock('@/config/env', () => ({
  config: { demoAuthEnabled: true, dataSource: 'mock' },
}));
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useAuthFlow.getState().reset();
  useSessionStore.setState({
    status: 'guest',
    user: null,
    hydrated: true,
    error: null,
  });
  useCartStore.setState({ items: [] });
  useFavoritesStore.setState({ productIds: [] });
});
function setup(element: React.ReactElement) {
  const repositories = createMockRepositories({
    authEnabled: true,
    storage: AsyncStorage,
  });
  const wrapped = createDiscoveryWrapper(repositories);
  render(element, { wrapper: wrapped.wrapper });
  return { repositories, client: wrapped.client };
}
test('guest Profile offers login without hiding guest actions', async () => {
  setup(<ProfileScreen />);
  fireEvent.press(
    await screen.findByRole('button', { name: 'Увійти або зареєструватися' }),
  );
  expect(router.push).toHaveBeenCalledWith('/auth/phone?returnTo=%2Fprofile');
  expect(screen.getByLabelText('Обране')).toBeOnTheScreen();
});
test('phone input normalizes pasted formats and requests one challenge', async () => {
  const { repositories } = setup(<PhoneScreen />);
  const request = jest.spyOn(repositories.auth, 'requestOtp');
  expect(screen.getByRole('button', { name: 'Отримати код' })).toBeDisabled();
  fireEvent.changeText(screen.getByTestId('auth-phone'), '123');
  fireEvent(screen.getByTestId('auth-phone'), 'blur');
  expect(
    screen.getByText('Вкажіть український номер у форматі +380 XX XXX XX XX'),
  ).toBeOnTheScreen();
  fireEvent.changeText(screen.getByTestId('auth-phone'), '+380 (50) 123-45-67');
  fireEvent.press(screen.getByRole('button', { name: 'Отримати код' }));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/auth/otp'));
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith('+380501234567');
});
test('rapid double request is locked and service failure is readable', async () => {
  const { repositories } = setup(<PhoneScreen />);
  let reject!: (error: Error) => void;
  const pending = new Promise<never>((_resolve, rejectPromise) => {
    reject = rejectPromise;
  });
  const request = jest
    .spyOn(repositories.auth, 'requestOtp')
    .mockReturnValue(pending);
  fireEvent.changeText(screen.getByTestId('auth-phone'), '0501234567');
  const button = screen.getByRole('button', { name: 'Отримати код' });
  fireEvent.press(button);
  fireEvent.press(button);
  expect(request).toHaveBeenCalledTimes(1);
  expect(button.props.accessibilityState.busy).toBe(true);
  reject(new AuthError('service'));
  expect(
    await screen.findByText('Не вдалося виконати дію. Спробуйте ще раз.'),
  ).toBeOnTheScreen();
});
test('OTP paste auto-submits, authenticates and routes to optional profile', async () => {
  const repositories = createMockRepositories({
    authEnabled: true,
    storage: AsyncStorage,
  });
  const challenge = await repositories.auth.requestOtp('0501234567');
  useAuthFlow.getState().setChallenge(challenge);
  const wrapped = createDiscoveryWrapper(repositories);
  render(<OtpScreen />, { wrapper: wrapped.wrapper });
  expect(screen.getByText('+380 50 123 45 67')).toBeOnTheScreen();
  fireEvent.changeText(screen.getByTestId('auth-otp'), '123456');
  await waitFor(() =>
    expect(useSessionStore.getState().status).toBe('authenticated'),
  );
  expect(router.replace).toHaveBeenCalledWith('/auth/complete-profile');
  expect(useSessionStore.getState().user?.phone).toBe('+380501234567');
});
test('incorrect OTP is shown and the code can be corrected', async () => {
  const repositories = createMockRepositories({
    authEnabled: true,
    storage: AsyncStorage,
  });
  useAuthFlow
    .getState()
    .setChallenge(await repositories.auth.requestOtp('0501234567'));
  const wrapped = createDiscoveryWrapper(repositories);
  render(<OtpScreen />, { wrapper: wrapped.wrapper });
  fireEvent.changeText(screen.getByTestId('auth-otp'), '000000');
  expect(
    await screen.findByText('Неправильний код. Спробуйте ще раз.'),
  ).toBeOnTheScreen();
  expect(screen.getByTestId('auth-otp').props.value).toBe('');
  fireEvent.changeText(screen.getByTestId('auth-otp'), '123456');
  await waitFor(() =>
    expect(useSessionStore.getState().status).toBe('authenticated'),
  );
});
test('profile completion is optional and saves only to verified demo account', async () => {
  const repositories = createMockRepositories({
    authEnabled: true,
    storage: AsyncStorage,
  });
  const challenge = await repositories.auth.requestOtp('0501234567');
  const user = await repositories.auth.verifyOtp(challenge.id, '123456');
  useSessionStore.getState().setAuthenticated(user);
  const wrapped = createDiscoveryWrapper(repositories);
  render(<CompleteProfileScreen />, { wrapper: wrapped.wrapper });
  fireEvent.changeText(screen.getByTestId('auth-name'), 'Олена');
  fireEvent.changeText(screen.getByTestId('auth-email'), 'olena@example.com');
  fireEvent.press(screen.getByRole('button', { name: 'Продовжити' }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/profile'));
  expect((await repositories.auth.restoreSession())?.name).toBe('Олена');
});
test('logout requires confirmation and restores guest cart', async () => {
  const repositories = createMockRepositories({
    authEnabled: true,
    storage: AsyncStorage,
  });
  const challenge = await repositories.auth.requestOtp('0501234567');
  const user = await repositories.auth.verifyOtp(challenge.id, '123456');
  useCartStore.setState({
    items: [{ productId: 'product-1', storeId: 'store-1', quantity: 1 }],
  });
  await activateDemoWorkspace(user.id, repositories);
  useCartStore.setState({
    items: [{ productId: 'product-1', storeId: 'store-1', quantity: 2 }],
  });
  useSessionStore.getState().setAuthenticated(user);
  const wrapped = createDiscoveryWrapper(repositories);
  render(<SettingsScreen />, { wrapper: wrapped.wrapper });
  fireEvent.press(screen.getByRole('button', { name: 'Вийти з акаунта' }));
  expect(useSessionStore.getState().status).toBe('authenticated');
  fireEvent.press(screen.getByRole('button', { name: 'Скасувати' }));
  expect(useSessionStore.getState().status).toBe('authenticated');
  fireEvent.press(screen.getByRole('button', { name: 'Вийти з акаунта' }));
  fireEvent.press(
    screen.getAllByRole('button', { name: 'Вийти з акаунта' })[1],
  );
  await waitFor(() => expect(useSessionStore.getState().status).toBe('guest'));
  expect(useCartStore.getState().items).toEqual([
    { productId: 'product-1', storeId: 'store-1', quantity: 1 },
  ]);
});
test('pending cart merge can be canceled back to a guest without keeping the demo session', async () => {
  const repositories = createMockRepositories({
    authEnabled: true,
    storage: AsyncStorage,
  });
  const challenge = await repositories.auth.requestOtp('0501234567');
  const user = await repositories.auth.verifyOtp(challenge.id, '123456');
  useAuthFlow.getState().setPendingUser(user);
  useCartStore.setState({
    items: [{ productId: 'product-1', storeId: 'store-1', quantity: 1 }],
  });
  const wrapped = createDiscoveryWrapper(repositories);
  render(<MergeScreen />, { wrapper: wrapped.wrapper });
  fireEvent.press(screen.getByRole('button', { name: 'Продовжити як гість' }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/profile'));
  expect(useAuthFlow.getState().pendingUser).toBeNull();
  expect(useSessionStore.getState().status).toBe('guest');
  expect(await repositories.auth.restoreSession()).toBeNull();
  expect(useCartStore.getState().items).toHaveLength(1);
});

test('changing the phone preserves the intended return destination and cancels the old OTP', async () => {
  const repositories = createMockRepositories({
    authEnabled: true,
    storage: AsyncStorage,
  });
  const challenge = await repositories.auth.requestOtp('0501234567');
  useAuthFlow.getState().setChallenge(challenge);
  useAuthFlow.getState().setReturnTo('/checkout');
  const wrapped = createDiscoveryWrapper(repositories);
  render(<OtpScreen />, { wrapper: wrapped.wrapper });
  fireEvent.press(screen.getByRole('button', { name: 'Змінити номер' }));
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/auth/phone',
      params: { returnTo: '/checkout' },
    }),
  );
  expect(await repositories.auth.getPendingChallenge()).toBeNull();
  await expect(
    repositories.auth.verifyOtp(challenge.id, '123456'),
  ).rejects.toMatchObject({ code: 'invalidChallenge' });
});

test('resend countdown enables at the deadline and rapid taps issue one request', async () => {
  jest.useFakeTimers();
  const repositories = createMockRepositories({
    authEnabled: true,
    storage: AsyncStorage,
  });
  const challenge = await repositories.auth.requestOtp('0501234567');
  useAuthFlow.getState().setChallenge(challenge);
  const wrapped = createDiscoveryWrapper(repositories);
  const { unmount } = render(<OtpScreen />, { wrapper: wrapped.wrapper });
  const request = jest.spyOn(repositories.auth, 'requestOtp');
  try {
    expect(
      screen.getByRole('button', { name: 'Надіслати повторно через 01:00' }),
    ).toBeDisabled();
    act(() => {
      jest.advanceTimersByTime(59_000);
    });
    expect(
      screen.getByRole('button', { name: 'Надіслати повторно через 00:01' }),
    ).toBeDisabled();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    const resend = screen.getByRole('button', {
      name: 'Надіслати код повторно',
    });
    expect(resend).toBeEnabled();
    fireEvent.press(resend);
    fireEvent.press(resend);
    await waitFor(() =>
      expect(useAuthFlow.getState().challenge?.id).not.toBe(challenge.id),
    );
    expect(request).toHaveBeenCalledTimes(1);
  } finally {
    unmount();
    jest.useRealTimers();
  }
});

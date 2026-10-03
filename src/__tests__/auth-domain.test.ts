import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMockAuthRepository } from '@/services/mock/auth';
import { AuthError, formatCountdown, phoneSchema } from '@/features/auth/model';
import { safeReturnTo } from '@/features/auth/flow';

beforeEach(async () => {
  await AsyncStorage.clear();
});

test.each([
  ['0501234567', '+380501234567'],
  ['+380 50 123 45 67', '+380501234567'],
  ['380501234567', '+380501234567'],
  ['8 (050) 123-45-67', '+380501234567'],
])('normalizes Ukrainian phone %s', (input, expected) => {
  expect(phoneSchema.parse(input)).toBe(expected);
});
test.each(['', '050123', '+480501234567', '050abc4567'])(
  'rejects invalid phone %s',
  (input) => {
    expect(phoneSchema.safeParse(input).success).toBe(false);
  },
);
test('return destination is restricted to internal account routes', () => {
  expect(safeReturnTo('/orders')).toBe('/orders');
  expect(safeReturnTo('https://example.com')).toBe('/profile');
  expect(safeReturnTo('//example.com')).toBe('/profile');
  expect(safeReturnTo('/auth/otp')).toBe('/profile');
});
test('timestamp countdown is stable across background gaps', () => {
  expect(formatCountdown(45_000)).toBe('00:45');
  expect(formatCountdown(-1)).toBe('00:00');
});
test('demo OTP validates, limits attempts and never persists the code', async () => {
  let time = 1_000;
  const auth = createMockAuthRepository({
    enabled: true,
    storage: AsyncStorage,
    now: () => time,
  });
  const challenge = await auth.requestOtp('0501234567');
  expect(challenge.phone).toBe('+380501234567');
  expect(challenge.resendAvailableAt).toBe(61_000);
  expect(await auth.getPendingChallenge()).toMatchObject({ id: challenge.id });
  expect(
    Object.keys(
      JSON.parse(
        (await AsyncStorage.getItem('beerland:demo-auth-challenge:v1'))!,
      ),
    ),
  ).not.toContain('code');
  await expect(auth.requestOtp('0501234567')).rejects.toMatchObject({
    code: 'resendWait',
  });
  for (let attempt = 0; attempt < 4; attempt++)
    await expect(auth.verifyOtp(challenge.id, '000000')).rejects.toMatchObject({
      code: 'invalidCode',
    });
  await expect(auth.verifyOtp(challenge.id, '000000')).rejects.toMatchObject({
    code: 'attempts',
  });
  await expect(auth.verifyOtp(challenge.id, '123456')).rejects.toMatchObject({
    code: 'attempts',
  });
  time = 61_000;
  const resent = await auth.requestOtp(challenge.phone);
  expect(resent.id).not.toBe(challenge.id);
  const user = await auth.verifyOtp(resent.id, '123456');
  expect(user).toMatchObject({
    phone: '+380501234567',
    needsProfile: true,
    demo: true,
  });
  expect(
    await AsyncStorage.getItem('beerland:demo-auth-challenge:v1'),
  ).toBeNull();
  expect(
    Object.keys(
      JSON.parse(
        (await AsyncStorage.getItem('beerland:demo-auth-session:v1'))!,
      ),
    ),
  ).toEqual(['phone', 'expiresAt']);
});
test('resend limit, cancellation and expiration use provider timestamps', async () => {
  let time = 0;
  const auth = createMockAuthRepository({
    enabled: true,
    storage: AsyncStorage,
    now: () => time,
    resendMs: 1000,
    ttlMs: 2000,
  });
  let challenge = await auth.requestOtp('0501234567');
  time = 1000;
  challenge = await auth.requestOtp('0501234567');
  time = 2000;
  challenge = await auth.requestOtp('0501234567');
  time = 3000;
  challenge = await auth.requestOtp('0501234567');
  time = 4000;
  await expect(auth.requestOtp('0501234567')).rejects.toMatchObject({
    code: 'resendLimit',
  });
  await auth.cancelChallenge(challenge.id);
  await expect(auth.verifyOtp(challenge.id, '123456')).rejects.toMatchObject({
    code: 'invalidChallenge',
  });
  challenge = await auth.requestOtp('0501234567');
  time = 6000;
  await expect(auth.verifyOtp(challenge.id, '123456')).rejects.toMatchObject({
    code: 'expired',
  });
});
test('demo session and profile restore; expiry, corruption and logout fail closed', async () => {
  let time = 100;
  const options = {
    enabled: true,
    storage: AsyncStorage,
    now: () => time,
    sessionMs: 1000,
  };
  const auth = createMockAuthRepository(options);
  const challenge = await auth.requestOtp('0501234567');
  await auth.verifyOtp(challenge.id, '123456');
  await auth.updateProfile({ name: 'Олена', email: 'olena@example.com' });
  const restart = createMockAuthRepository(options);
  expect(await restart.restoreSession()).toMatchObject({
    name: 'Олена',
    needsProfile: false,
  });
  await restart.signOut();
  expect(await restart.restoreSession()).toBeNull();
  const next = await restart.requestOtp('0501234567');
  await restart.verifyOtp(next.id, '123456');
  time = 1100;
  expect(await createMockAuthRepository(options).restoreSession()).toBeNull();
  await AsyncStorage.setItem('beerland:demo-auth-session:v1', '{bad');
  expect(await createMockAuthRepository(options).restoreSession()).toBeNull();
});
test('production-disabled provider never accepts deterministic OTP', async () => {
  const auth = createMockAuthRepository({
    enabled: false,
    storage: AsyncStorage,
  });
  await expect(auth.requestOtp('0501234567')).rejects.toBeInstanceOf(AuthError);
  await expect(auth.verifyOtp('any', '123456')).rejects.toMatchObject({
    code: 'unavailable',
  });
  expect(await auth.restoreSession()).toBeNull();
  expect(auth.development).toBeUndefined();
});
test('internal controls simulate request failure, expired OTP, resend and session expiration', async () => {
  let time = 100;
  const auth = createMockAuthRepository({
    enabled: true,
    storage: AsyncStorage,
    now: () => time,
    resendMs: 1000,
  });
  auth.development!.failNextRequest();
  await expect(auth.requestOtp('0501234567')).rejects.toMatchObject({
    code: 'service',
  });
  let challenge = await auth.requestOtp('0501234567');
  await auth.development!.expireChallenge();
  await expect(auth.verifyOtp(challenge.id, '123456')).rejects.toMatchObject({
    code: 'expired',
  });
  await auth.development!.allowResend();
  challenge = await auth.requestOtp('0501234567');
  await auth.verifyOtp(challenge.id, '123456');
  await auth.development!.expireSession();
  expect(
    await createMockAuthRepository({
      enabled: true,
      storage: AsyncStorage,
      now: () => time,
    }).restoreSession(),
  ).toBeNull();
});

test('one OTP challenge cannot authenticate two simultaneous verification requests', async () => {
  const auth = createMockAuthRepository({
    enabled: true,
    storage: AsyncStorage,
  });
  const challenge = await auth.requestOtp('0501234567');
  const results = await Promise.allSettled([
    auth.verifyOtp(challenge.id, '123456'),
    auth.verifyOtp(challenge.id, '123456'),
  ]);
  expect(
    results.filter((result) => result.status === 'fulfilled'),
  ).toHaveLength(1);
  expect(results.find((result) => result.status === 'rejected')).toMatchObject({
    reason: { code: 'invalidChallenge' },
  });
});

test('attempts and resend budget survive repository restart', async () => {
  let time = 0;
  const options = {
    enabled: true,
    storage: AsyncStorage,
    now: () => time,
    resendMs: 1000,
  };
  let auth = createMockAuthRepository(options);
  let challenge = await auth.requestOtp('0501234567');
  await expect(auth.verifyOtp(challenge.id, '000000')).rejects.toMatchObject({
    code: 'invalidCode',
  });
  auth = createMockAuthRepository(options);
  expect((await auth.getPendingChallenge())?.remainingAttempts).toBe(4);
  await expect(auth.requestOtp(challenge.phone)).rejects.toMatchObject({
    code: 'resendWait',
  });
  for (let resend = 1; resend <= 3; resend++) {
    time = resend * 1000;
    auth = createMockAuthRepository(options);
    challenge = await auth.requestOtp(challenge.phone);
  }
  time = 4000;
  await expect(
    createMockAuthRepository(options).requestOtp(challenge.phone),
  ).rejects.toMatchObject({ code: 'resendLimit' });
});

test('turning demo authentication off rejects an existing challenge and stored session', async () => {
  const auth = createMockAuthRepository({
    enabled: true,
    storage: AsyncStorage,
  });
  const challenge = await auth.requestOtp('0501234567');
  const disabled = createMockAuthRepository({ storage: AsyncStorage });
  expect(await disabled.getPendingChallenge()).toBeNull();
  await expect(
    disabled.verifyOtp(challenge.id, '123456'),
  ).rejects.toMatchObject({ code: 'unavailable' });
  await auth.verifyOtp(challenge.id, '123456');
  expect(await disabled.restoreSession()).toBeNull();
  await expect(disabled.updateProfile({ name: 'Тест' })).rejects.toMatchObject({
    code: 'unavailable',
  });
});

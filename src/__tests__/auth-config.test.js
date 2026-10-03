const { afterEach, expect, jest, test } = require('@jest/globals');

const previousDev = global.__DEV__;
const previousFlag = process.env.EXPO_PUBLIC_DEMO_AUTH;
afterEach(() => {
  global.__DEV__ = previousDev;
  if (previousFlag === undefined) delete process.env.EXPO_PUBLIC_DEMO_AUTH;
  else process.env.EXPO_PUBLIC_DEMO_AUTH = previousFlag;
});

test.each([
  [true, '0', false],
  [true, '1', true],
  [false, '0', false],
  [false, '1', false],
])('demo mode requires development=%s and flag=%s', (dev, flag, expected) => {
  global.__DEV__ = dev;
  process.env.EXPO_PUBLIC_DEMO_AUTH = flag;
  jest.isolateModules(() => {
    expect(require('../config/env').config.demoAuthEnabled).toBe(expected);
  });
});

test('optimized auth rejects requests even with an enabled internal flag', async () => {
  global.__DEV__ = false;
  let createMockAuthRepository;
  jest.isolateModules(() => {
    ({ createMockAuthRepository } = require('../services/mock/auth'));
  });
  const storage = { getItem: jest.fn(), setItem: jest.fn() };
  const auth = createMockAuthRepository({ enabled: true, storage });
  await expect(auth.requestOtp('+380000000000')).rejects.toMatchObject({
    code: 'unavailable',
  });
  await expect(
    auth.verifyOtp('existing-challenge', '123456'),
  ).rejects.toMatchObject({
    code: 'unavailable',
  });
  expect(await auth.getPendingChallenge()).toBeNull();
  expect(await auth.restoreSession()).toBeNull();
  expect(auth.development).toBeUndefined();
  expect(storage.getItem).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
});

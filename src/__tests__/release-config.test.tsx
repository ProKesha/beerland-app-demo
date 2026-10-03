import { render, screen, fireEvent } from '@testing-library/react-native';
import { Redirect } from 'expo-router';
import { resolveConfig } from '@/config/environment';
import { createUnavailableRepositories } from '@/repositories/unavailable';
import CheckoutReviewRoute from '../../app/(main)/phase6-review';
import DesignSystemRoute from '../../app/(main)/design-system';
import { RecoveryScreen } from '@/components/common/RecoveryScreen';

jest.mock('@/config/env', () => ({
  config: { developmentToolsEnabled: false, designSystemEnabled: false },
}));

test.each(['development', 'demo', 'production'])(
  'optimized %s bundles cannot accept demo OTP or expose development controls',
  (environment) => {
    const config = resolveConfig(
      { environment, demoAuth: '1', designSystem: '1' },
      false,
    );
    expect(config.demoAuthEnabled).toBe(false);
    expect(config.developmentToolsEnabled).toBe(false);
    expect(config.designSystemEnabled).toBe(false);
  },
);
test('explicit production fails closed even in a development runtime with an API URL', () => {
  const config = resolveConfig(
    {
      environment: 'production',
      apiUrl: 'https://example.com/api',
      demoAuth: '1',
      designSystem: '1',
    },
    true,
  );
  expect(config).toMatchObject({
    ready: false,
    dataSource: 'unavailable',
    demoAuthEnabled: false,
    developmentToolsEnabled: false,
    configurationIssue: 'production-adapters-required',
  });
});
test.each([
  { environment: 'unknown' },
  { demoAuth: 'yes' },
  { apiUrl: 'invalid-url' },
])(
  'malformed configuration renders a safe failure instead of throwing on import: %j',
  (input) => {
    expect(resolveConfig(input, true)).toMatchObject({
      ready: false,
      demoAuthEnabled: false,
      developmentToolsEnabled: false,
      configurationIssue: 'invalid-public-configuration',
    });
  },
);
test('development tools and authentication require explicit independent flags', () => {
  expect(resolveConfig({}, true)).toMatchObject({
    ready: true,
    demoAuthEnabled: false,
    designSystemEnabled: false,
  });
  expect(
    resolveConfig({ demoAuth: '1', designSystem: '1' }, true),
  ).toMatchObject({ demoAuthEnabled: true, designSystemEnabled: true });
});
test('optimized exports default to a labeled demo data source', () => {
  expect(resolveConfig({}, false)).toMatchObject({
    environment: 'demo',
    dataSource: 'mock',
    ready: true,
  });
});
test('both internal review routes deny access before loading their review screens', () => {
  for (const element of [CheckoutReviewRoute(), DesignSystemRoute()]) {
    expect(element.type).toBe(Redirect);
    expect(element.props.href).toBe('/+not-found');
  }
});
test('unconfigured repositories cannot return invented business data or authenticate', async () => {
  const r = createUnavailableRepositories();
  await expect(r.auth.requestOtp('0501234567')).rejects.toMatchObject({
    code: 'unavailable',
  });
  await expect(
    r.auth.verifyOtp('previous-challenge', '123456'),
  ).rejects.toMatchObject({ code: 'unavailable' });
  expect(await r.auth.restoreSession()).toBeNull();
  expect(r.auth.development).toBeUndefined();
  for (const request of [
    () => r.products.list(),
    () => r.stores.list(),
    () => r.orders.list(),
    () => r.users.getCurrent(),
    () => r.loyalty.getCurrent(),
    () => r.promotions.list({ activeAt: new Date().toISOString() }),
  ])
    await expect(request()).rejects.toThrow('Service unavailable');
});
test('branded recovery offers retry and configuration failures do not expose diagnostics', () => {
  const retry = jest.fn();
  const { rerender } = render(<RecoveryScreen onRetry={retry} />);
  fireEvent.press(screen.getByRole('button', { name: 'Повторити' }));
  expect(retry).toHaveBeenCalledTimes(1);
  rerender(<RecoveryScreen configuration />);
  expect(
    screen.getByRole('header', { name: 'Застосунок ще не налаштовано' }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Повторити' })).toBeNull();
});

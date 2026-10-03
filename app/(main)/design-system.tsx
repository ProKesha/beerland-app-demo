import { Redirect } from 'expo-router';
import { config } from '@/config/env';
export default function DesignSystemRoute() {
  if (!config.designSystemEnabled) {
    return <Redirect href="/+not-found" />;
  }
  // Keep the review surface out of the default production route's code path.
  /* eslint-disable @typescript-eslint/no-require-imports -- build-time review gate */
  const {
    DesignSystemScreen,
  } = require('@/features/design-system/DesignSystemScreen');
  return <DesignSystemScreen />;
}

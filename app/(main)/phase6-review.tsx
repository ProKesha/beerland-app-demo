import { Redirect } from 'expo-router';
import { config } from '@/config/env';

export default function CheckoutReviewRoute() {
  if (!config.developmentToolsEnabled) return <Redirect href="/+not-found" />;
  /* eslint-disable @typescript-eslint/no-require-imports -- internal review gate */
  const { CheckoutVisualReview } = require('@/test/CheckoutVisualReview');
  return <CheckoutVisualReview />;
}

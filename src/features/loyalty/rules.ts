import type { LoyaltyAccount } from '@/types/domain';
/** Illustrative configuration only. A future server owns earning and redemption. */
export const demoLoyaltyRules = {
  pointsPerUAH: 0.01,
  redemptionUAH: 1,
  tiers: [
    { id: 'Classic', threshold: 0 },
    { id: 'Silver', threshold: 500 },
    { id: 'Gold', threshold: 2000 },
  ],
};
export function loyaltyProgress(
  account: LoyaltyAccount,
  rules = demoLoyaltyRules,
) {
  const index = rules.tiers.findIndex((t) => t.id === account.tier);
  const next = rules.tiers[index + 1];
  const current = rules.tiers[index];
  if (!current) return { progress: 0, next: undefined };
  if (!next) return { progress: 1, next: undefined };
  const span = next.threshold - current.threshold;
  return {
    progress: Math.max(0, Math.min(1, 1 - account.pointsToNextTier / span)),
    next: next.id,
  };
}

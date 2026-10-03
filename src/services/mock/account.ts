import { customerSchema } from '@/features/checkout/model';
import type { UserRepository } from '@/repositories/contracts';
import type { User, LoyaltyAccount, Address } from '@/types/domain';
import type { OrderStorage } from './orders';
// Demo identity deliberately contains no invented name or contact details.
export function createLocalUserRepository(
  storage?: OrderStorage,
  initialAddresses: Address[] = [],
): UserRepository {
  let current: User = {
    id: 'demo-customer',
    name: '',
    addresses: initialAddresses.map((address) => ({ ...address })),
  };
  const key = 'beerland:local-profile:v1';
  let loaded = false;
  async function load() {
    if (loaded) return;
    const raw = await storage?.getItem(key);
    if (raw) {
      // A malformed local record must not permanently block the profile form.
      // Storage read failures still propagate so the screen can offer retry.
      try {
        const saved = customerSchema.safeParse(JSON.parse(raw));
        if (saved.success) current = { ...current, ...saved.data };
      } catch {
        // Keep the empty demo identity until the customer saves valid fields.
      }
    }
    loaded = true;
  }
  return {
    getCurrent: async () => {
      await load();
      return {
        ...current,
        addresses: current.addresses.map((address) => ({ ...address })),
      };
    },
    updateCurrent: async (fields) => {
      await load();
      const data = customerSchema.parse(fields);
      await storage?.setItem(key, JSON.stringify(data));
      current = { ...current, ...data };
      return {
        ...current,
        addresses: current.addresses.map((address) => ({ ...address })),
      };
    },
  };
}
export const demoLoyalty: LoyaltyAccount = {
  id: 'demo-club',
  userId: 'demo-customer',
  membershipNumber: 'BL00001042',
  pointsBalance: 1240,
  tier: 'Silver',
  pointsToNextTier: 760,
  totalEarned: 1240,
  totalSpent: 0,
  qrPayload: 'beerland:demo:BL00001042',
  updatedAt: '2026-09-18T16:42:00.000Z',
  activity: [
    {
      id: 'demo-earned',
      points: 45,
      description: 'Демонстраційне нарахування',
      createdAt: '2026-09-18T16:42:00.000Z',
    },
  ],
};

/** Clearly marked fictional address for a fresh demo install, never a real customer address. */
export const demoAddresses: Address[] = [
  {
    id: 'demo-address-1',
    label: 'Демо · Приклад адреси',
    city: 'Київ',
    street: 'Демонстраційна вулиця',
    building: '1',
    isDefault: true,
  },
];

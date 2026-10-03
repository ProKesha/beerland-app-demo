import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { z } from 'zod';
import { useSessionStore } from './session';
import { config } from '@/config/env';

export const FIRST_LAUNCH_KEY = 'beerland:first-launch:v1';
const recordSchema = z.object({
  version: z.literal(1),
  ageStatus: z.enum(['unknown', 'confirmedAdult', 'underage']),
  onboardingCompleted: z.boolean(),
  guestEntered: z.boolean(),
});
export type FirstLaunchRecord = z.infer<typeof recordSchema>;
type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;
const fresh: FirstLaunchRecord = {
  version: 1,
  ageStatus: 'unknown',
  onboardingCompleted: false,
  guestEntered: false,
};

interface FirstLaunchState extends FirstLaunchRecord {
  loaded: boolean;
  reviewing: boolean;
  error: string | null;
  setLoaded: (record: FirstLaunchRecord, error?: string) => void;
  setRecord: (record: FirstLaunchRecord) => void;
  setError: (error: string | null) => void;
  setReviewing: (reviewing: boolean) => void;
}
export const useFirstLaunchStore = create<FirstLaunchState>((set) => ({
  ...fresh,
  loaded: false,
  reviewing: false,
  error: null,
  setLoaded: (record, error) =>
    set({ ...record, loaded: true, error: error ?? null }),
  setRecord: (record) => set({ ...record, error: null }),
  setError: (error) => set({ error }),
  setReviewing: (reviewing) => set({ reviewing }),
}));

function hasItems(raw: string | null, field: string) {
  if (!raw) return false;
  try {
    const value = JSON.parse(raw);
    return (
      Array.isArray(value?.state?.[field]) && value.state[field].length > 0
    );
  } catch {
    return false;
  }
}
function parseStored(raw: string | null): unknown {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
/** Existing usage only skips the introduction. It never implies adulthood. */
export async function hasLegacyUsage(storage: Storage = AsyncStorage) {
  const [store, cart, favorites, addresses, orders, profile] =
    await Promise.all([
      storage.getItem('beerland:selected-store'),
      storage.getItem('beerland:cart'),
      storage.getItem('beerland:favorites'),
      storage.getItem('beerland:addresses'),
      storage.getItem('beerland:mock-orders:v1'),
      storage.getItem('beerland:local-profile:v1'),
    ]);
  const selected = !!(
    parseStored(store) as { state?: { storeId?: string } } | null
  )?.state?.storeId;
  const savedAddresses =
    (
      parseStored(addresses) as {
        state?: { addresses?: { id?: string }[] };
      } | null
    )?.state?.addresses?.some((address) => address.id !== 'demo-address-1') ===
    true;
  const parsedOrders = parseStored(orders);
  const savedOrders = Array.isArray(parsedOrders) && parsedOrders.length > 0;
  const customer = parseStored(profile) as {
    name?: string;
    phone?: string;
    email?: string;
  } | null;
  const savedProfile = !!(customer?.name || customer?.phone || customer?.email);
  return (
    selected ||
    savedAddresses ||
    savedOrders ||
    savedProfile ||
    hasItems(cart, 'items') ||
    hasItems(favorites, 'productIds')
  );
}

export async function hydrateFirstLaunch(storage: Storage = AsyncStorage) {
  try {
    const raw = await storage.getItem(FIRST_LAUNCH_KEY);
    const parsed = raw
      ? recordSchema.safeParse(JSON.parse(raw))
      : { success: false as const };
    if (parsed.success) {
      useFirstLaunchStore.getState().setLoaded(parsed.data);
      return parsed.data;
    }
    const legacy = await hasLegacyUsage(storage);
    const record = {
      ...fresh,
      onboardingCompleted: legacy,
      guestEntered: legacy,
    };
    useFirstLaunchStore.getState().setLoaded(record);
    return record;
  } catch {
    useFirstLaunchStore
      .getState()
      .setLoaded(
        fresh,
        'Не вдалося прочитати локальні налаштування. Підтвердіть вік ще раз.',
      );
    return fresh;
  }
}

async function save(
  update: (current: FirstLaunchRecord) => FirstLaunchRecord,
  storage: Storage = AsyncStorage,
) {
  const current = useFirstLaunchStore.getState();
  const next = recordSchema.parse(update(current));
  try {
    await storage.setItem(FIRST_LAUNCH_KEY, JSON.stringify(next));
    useFirstLaunchStore.getState().setRecord(next);
    const session = useSessionStore.getState();
    session.setStatus(
      next.ageStatus === 'confirmedAdult' && next.guestEntered
        ? session.user
          ? 'authenticated'
          : 'guest'
        : 'visitor',
    );
    return true;
  } catch {
    useFirstLaunchStore
      .getState()
      .setError(
        'Не вдалося зберегти вибір на цьому пристрої. Спробуйте ще раз.',
      );
    return false;
  }
}
export function confirmAdult(storage?: Storage) {
  return save(
    (current) => ({ ...current, ageStatus: 'confirmedAdult' }),
    storage,
  );
}
export function markUnderage(storage?: Storage) {
  return save((current) => ({ ...current, ageStatus: 'underage' }), storage);
}
export function correctUnderage(storage?: Storage) {
  return save((current) => ({ ...current, ageStatus: 'unknown' }), storage);
}
export function completeOnboarding(storage?: Storage) {
  return save(
    (current) => ({ ...current, onboardingCompleted: true }),
    storage,
  );
}
export function enterAsGuest(storage?: Storage) {
  if (
    useFirstLaunchStore.getState().ageStatus !== 'confirmedAdult' ||
    !useFirstLaunchStore.getState().onboardingCompleted
  )
    return Promise.resolve(false);
  return save((current) => ({ ...current, guestEntered: true }), storage);
}
/** Development-only test utility. It never touches cart, account, or order keys. */
export async function resetFirstLaunchForDevelopment(
  storage: Storage = AsyncStorage,
  development = config.developmentToolsEnabled,
) {
  if (!development) return false;
  try {
    await storage.setItem(FIRST_LAUNCH_KEY, JSON.stringify(fresh));
    useFirstLaunchStore.getState().setLoaded(fresh);
    useFirstLaunchStore.getState().setReviewing(false);
    useSessionStore.getState().setStatus('visitor');
    return true;
  } catch {
    useFirstLaunchStore
      .getState()
      .setError('Не вдалося скинути перший запуск.');
    return false;
  }
}

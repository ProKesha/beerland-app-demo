import type { Repositories } from './contracts';
import type { OrderStorage } from '@/services/mock/orders';
import { demoLoyalty } from '@/services/mock/account';
import { useSessionStore } from '@/stores/session';
import { useAddressStore } from '@/stores/checkout';
import { AuthError } from '@/features/auth/model';
import type { Order } from '@/types/domain';

const OWNERS_KEY = 'beerland:demo-order-owners:v1';
type Storage = OrderStorage;
const ownershipWrites = new WeakMap<Storage, Promise<unknown>>();
const requestOwnerKey = (key: string) => `request:${key}`;
function storedOwner(map: Record<string, string>, key: string) {
  return Object.hasOwn(map, key) ? map[key] : undefined;
}
function orderRequestId(order: Order): string | null {
  return 'idempotencyKey' in order && typeof order.idempotencyKey === 'string'
    ? order.idempotencyKey
    : null;
}
function orderOwner(map: Record<string, string>, order: Order) {
  const requestId = orderRequestId(order);
  const owner =
    storedOwner(map, order.id) ??
    (requestId ? storedOwner(map, requestOwnerKey(requestId)) : undefined);
  return owner === 'guest' ? undefined : owner;
}
function updateOwners<T>(storage: Storage, task: () => Promise<T>): Promise<T> {
  const next = (ownershipWrites.get(storage) ?? Promise.resolve()).then(task);
  ownershipWrites.set(
    storage,
    next.catch(() => undefined),
  );
  return next;
}
async function owners(storage?: Storage): Promise<Record<string, string>> {
  const raw = await storage?.getItem(OWNERS_KEY);
  if (!raw) {
    // An account handoff always saves a guest snapshot and an ownership ledger.
    // Losing just the ledger must not turn private receipts into guest receipts.
    if (await storage?.getItem('beerland:demo-workspace-guest:v1'))
      throw new AuthError('service');
    return {};
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new AuthError('service');
    const entries = Object.entries(value);
    if (entries.some(([, owner]) => typeof owner !== 'string' || !owner))
      throw new AuthError('service');
    return Object.fromEntries(entries) as Record<string, string>;
  } catch {
    // A corrupt privacy boundary must not make account receipts public to guests.
    throw new AuthError('service');
  }
}
export async function claimGuestOrders(
  base: Repositories,
  accountId: string,
  storage?: Storage,
) {
  if (!storage) return;
  await updateOwners(storage, async () => {
    const map = await owners(storage);
    const orders = await base.orders.list();
    for (const order of orders) {
      if (order.id.startsWith('mock-order-') && !orderOwner(map, order)) {
        map[order.id] = accountId;
        const requestId = orderRequestId(order);
        if (requestId) map[requestOwnerKey(requestId)] = accountId;
      }
    }
    await storage.setItem(OWNERS_KEY, JSON.stringify(map));
  });
}
export async function initializeOrderOwnership(storage: Storage) {
  await updateOwners(storage, async () => {
    const map = await owners(storage);
    await storage.setItem(OWNERS_KEY, JSON.stringify(map));
  });
}
function clubNumber(id: string) {
  let value = 0;
  for (const char of id) value = (value * 31 + char.charCodeAt(0)) % 100000000;
  return String(value).padStart(8, '0');
}
export function createSessionAwareRepositories(
  base: Repositories,
  storage?: Storage,
): Repositories {
  let memoryOwners: string | null = null;
  const ownershipStorage = storage ?? {
    getItem: async () => memoryOwners,
    setItem: async (_key: string, value: string) => {
      memoryOwners = value;
    },
  };
  const activeId = () =>
    useSessionStore.getState().status === 'authenticated'
      ? useSessionStore.getState().user?.id
      : null;
  return {
    ...base,
    users: {
      getCurrent: async (options) => {
        const user = useSessionStore.getState().user;
        if (activeId() && user)
          return {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            addresses: useAddressStore.getState().addresses,
          };
        return base.users.getCurrent(options);
      },
      updateCurrent: async (fields) => {
        const user = useSessionStore.getState().user;
        if (!activeId() || !user) return base.users.updateCurrent(fields);
        if (fields.phone !== user.phone) throw new AuthError('invalidPhone');
        const updated = await base.auth.updateProfile({
          name: fields.name,
          email: fields.email,
        });
        if (activeId() !== user.id) throw new AuthError('expired');
        useSessionStore.getState().setAuthenticated(updated);
        return {
          id: updated.id,
          name: updated.name,
          phone: updated.phone,
          email: updated.email,
          addresses: useAddressStore.getState().addresses,
        };
      },
    },
    loyalty: {
      getCurrent: async (options) => {
        const id = activeId();
        if (!id) return base.loyalty.getCurrent(options);
        const number = clubNumber(id);
        return {
          ...demoLoyalty,
          id: `demo-club-${number}`,
          userId: id,
          membershipNumber: `BL${number}`,
          qrPayload: `beerland:demo:BL${number}`,
        };
      },
    },
    orders: {
      create: async (input) => {
        const id = activeId();
        // Reserve ownership durably before the receipt exists, including retries.
        // Capture the initiating account before any await so logout cannot reassign it.
        await updateOwners(ownershipStorage, async () => {
          const map = await owners(ownershipStorage);
          const key = requestOwnerKey(input.idempotencyKey);
          const existing = (await base.orders.list()).find(
            (order) => orderRequestId(order) === input.idempotencyKey,
          );
          const reserved = storedOwner(map, key);
          if (
            (reserved && reserved !== (id ?? 'guest')) ||
            (existing && (orderOwner(map, existing) ?? null) !== (id ?? null))
          )
            throw new AuthError('service');
          map[key] = id ?? 'guest';
          await ownershipStorage.setItem(OWNERS_KEY, JSON.stringify(map));
        });
        const order = await base.orders.create(input);
        if (activeId() !== id) throw new AuthError('expired');
        return order;
      },
      list: async (options) => {
        const id = activeId();
        const [all, map] = await Promise.all([
          base.orders.list(options),
          owners(ownershipStorage),
        ]);
        if (activeId() !== id) return [];
        return all.filter((order) =>
          id ? orderOwner(map, order) === id : !orderOwner(map, order),
        );
      },
      getById: async (orderId, options) => {
        const id = activeId();
        const [order, map] = await Promise.all([
          base.orders.getById(orderId, options),
          owners(ownershipStorage),
        ]);
        if (activeId() !== id) return null;
        return order &&
          (id ? orderOwner(map, order) === id : !orderOwner(map, order))
          ? order
          : null;
      },
    },
  };
}

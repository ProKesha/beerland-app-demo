import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import type { Repositories } from '@/repositories/contracts';
import type { CartItem } from '@/types/domain';
import { cartPersistenceSchema, useCartStore } from '@/stores/cart';
import {
  checkoutDraftSchema,
  savedAddressesSchema,
  useAddressStore,
  useCheckoutStore,
} from '@/stores/checkout';
import { useFavoritesStore } from '@/stores/favorites';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { prepareCartTransfer } from '@/features/cart/transfer';
import { initializeOrderOwnership } from '@/repositories/sessionAware';

const OWNER_KEY = 'beerland:demo-workspace-owner:v1';
const GUEST_KEY = 'beerland:demo-workspace-guest:v1';
const accountKey = (id: string) => `beerland:demo-workspace-account:v1:${id}`;
const emptyCheckoutDraft = () => ({
  customer: { name: '', phone: '', email: '' },
  comment: '',
  paymentMethod: 'card' as const,
  attempt: null,
});
const workspaceSchema = z.object({
  cart: cartPersistenceSchema,
  favorites: z.array(z.string()),
  addresses: savedAddressesSchema,
  storeId: z.string().nullable(),
  method: z.enum(['delivery', 'pickup']),
  checkout: checkoutDraftSchema.default(emptyCheckoutDraft),
});
export type Workspace = z.infer<typeof workspaceSchema>;
const accountRecordSchema = z.object({
  workspace: workspaceSchema,
  lastGuest: workspaceSchema,
});
type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;
export function currentWorkspace(): Workspace {
  const address = useAddressStore.getState();
  const checkout = useCheckoutStore.getState();
  return {
    cart: { items: useCartStore.getState().items.map((item) => ({ ...item })) },
    favorites: [...useFavoritesStore.getState().productIds],
    addresses: {
      addresses: address.addresses.map((item) => ({ ...item })),
      selectedId: address.selectedId,
      seeded: address.seeded,
    },
    storeId: useSelectedStore.getState().storeId,
    method: useFulfillmentStore.getState().method,
    checkout: {
      customer: { ...checkout.customer },
      comment: checkout.comment,
      paymentMethod: checkout.paymentMethod,
      attempt: checkout.attempt ? { ...checkout.attempt } : null,
    },
  };
}
export function publishWorkspace(value: Workspace) {
  useCartStore.setState({ items: value.cart.items });
  useFavoritesStore.setState({ productIds: value.favorites });
  useAddressStore.setState(value.addresses);
  useSelectedStore.setState({ storeId: value.storeId });
  useFulfillmentStore.setState({ method: value.method });
  useCheckoutStore.setState({ ...value.checkout, submitting: false });
}
async function load(key: string, storage: Storage): Promise<Workspace | null> {
  const raw = await storage.getItem(key);
  if (!raw) return null;
  try {
    return workspaceSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
async function loadAccount(accountId: string, storage: Storage) {
  const raw = await storage.getItem(accountKey(accountId));
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    const record = accountRecordSchema.safeParse(value);
    if (record.success) return record.data;
    const legacy = workspaceSchema.safeParse(value);
    return legacy.success ? { workspace: legacy.data, lastGuest: null } : null;
  } catch {
    return null;
  }
}
function itemKey(item: CartItem) {
  return `${item.storeId}/${item.productId}/${item.variantId ?? 'default'}`;
}
function combineCart(first: CartItem[], second: CartItem[]): CartItem[] {
  const result = first.map((item) => ({ ...item }));
  for (const item of second) {
    const existing = result.find(
      (candidate) => itemKey(candidate) === itemKey(item),
    );
    if (existing) existing.quantity += item.quantity;
    else result.push({ ...item });
  }
  return result;
}
function newGuestItems(current: CartItem[], previous: CartItem[]) {
  return current.flatMap((item) => {
    const old = previous.find(
      (candidate) => itemKey(candidate) === itemKey(item),
    );
    const quantity = item.quantity - (old?.quantity ?? 0);
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
}
export function prepareGuestDataMerge(guest: Workspace, account: Workspace) {
  const guestStores = new Set(guest.cart.items.map((item) => item.storeId));
  const accountStores = new Set(account.cart.items.map((item) => item.storeId));
  const conflict =
    guestStores.size > 1 ||
    accountStores.size > 1 ||
    (guestStores.size > 0 &&
      accountStores.size > 0 &&
      [...guestStores][0] !== [...accountStores][0]);
  let addresses = account.addresses.addresses.map((address) => ({
    ...address,
  }));
  const guestAddressIds = new Map<string, string>();
  for (const address of guest.addresses.addresses) {
    const duplicate = addresses.find(
      (existing) =>
        existing.city.toLowerCase() === address.city.toLowerCase() &&
        existing.street.toLowerCase() === address.street.toLowerCase() &&
        existing.building.toLowerCase() === address.building.toLowerCase() &&
        (existing.apartment ?? '') === (address.apartment ?? ''),
    );
    if (duplicate) guestAddressIds.set(address.id, duplicate.id);
    else {
      let id = address.id;
      let suffix = 0;
      while (addresses.some((existing) => existing.id === id))
        id = `${address.id}-guest-${++suffix}`;
      addresses.push({ ...address, id });
      guestAddressIds.set(address.id, id);
    }
  }
  const defaultId =
    account.addresses.addresses.find((address) => address.isDefault)?.id ??
    addresses.find((address) => address.isDefault)?.id;
  if (defaultId)
    addresses = addresses.map((address) => ({
      ...address,
      isDefault: address.id === defaultId,
    }));
  const accountSelection = account.addresses.selectedId;
  const selectedId = addresses.some(
    (address) => address.id === accountSelection,
  )
    ? accountSelection
    : (guestAddressIds.get(guest.addresses.selectedId ?? '') ?? null);
  return {
    conflict,
    merged: {
      cart: {
        items: conflict
          ? account.cart.items
          : combineCart(account.cart.items, guest.cart.items),
      },
      favorites: [...new Set([...account.favorites, ...guest.favorites])],
      addresses: {
        addresses,
        selectedId,
        seeded: true,
      },
      storeId:
        account.cart.items[0]?.storeId ??
        guest.cart.items[0]?.storeId ??
        guest.storeId ??
        account.storeId,
      method: guest.method,
      checkout: account.checkout,
    } satisfies Workspace,
  };
}

/** Account and guest snapshots remain separate. Conflicts require an explicit choice. */
export async function activateDemoWorkspace(
  accountId: string,
  repositories: Repositories,
  choice?: 'separate' | 'transfer',
  storage: Storage = AsyncStorage,
): Promise<'ready' | 'conflict'> {
  await initializeOrderOwnership(storage);
  const owner = await storage.getItem(OWNER_KEY);
  if (owner === accountId) return 'ready';
  const guest =
    owner === 'guest' || !owner
      ? currentWorkspace()
      : await load(GUEST_KEY, storage);
  if (!guest) throw new Error('Guest workspace unavailable');
  if (owner === 'guest' || !owner)
    await storage.setItem(GUEST_KEY, JSON.stringify(guest));
  const accountRecord = await loadAccount(accountId, storage);
  const account = accountRecord?.workspace ?? {
    cart: { items: [] },
    favorites: [],
    addresses: { addresses: [], selectedId: null, seeded: true },
    storeId: null,
    method: guest.method,
    checkout: emptyCheckoutDraft(),
  };
  const previousGuest = accountRecord?.lastGuest;
  const guestDelta: Workspace = previousGuest
    ? {
        ...guest,
        cart: {
          items: newGuestItems(guest.cart.items, previousGuest.cart.items),
        },
        favorites: guest.favorites.filter(
          (id) => !previousGuest.favorites.includes(id),
        ),
        addresses: {
          ...guest.addresses,
          addresses: guest.addresses.addresses.filter(
            (address) =>
              !previousGuest.addresses.addresses.some(
                (previous) =>
                  JSON.stringify(previous) === JSON.stringify(address),
              ),
          ),
        },
        storeId: guest.storeId !== previousGuest.storeId ? guest.storeId : null,
        method:
          guest.method !== previousGuest.method ? guest.method : account.method,
      }
    : guest;
  const prepared = prepareGuestDataMerge(guestDelta, account);
  let requiresChoice = prepared.conflict;
  if (
    !requiresChoice &&
    account.cart.items.length &&
    prepared.merged.cart.items.length
  ) {
    const storeId = prepared.merged.cart.items[0].storeId;
    const checked = await prepareCartTransfer(
      prepared.merged.cart.items,
      storeId,
      prepared.merged.method,
      repositories,
    );
    requiresChoice = checked.quote.lines.some(
      (line) => !line.available || line.item.quantity > line.maxQuantity,
    );
  }
  if (requiresChoice && !choice) return 'conflict';
  let next: Workspace = prepared.merged;
  if (requiresChoice && choice === 'separate') {
    next = { ...next, cart: account.cart, storeId: account.storeId };
  }
  if (prepared.conflict && choice === 'transfer') {
    const storeId = account.cart.items[0]?.storeId;
    if (!storeId) throw new Error('Account cart store missing');
    const result = await prepareCartTransfer(
      guestDelta.cart.items,
      storeId,
      guest.method,
      repositories,
    );
    next = {
      ...next,
      cart: { items: combineCart(account.cart.items, result.items) },
      storeId,
    };
  }
  // Persist the prepared account snapshot before changing any visible store.
  await storage.setItem(
    accountKey(accountId),
    JSON.stringify({ workspace: next, lastGuest: guest }),
  );
  await storage.setItem(OWNER_KEY, accountId);
  publishWorkspace(next);
  return 'ready';
}

export async function leaveDemoWorkspace(
  accountId: string,
  storage: Storage = AsyncStorage,
) {
  const guest = await load(GUEST_KEY, storage);
  if (!guest) throw new Error('Guest workspace unavailable');
  const previous = await loadAccount(accountId, storage);
  await storage.setItem(
    accountKey(accountId),
    JSON.stringify({
      workspace: currentWorkspace(),
      lastGuest: previous?.lastGuest ?? guest,
    }),
  );
  await storage.setItem(OWNER_KEY, 'guest');
  publishWorkspace(guest);
}

export async function recoverGuestWorkspace(storage: Storage = AsyncStorage) {
  const owner = await storage.getItem(OWNER_KEY);
  if (owner && owner !== 'guest') await leaveDemoWorkspace(owner, storage);
}

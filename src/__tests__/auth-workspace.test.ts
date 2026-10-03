import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMockRepositories } from '@/services/mock/repositories';
import {
  createSessionAwareRepositories,
  claimGuestOrders,
} from '@/repositories/sessionAware';
import {
  activateDemoWorkspace,
  currentWorkspace,
  leaveDemoWorkspace,
  prepareGuestDataMerge,
} from '@/features/auth/workspace';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import { useAddressStore, useCheckoutStore } from '@/stores/checkout';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useSessionStore } from '@/stores/session';
import { testOrderInput } from '@/test/checkout';

const address = {
  id: 'guest-address',
  city: 'Київ',
  street: 'Тестова',
  building: '1',
};
beforeEach(async () => {
  await AsyncStorage.clear();
  useSessionStore.setState({ status: 'guest', user: null, hydrated: true });
  useCartStore.setState({ items: [] });
  useFavoritesStore.setState({ productIds: [] });
  useAddressStore.setState({ addresses: [], selectedId: null, seeded: true });
  useSelectedStore.setState({ storeId: null });
  useFulfillmentStore.setState({ method: 'pickup' });
  useCheckoutStore.getState().reset();
});
test('checkout contact drafts stay with their guest or demo account', async () => {
  const repositories = createMockRepositories();
  useCheckoutStore.getState().update({
    customer: { name: 'Гість', phone: '0501234567', email: '' },
  });
  await activateDemoWorkspace('account-1', repositories);
  expect(useCheckoutStore.getState().customer).toEqual({
    name: '',
    phone: '',
    email: '',
  });
  useCheckoutStore.getState().update({
    customer: { name: 'Акаунт 1', phone: '0501234568', email: '' },
  });
  await leaveDemoWorkspace('account-1');
  expect(useCheckoutStore.getState().customer.name).toBe('Гість');
  await activateDemoWorkspace('account-2', repositories);
  expect(useCheckoutStore.getState().customer.name).toBe('');
  await leaveDemoWorkspace('account-2');
  await activateDemoWorkspace('account-1', repositories);
  expect(useCheckoutStore.getState().customer.name).toBe('Акаунт 1');
});
test('guest cart variants, favorites, address and store survive login and logout', async () => {
  const repositories = createMockRepositories();
  useCartStore.setState({
    items: [
      {
        productId: 'product-1',
        variantId: 'default',
        storeId: 'store-1',
        quantity: 2,
      },
      {
        productId: 'product-1',
        variantId: '1000-ml',
        storeId: 'store-1',
        quantity: 1,
      },
    ],
  });
  useFavoritesStore.setState({ productIds: ['product-1'] });
  useAddressStore.setState({ addresses: [address], selectedId: address.id });
  useSelectedStore.setState({ storeId: 'store-1' });
  const guest = currentWorkspace();
  expect(await activateDemoWorkspace('account-1', repositories)).toBe('ready');
  expect(useCartStore.getState().items).toEqual(guest.cart.items);
  expect(useFavoritesStore.getState().productIds).toEqual(['product-1']);
  useFavoritesStore.setState({ productIds: ['product-1', 'product-2'] });
  await leaveDemoWorkspace('account-1');
  expect(currentWorkspace()).toEqual(guest);
  expect(await activateDemoWorkspace('account-1', repositories)).toBe('ready');
  expect(useFavoritesStore.getState().productIds).toEqual([
    'product-1',
    'product-2',
  ]);
});
test('merge deduplicates favorites and addresses and sums identical variants', () => {
  const guest = currentWorkspace();
  guest.cart.items = [
    { productId: 'product-1', variantId: 'a', storeId: 'store-1', quantity: 2 },
  ];
  guest.favorites = ['product-1', 'product-2'];
  guest.addresses.addresses = [address];
  const account = structuredClone(guest);
  account.cart.items[0].quantity = 1;
  account.favorites = ['product-2'];
  account.addresses.addresses[0].id = 'another-id';
  const result = prepareGuestDataMerge(guest, account);
  expect(result.conflict).toBe(false);
  expect(result.merged.cart.items).toEqual([
    { productId: 'product-1', variantId: 'a', storeId: 'store-1', quantity: 3 },
  ]);
  expect(result.merged.favorites).toEqual(['product-2', 'product-1']);
  expect(result.merged.addresses.addresses).toHaveLength(1);
});
test('different stores require explicit choice; failed preparation keeps original data', async () => {
  const repositories = createMockRepositories();
  useCartStore.setState({
    items: [{ productId: 'product-1', storeId: 'store-1', quantity: 1 }],
  });
  useSelectedStore.setState({ storeId: 'store-1' });
  await activateDemoWorkspace('account-1', repositories);
  useCartStore.setState({
    items: [{ productId: 'product-1', storeId: 'store-2', quantity: 2 }],
  });
  useSelectedStore.setState({ storeId: 'store-2' });
  await leaveDemoWorkspace('account-1');
  useCartStore.setState({
    items: [{ productId: 'product-1', storeId: 'store-1', quantity: 2 }],
  });
  const guest = currentWorkspace();
  expect(await activateDemoWorkspace('account-1', repositories)).toBe(
    'conflict',
  );
  expect(currentWorkspace()).toEqual(guest);
  expect(
    await activateDemoWorkspace('account-1', repositories, 'transfer'),
  ).toBe('ready');
  expect(useCartStore.getState().items).toEqual([
    { productId: 'product-1', storeId: 'store-2', quantity: 3 },
  ]);
  await leaveDemoWorkspace('account-1');
  expect(currentWorkspace()).toEqual(guest);
});
test('storage failure during login does not change guest stores', async () => {
  useFavoritesStore.setState({ productIds: ['product-1'] });
  const snapshot = currentWorkspace();
  const storage = {
    getItem: async () => null,
    setItem: async () => {
      throw Error('disk');
    },
  };
  await expect(
    activateDemoWorkspace(
      'account-1',
      createMockRepositories(),
      undefined,
      storage,
    ),
  ).rejects.toThrow();
  expect(currentWorkspace()).toEqual(snapshot);
});
test('local order ownership is isolated across demo accounts', async () => {
  const base = createMockRepositories({ storage: AsyncStorage });
  const repositories = createSessionAwareRepositories(base, AsyncStorage);
  const order = await repositories.orders.create(await testOrderInput(base));
  await claimGuestOrders(repositories, 'account-1', AsyncStorage);
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 'account-1',
      phone: '+380501234567',
      name: '',
      needsProfile: true,
      demo: true,
    },
  });
  expect((await repositories.orders.list()).map((item) => item.id)).toContain(
    order.id,
  );
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 'account-2',
      phone: '+380501234568',
      name: '',
      needsProfile: true,
      demo: true,
    },
  });
  expect(await repositories.orders.getById(order.id)).toBeNull();
  expect(await repositories.orders.list()).toEqual([]);
  useSessionStore.getState().clearAuth();
  expect(await repositories.orders.getById(order.id)).toBeNull();
});
test('profile and loyalty stay bound to the current demo account', async () => {
  const base = createMockRepositories({
    authEnabled: true,
    storage: AsyncStorage,
  });
  const repositories = createSessionAwareRepositories(base, AsyncStorage);
  let challenge = await base.auth.requestOtp('0501234567');
  const first = await base.auth.verifyOtp(challenge.id, '123456');
  useSessionStore.getState().setAuthenticated(first);
  await repositories.users.updateCurrent({
    name: 'Олена',
    phone: first.phone,
    email: '',
  });
  const firstClub = await repositories.loyalty.getCurrent();
  expect(firstClub?.userId).toBe(first.id);
  await base.auth.signOut();
  useSessionStore.getState().clearAuth();
  challenge = await base.auth.requestOtp('0501234568');
  const second = await base.auth.verifyOtp(challenge.id, '123456');
  useSessionStore.getState().setAuthenticated(second);
  expect((await repositories.users.getCurrent())?.name).toBe('');
  const secondClub = await repositories.loyalty.getCurrent();
  expect(secondClub?.userId).toBe(second.id);
  expect(secondClub?.membershipNumber).not.toBe(firstClub?.membershipNumber);
  expect((await repositories.users.getCurrent())?.phone).toBe(second.phone);
});

test('deduplicated addresses keep a valid selection and one default', () => {
  const guest = currentWorkspace();
  guest.addresses = {
    addresses: [{ ...address, isDefault: true }],
    selectedId: address.id,
    seeded: true,
  };
  const account = currentWorkspace();
  account.addresses.addresses = [
    { ...address, id: 'account-address', isDefault: true },
  ];
  const merged = prepareGuestDataMerge(guest, account).merged;
  expect(merged.addresses.selectedId).toBe('account-address');
  expect(
    merged.addresses.addresses.filter((item) => item.isDefault),
  ).toHaveLength(1);
});

test('different addresses with the same local id remain independently selectable', () => {
  const guest = currentWorkspace();
  guest.addresses = {
    addresses: [{ ...address, isDefault: true }],
    selectedId: address.id,
    seeded: true,
  };
  const account = currentWorkspace();
  account.addresses.addresses = [
    { ...address, street: 'Інша', isDefault: true },
  ];
  const merged = prepareGuestDataMerge(guest, account).merged;
  expect(merged.addresses.addresses).toHaveLength(2);
  expect(new Set(merged.addresses.addresses.map((item) => item.id)).size).toBe(
    2,
  );
  expect(
    merged.addresses.addresses.find(
      (item) => item.id === merged.addresses.selectedId,
    )?.street,
  ).toBe(address.street);
  expect(
    merged.addresses.addresses.filter((item) => item.isDefault),
  ).toHaveLength(1);
});

test('repeated login does not resurrect account deletions or reset its store', async () => {
  const repositories = createMockRepositories();
  useFavoritesStore.setState({ productIds: ['product-1'] });
  useAddressStore.setState({ addresses: [address], selectedId: address.id });
  useSelectedStore.setState({ storeId: 'store-1' });
  await activateDemoWorkspace('account-1', repositories);
  useFavoritesStore.getState().toggle('product-1');
  useAddressStore.getState().remove(address.id);
  useSelectedStore.setState({ storeId: 'store-2' });
  await leaveDemoWorkspace('account-1');
  await activateDemoWorkspace('account-1', repositories);
  expect(useFavoritesStore.getState().productIds).toEqual([]);
  expect(useAddressStore.getState().addresses).toEqual([]);
  expect(useAddressStore.getState().selectedId).toBeNull();
  expect(useSelectedStore.getState().storeId).toBe('store-2');
  await leaveDemoWorkspace('account-1');
  useFavoritesStore.getState().toggle('product-2');
  useAddressStore
    .getState()
    .save({ ...address, id: 'new-guest', street: 'Нова' });
  await activateDemoWorkspace('account-1', repositories);
  expect(useFavoritesStore.getState().productIds).toEqual(['product-2']);
  expect(useAddressStore.getState().addresses.map((item) => item.id)).toEqual([
    'new-guest',
  ]);
});

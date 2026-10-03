import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMockRepositories } from '@/services/mock/repositories';
import {
  createSessionAwareRepositories,
  claimGuestOrders,
} from '@/repositories/sessionAware';
import { useSessionStore } from '@/stores/session';
import { testOrderInput } from '@/test/checkout';

const user = {
  id: 'demo-380501234567',
  phone: '+380501234567',
  name: '',
  needsProfile: true,
  demo: true as const,
};
beforeEach(async () => {
  await AsyncStorage.clear();
  useSessionStore.setState({ status: 'guest', user: null });
});
afterEach(() => jest.restoreAllMocks());

test('an in-flight account order stays private when logout happens before it completes', async () => {
  let release!: () => void;
  let started!: () => void;
  const creating = new Promise<void>((resolve) => {
    started = resolve;
  });
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const base = createMockRepositories({
    storage: AsyncStorage,
    beforeCreate: async () => {
      started();
      await waiting;
    },
  });
  const repositories = createSessionAwareRepositories(base, AsyncStorage);
  const input = await testOrderInput(base);
  useSessionStore.getState().setAuthenticated(user);
  const pending = repositories.orders.create(input).catch(() => null);
  await creating;
  useSessionStore.getState().clearAuth();
  release();
  await pending;
  const [order] = await base.orders.list();
  expect(await repositories.orders.list()).toEqual([]);
  expect(await repositories.orders.getById(order.id)).toBeNull();
  useSessionStore.getState().setAuthenticated(user);
  expect((await repositories.orders.list()).map((item) => item.id)).toEqual([
    order.id,
  ]);
});

test('ownership persistence fails before a private receipt can enter the ledger', async () => {
  const storage = {
    getItem: AsyncStorage.getItem,
    setItem: async (key: string, value: string) => {
      if (key === 'beerland:demo-order-owners:v1') throw Error('disk');
      return AsyncStorage.setItem(key, value);
    },
  };
  const base = createMockRepositories({ storage });
  const repositories = createSessionAwareRepositories(base, storage);
  const input = await testOrderInput(base);
  useSessionStore.getState().setAuthenticated(user);
  await expect(repositories.orders.create(input)).rejects.toThrow();
  expect(await base.orders.list()).toEqual([]);
});

test('a corrupt ownership ledger fails closed instead of exposing private orders to guests', async () => {
  const base = createMockRepositories({ storage: AsyncStorage });
  const repositories = createSessionAwareRepositories(base, AsyncStorage);
  const order = await repositories.orders.create(await testOrderInput(base));
  await claimGuestOrders(repositories, user.id, AsyncStorage);
  await AsyncStorage.setItem('beerland:demo-order-owners:v1', '{bad');
  await expect(repositories.orders.list()).rejects.toThrow();
  await expect(repositories.orders.getById(order.id)).rejects.toThrow();
});

test('a different account cannot replay a private checkout idempotency key', async () => {
  const base = createMockRepositories({ storage: AsyncStorage });
  const repositories = createSessionAwareRepositories(base, AsyncStorage);
  const input = await testOrderInput(base);
  useSessionStore.getState().setAuthenticated(user);
  const order = await repositories.orders.create(input);
  useSessionStore.getState().setAuthenticated({ ...user, id: 'other-account' });
  await expect(repositories.orders.create(input)).rejects.toThrow();
  expect(await repositories.orders.getById(order.id)).toBeNull();
  useSessionStore.getState().setAuthenticated(user);
  expect((await repositories.orders.list()).map((item) => item.id)).toEqual([
    order.id,
  ]);
});

test("concurrent orders from different accounts do not overwrite each other's ownership", async () => {
  const base = createMockRepositories({ storage: AsyncStorage });
  const repositories = createSessionAwareRepositories(base, AsyncStorage);
  const input = await testOrderInput(base);
  useSessionStore.getState().setAuthenticated(user);
  const first = repositories.orders
    .create({ ...input, idempotencyKey: 'account-a' })
    .catch(() => null);
  useSessionStore.getState().setAuthenticated({ ...user, id: 'other-account' });
  const second = repositories.orders
    .create({ ...input, idempotencyKey: 'account-b' })
    .catch(() => null);
  await Promise.all([first, second]);
  const all = await base.orders.list();
  expect((await repositories.orders.list()).map((item) => item.id)).toEqual([
    all[1].id,
  ]);
  useSessionStore.getState().setAuthenticated(user);
  expect((await repositories.orders.list()).map((item) => item.id)).toEqual([
    all[0].id,
  ]);
  expect(all).toHaveLength(2);
});

test('an old order read cannot publish private data after the account changes', async () => {
  const base = createMockRepositories({ storage: AsyncStorage });
  const repositories = createSessionAwareRepositories(base, AsyncStorage);
  useSessionStore.getState().setAuthenticated(user);
  const order = await repositories.orders.create(await testOrderInput(base));
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  jest.spyOn(base.orders, 'getById').mockImplementation(async () => {
    await waiting;
    return order;
  });
  const pending = repositories.orders.getById(order.id);
  useSessionStore.getState().clearAuth();
  release();
  expect(await pending).toBeNull();
});

test('an in-flight profile update cannot restore an account after logout', async () => {
  const base = createMockRepositories({ storage: AsyncStorage });
  const repositories = createSessionAwareRepositories(base, AsyncStorage);
  useSessionStore.getState().setAuthenticated(user);
  let release!: (value: typeof user) => void;
  jest.spyOn(base.auth, 'updateProfile').mockReturnValue(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  const pending = repositories.users.updateCurrent({
    name: 'Тест',
    phone: user.phone,
  });
  useSessionStore.getState().clearAuth();
  release(user);
  await expect(pending).rejects.toMatchObject({ code: 'expired' });
  expect(useSessionStore.getState().status).toBe('guest');
  expect(useSessionStore.getState().user).toBeNull();
});

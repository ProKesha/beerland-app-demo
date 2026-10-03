import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react-native';
import type { AuthUser } from '@/features/auth/types';
import { useProductCartControl } from '@/features/product/useProductCartControl';
import type { Repositories } from '@/repositories/contracts';
import { createMockRepositories } from '@/services/mock/repositories';
import { useCartStore } from '@/stores/cart';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import { createTestWrapper } from '@/test/createTestWrapper';
import type { CartItem, Product } from '@/types/domain';

const clients: QueryClient[] = [];
let repositories: Repositories;
let products: Record<'draft' | 'packaged', Product>;

function account(id: string): AuthUser {
  return {
    id,
    phone: '+380501234567',
    name: id,
    needsProfile: false,
    demo: true,
  };
}

function cartLine(product: Product, quantity = 3): CartItem {
  return { productId: product.id, storeId: 'store-2', quantity };
}

function setup(product: Product) {
  const { client, wrapper } = createTestWrapper(repositories);
  clients.push(client);
  return renderHook(() => useProductCartControl(product, false), { wrapper });
}

beforeEach(async () => {
  useCartStore.getState().clear();
  useSelectedStore.setState({ storeId: 'store-2' });
  useSessionStore.setState({
    status: 'authenticated',
    user: account('first-owner'),
    hydrated: true,
  });
  await AsyncStorage.clear();
  repositories = createMockRepositories();
  const [draft, packaged] = await Promise.all([
    repositories.products.getById('product-1'),
    repositories.products.getById('product-8'),
  ]);
  products = { draft: draft!, packaged: packaged! };
});

afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  useCartStore.getState().clear();
  useSelectedStore.setState({ storeId: null });
  useSessionStore.setState({ status: 'guest', user: null, hydrated: false });
});

test.each([
  ['draft', -1],
  ['draft', 1],
  ['packaged', -1],
  ['packaged', 1],
] as const)(
  'a retained %s step(%s) cannot mutate another owner’s identical product and store line',
  (kind, direction) => {
    const product = products[kind];
    useCartStore.setState({ items: [cartLine(product, 1)] });
    const { result } = setup(product);
    const previousOwnerStep = result.current.step;
    const replacement = cartLine(product);

    act(() => {
      useSessionStore.getState().setAuthenticated(account('replacement-owner'));
      useCartStore.setState({ items: [replacement] });
      previousOwnerStep(direction);
    });
    expect(useCartStore.getState().items).toEqual([replacement]);
    expect(result.current.item).toEqual(replacement);

    act(() => result.current.step(direction));
    expect(useCartStore.getState().items).toEqual(
      kind === 'draft'
        ? direction < 0
          ? []
          : [{ ...replacement, variantId: '1000-ml' }]
        : [{ ...replacement, quantity: replacement.quantity + direction }],
    );
  },
);

test('callbacks captured before hydration stay inactive after restoration while current controls work', () => {
  const product = products.packaged;
  const original = cartLine(product);
  useCartStore.setState({ items: [original] });
  useSessionStore.setState({ hydrated: false });
  const { result } = setup(product);
  const beforeHydrationStep = result.current.step;
  expect(result.current.decrementDisabled).toBe(true);

  act(() => {
    useSessionStore.setState({ hydrated: true });
    beforeHydrationStep(-1);
  });
  expect(useCartStore.getState().items).toEqual([original]);
  expect(result.current.decrementDisabled).toBe(false);
  act(() => result.current.step(-1));
  expect(useCartStore.getState().items).toEqual([{ ...original, quantity: 2 }]);
});

test('callbacks captured after hydration cannot change a cart while live hydration is incomplete', () => {
  const product = products.packaged;
  const original = cartLine(product);
  useCartStore.setState({ items: [original] });
  const { result } = setup(product);
  const hydratedStep = result.current.step;

  act(() => {
    useSessionStore.setState({ hydrated: false });
    hydratedStep(-1);
    hydratedStep(1);
  });
  expect(useCartStore.getState().items).toEqual([original]);
  expect(result.current.incrementDisabled).toBe(true);
  expect(result.current.decrementDisabled).toBe(true);

  act(() => useSessionStore.setState({ hydrated: true }));
  act(() => result.current.step(1));
  expect(useCartStore.getState().items).toEqual([{ ...original, quantity: 4 }]);
});

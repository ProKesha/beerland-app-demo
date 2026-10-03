import { act, cleanup, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useFavoriteActions } from '@/features/favorites/useFavoriteActions';
import { createMockRepositories } from '@/services/mock/repositories';
import { createDiscoveryWrapper } from '@/test/createDiscoveryWrapper';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import type { Product } from '@/types/domain';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

let product: Product;

beforeEach(async () => {
  jest.clearAllMocks();
  useCartStore.setState({ items: [] });
  useFavoritesStore.setState({ productIds: [] });
  useSelectedStore.setState({ storeId: 'store-1' });
  useSessionStore.setState({ status: 'guest', user: null, hydrated: true });
  product = (await createMockRepositories().products.getById('product-1'))!;
});

afterEach(() => {
  cleanup();
  useCartStore.setState({ items: [] });
  useFavoritesStore.setState({ productIds: [] });
  useSelectedStore.setState({ storeId: null });
  useSessionStore.setState({ status: 'guest', user: null, hydrated: false });
});

function switchOwner() {
  useSessionStore.getState().setAuthenticated({
    id: 'replacement-owner',
    phone: '+380501234567',
    name: 'Олена',
    needsProfile: false,
    demo: true,
  });
}

test('an add callback retained across owner replacement cannot change the new owner cart at the same store', () => {
  const { result } = renderHook(() => useFavoriteActions('store-1', true), {
    wrapper: createDiscoveryWrapper().wrapper,
  });
  const previousOwnerAdd = result.current.add;
  const replacementItems = [
    { productId: 'product-2', storeId: 'store-1', quantity: 2 },
  ];
  act(() => {
    switchOwner();
    useCartStore.setState({ items: replacementItems });
  });

  act(() => previousOwnerAdd(product));
  expect(useCartStore.getState().items).toEqual(replacementItems);
  expect(router.push).not.toHaveBeenCalled();

  act(() => result.current.add(product));
  expect(useCartStore.getState().items).toContainEqual({
    productId: product.id,
    storeId: 'store-1',
    quantity: 1,
  });
});

test.each(['store-1', undefined])(
  'add with store %s waits for hydration before changing cart or navigating',
  (storeId) => {
    const { result } = renderHook(() => useFavoriteActions(storeId, true), {
      wrapper: createDiscoveryWrapper().wrapper,
    });
    const retainedAdd = result.current.add;
    act(() => useSessionStore.getState().setHydrated(false));

    act(() => retainedAdd(product));
    expect(useCartStore.getState().items).toEqual([]);
    expect(router.push).not.toHaveBeenCalled();
  },
);

test('a no-store callback retained from the previous owner cannot navigate the new owner', () => {
  useSelectedStore.setState({ storeId: null });
  const { result } = renderHook(() => useFavoriteActions(undefined, false), {
    wrapper: createDiscoveryWrapper().wrapper,
  });
  const previousOwnerAdd = result.current.add;
  act(() => switchOwner());

  act(() => previousOwnerAdd(product));
  expect(router.push).not.toHaveBeenCalled();
  expect(useCartStore.getState().items).toEqual([]);

  act(() => result.current.add(product));
  expect(router.push).toHaveBeenCalledWith('/stores');
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
  act,
} from 'expo-router/testing-library';
import { cleanup, within } from '@testing-library/react-native';
import RootLayout from '../../app/_layout';
import MainLayout from '../../app/(main)/_layout';
import TabsLayout from '../../app/(main)/(tabs)/_layout';
import Home from '../../app/(main)/(tabs)/index';
import Catalog from '../../app/(main)/(tabs)/catalog';
import Stores from '../../app/(main)/(tabs)/stores';
import Cart from '../../app/(main)/(tabs)/cart';
import Profile from '../../app/(main)/(tabs)/profile';
import Checkout from '../../app/(main)/checkout';
import Success from '../../app/(main)/order/success';
import { FIRST_LAUNCH_KEY, useFirstLaunchStore } from '@/stores/firstLaunch';
import { useSelectedStore } from '@/stores/selectedStore';
import { useCartStore } from '@/stores/cart';
import { useSessionStore } from '@/stores/session';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useCheckoutStore, useAddressStore } from '@/stores/checkout';
const routes = {
  _layout: RootLayout,
  '(main)/_layout': MainLayout,
  '(main)/(tabs)/_layout': TabsLayout,
  '(main)/(tabs)/index': Home,
  '(main)/(tabs)/catalog': Catalog,
  '(main)/(tabs)/stores': Stores,
  '(main)/(tabs)/cart': Cart,
  '(main)/(tabs)/profile': Profile,
  '(main)/checkout': Checkout,
  '(main)/order/success': Success,
};
beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
  const completed = {
    version: 1 as const,
    ageStatus: 'confirmedAdult' as const,
    onboardingCompleted: true,
    guestEntered: true,
  };
  await AsyncStorage.setItem(FIRST_LAUNCH_KEY, JSON.stringify(completed));
  useFirstLaunchStore.setState({
    ...completed,
    loaded: true,
    reviewing: false,
    error: null,
  });
  useSelectedStore.setState({ storeId: 'store-1' });
  useCartStore.setState({ items: [] });
  useSessionStore.setState({ hydrated: false, status: 'guest' });
  useFulfillmentStore.setState({ method: 'pickup' });
  useCheckoutStore.getState().reset();
  useAddressStore.setState({ addresses: [], selectedId: null });
});
test('real router cart → checkout → success → home resets the tab badge and checkout back returns to cart', async () => {
  const rendered = renderRouter(routes, { initialUrl: '/cart' });
  await waitFor(() => expect(useSessionStore.getState().hydrated).toBe(true));
  act(() => {
    useCartStore
      .getState()
      .addItem({ productId: 'product-1', storeId: 'store-1', quantity: 2 });
  });
  expect(
    within(screen.getByLabelText('Кошик')).getByText('2'),
  ).toBeOnTheScreen();
  fireEvent.press(await screen.findByTestId('cart-checkout'));
  await waitFor(() => expect(rendered.getPathname()).toBe('/checkout'));
  fireEvent.press(screen.getByText('До кошика'));
  await waitFor(() => expect(rendered.getPathname()).toBe('/cart'));
  await waitFor(() =>
    expect(screen.getByTestId('cart-checkout')).toBeEnabled(),
  );
  fireEvent.press(screen.getByTestId('cart-checkout'));
  await waitFor(() => expect(rendered.getPathname()).toBe('/checkout'));
  await waitFor(() => expect(screen.getByTestId('submit-order')).toBeEnabled());
  fireEvent.changeText(
    screen.getByTestId('customer-name'),
    'Тестовий покупець',
  );
  fireEvent.changeText(screen.getByTestId('customer-phone'), '0501234567');
  fireEvent.press(screen.getByTestId('age-confirmation'));
  fireEvent.press(screen.getByTestId('submit-order'));
  await waitFor(() => expect(rendered.getPathname()).toBe('/order/success'));
  expect(await screen.findByTestId('order-number')).toHaveTextContent(
    '№ BL-1042',
  );
  expect(useCartStore.getState().items).toHaveLength(0);
  fireEvent.press(screen.getByText('На головну'));
  await waitFor(() => expect(rendered.getPathname()).toBe('/'));
  expect(within(screen.getByLabelText('Кошик')).queryByText('2')).toBeNull();
});

afterEach(() => {
  cleanup();
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

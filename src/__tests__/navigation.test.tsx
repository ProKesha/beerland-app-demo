import { useCartStore } from '@/stores/cart';
import { router } from 'expo-router';
import { act, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import { useFavoritesStore } from '@/stores/favorites';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useDiscoveryPreferences } from '@/stores/discoveryPreferences';
import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';
import RootLayout from '../../app/_layout';
import MainLayout from '../../app/(main)/_layout';
import TabsLayout from '../../app/(main)/(tabs)/_layout';
import Home from '../../app/(main)/(tabs)/index';
import Catalog from '../../app/(main)/(tabs)/catalog';
import Stores from '../../app/(main)/(tabs)/stores';
import Cart from '../../app/(main)/(tabs)/cart';
import Profile from '../../app/(main)/(tabs)/profile';
import Search from '../../app/(main)/search';
import Product from '../../app/(main)/product/[id]';
import { FIRST_LAUNCH_KEY, useFirstLaunchStore } from '@/stores/firstLaunch';
const routes = {
  _layout: RootLayout,
  '(main)/_layout': MainLayout,
  '(main)/(tabs)/_layout': TabsLayout,
  '(main)/(tabs)/index': Home,
  '(main)/(tabs)/catalog': Catalog,
  '(main)/(tabs)/stores': Stores,
  '(main)/(tabs)/cart': Cart,
  '(main)/(tabs)/profile': Profile,
  '(main)/search': Search,
  '(main)/product/[id]': Product,
};
test('repeated pushes of one product keep a single back step to Catalog', async () => {
  const app = renderRouter(routes, { initialUrl: '/catalog' });
  await screen.findByTestId('catalog-product-1');
  act(() => {
    router.push('/product/product-1');
    router.push('/product/product-1');
    router.push('/product/product-1');
  });
  await screen.findByRole('header', { name: 'Світлий берег' });
  fireEvent.press(screen.getByRole('button', { name: 'Назад' }));
  await waitFor(() => expect(app.getPathname()).toBe('/catalog'));
});
test('detail quantities remain one tab badge position and back restores catalog route', async () => {
  const rendered = renderRouter(routes, { initialUrl: '/catalog' });
  fireEvent.press(
    await screen.findByRole('button', { name: 'Оберіть магазин' }),
  );
  fireEvent.press(
    screen.getByRole('button', { name: 'Обрати магазин: Beerland Демо 1' }),
  );
  fireEvent.press(
    await screen.findByRole('button', {
      name: 'Відкрити товар: Світлий берег',
    }),
  );
  await screen.findByTestId('product-add');
  fireEvent.press(screen.getByLabelText('Збільшити: Кількість'));
  fireEvent.press(screen.getByTestId('product-add'));
  fireEvent.press(screen.getByRole('button', { name: 'Назад' }));
  await waitFor(() => expect(rendered.getPathname()).toBe('/catalog'));
  expect(
    within(screen.getByTestId('cart-tab')).getByText('1'),
  ).toBeOnTheScreen();
});
beforeEach(async () => {
  await AsyncStorage.clear();
  useSelectedStore.setState({ storeId: null });
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
  useSessionStore.setState({ hydrated: true, status: 'guest' });
  useCartStore.setState({ items: [] });
  useFavoritesStore.setState({ productIds: [] });
  useFulfillmentStore.setState({ method: 'pickup' });
  useDiscoveryPreferences.setState({ recent: [], viewMode: 'grid' });
});
test('all five real tabs navigate and repository data reaches the screens', async () => {
  const rendered = renderRouter(routes, { initialUrl: '/' });
  expect(screen.getByRole('header', { name: 'Головна' })).toBeOnTheScreen();
  for (const [label, path] of [
    ['Каталог', '/catalog'],
    ['Магазини', '/stores'],
    ['Кошик', '/cart'],
    ['Профіль', '/profile'],
    ['Головна', '/'],
  ]) {
    fireEvent.press(
      label === 'Кошик'
        ? screen.getByTestId('cart-tab')
        : screen.getByLabelText(label),
    );
    await waitFor(() => expect(rendered.getPathname()).toBe(path));
    expect(
      screen.getByRole('header', {
        name:
          path === '/stores'
            ? 'Магазини Beerland'
            : path === '/profile'
              ? 'Ваш профіль'
              : label,
      }),
    ).toBeOnTheScreen();
    if (path === '/catalog')
      await waitFor(() =>
        expect(screen.getByText('32 товари')).toBeOnTheScreen(),
      );
    if (path === '/stores')
      await waitFor(() =>
        expect(
          screen.getByText('Демонстраційних магазинів: 3'),
        ).toBeOnTheScreen(),
      );
  }
});
test('catalog supports direct navigation', async () => {
  const rendered = renderRouter(routes, { initialUrl: '/catalog' });
  await waitFor(() => expect(screen.getByText('32 товари')).toBeOnTheScreen());
  expect(rendered.getPathname()).toBe('/catalog');
});

test('cart tab badge counts one position regardless of quantity and clears when empty', async () => {
  useCartStore.getState().clear();
  renderRouter(routes, { initialUrl: '/' });
  act(() => {
    useCartStore
      .getState()
      .addItem({ productId: 'product-1', storeId: 'store-1', quantity: 3 });
  });
  await waitFor(() =>
    expect(
      within(screen.getByTestId('cart-tab')).getByText('1'),
    ).toBeOnTheScreen(),
  );
  act(() => {
    useCartStore.getState().clear();
  });
  await waitFor(() =>
    expect(within(screen.getByTestId('cart-tab')).queryByText('1')).toBeNull(),
  );
});
test('Home cart action updates the real tab badge and product navigation resolves its id', async () => {
  const rendered = renderRouter(routes, { initialUrl: '/' });
  fireEvent.press(
    await screen.findByRole('button', { name: 'Оберіть магазин' }),
  );
  fireEvent.press(
    screen.getByRole('button', { name: 'Обрати магазин: Beerland Демо 1' }),
  );
  const card = within(await screen.findByTestId('popular-product-1'));
  fireEvent.press(
    card.getByRole('button', { name: 'Додати в кошик: Світлий берег' }),
  );
  await waitFor(() =>
    expect(
      within(screen.getByTestId('cart-tab')).getByText('1'),
    ).toBeOnTheScreen(),
  );
  fireEvent.press(
    card.getByRole('button', { name: 'Відкрити товар: Світлий берег' }),
  );
  await waitFor(() =>
    expect(rendered.getPathname()).toBe('/product/product-1'),
  );
  expect(
    await screen.findByRole('header', { name: 'Світлий берег' }),
  ).toBeOnTheScreen();
});
test('search submits its query and displays repository results in the search route', async () => {
  const rendered = renderRouter(routes, { initialUrl: '/search' });
  fireEvent.changeText(screen.getByLabelText('Пошук'), '  Лагер  ');
  fireEvent.press(screen.getByRole('button', { name: 'Виконати пошук' }));
  expect(await screen.findByTestId('catalog-product-1')).toBeOnTheScreen();
  expect(rendered.getPathname()).toBe('/search');
  expect(screen.queryByTestId('catalog-product-3')).toBeNull();
});
test('Home IPA category reaches real Catalog, cart badge updates and back restores discovery', async () => {
  const rendered = renderRouter(routes, { initialUrl: '/' });
  fireEvent.press(
    await screen.findByRole('button', { name: 'Оберіть магазин' }),
  );
  fireEvent.press(
    screen.getByRole('button', { name: 'Обрати магазин: Beerland Демо 1' }),
  );
  fireEvent.press(
    await screen.findByRole('button', { name: 'Категорія: IPA' }),
  );
  await waitFor(() => expect(rendered.getPathname()).toBe('/catalog'));
  const card = within(await screen.findByTestId('catalog-product-3'));
  expect(screen.queryByTestId('catalog-product-1')).toBeNull();
  fireEvent.press(
    card.getByRole('button', { name: 'Додати в кошик: Хмільний обрій' }),
  );
  await waitFor(() =>
    expect(
      within(screen.getByTestId('cart-tab')).getByText('1'),
    ).toBeOnTheScreen(),
  );
  fireEvent.press(
    card.getByRole('button', { name: 'Відкрити товар: Хмільний обрій' }),
  );
  expect(
    await screen.findByRole('header', { name: 'Хмільний обрій' }),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Назад' }));
  await waitFor(() => expect(rendered.getPathname()).toBe('/catalog'));
  expect(
    screen.getByRole('button', { name: 'Категорія: IPA', selected: true }),
  ).toBeOnTheScreen();
});
test('Home on-tap action opens its commerce group with current store offers and preserves return navigation', async () => {
  const rendered = renderRouter(routes, { initialUrl: '/' });
  fireEvent.press(
    await screen.findByRole('button', { name: 'Оберіть магазин' }),
  );
  fireEvent.press(
    screen.getByRole('button', { name: 'Обрати магазин: Beerland Демо 1' }),
  );
  fireEvent.press(
    await screen.findByRole('button', {
      name: 'Дивитися всі: Сьогодні на кранах',
    }),
  );
  expect(await screen.findByTestId('catalog-product-1')).toBeOnTheScreen();
  expect(
    screen.getByRole('button', {
      name: 'Колекція: Сьогодні на кранах',
      selected: true,
    }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole('button', { name: 'Підкатегорія: Пиво' }),
  ).toBeOnTheScreen();
  expect(screen.getByText('Beerland Демо 1')).toBeOnTheScreen();
  expect(screen.queryByTestId('catalog-product-8')).toBeNull();
  fireEvent.press(
    screen.getByRole('button', { name: 'Відкрити товар: Світлий берег' }),
  );
  await screen.findByRole('header', { name: 'Світлий берег' });
  fireEvent.press(screen.getByRole('button', { name: 'Назад' }));
  await waitFor(() => expect(rendered.getPathname()).toBe('/catalog'));
  expect(
    screen.getByRole('button', {
      name: 'Колекція: Сьогодні на кранах',
      selected: true,
    }),
  ).toBeOnTheScreen();
  act(() => router.back());
  await waitFor(() => expect(rendered.getPathname()).toBe('/'));
});

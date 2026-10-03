import { fireEvent, render, screen } from '@testing-library/react-native';
import { ShopChrome } from '@/components/common/ShopChrome';
import { ShopPageBanner } from '@/components/common/ShopPageBanner';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { router } from 'expo-router';
import { Dimensions } from 'react-native';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

test.each([320, 390, 739])(
  'mobile header at %s px opens the dedicated favorites section',
  (width) => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({
      width,
      height: 844,
      scale: 1,
      fontScale: 1,
    });
    render(<ShopChrome home />);
    fireEvent.press(screen.getByRole('button', { name: 'Відкрити обране' }));
    expect(router.push).toHaveBeenCalledWith('/favorites');
    expect(screen.getByTestId('header-favorites')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Відкрити пошук' }),
    ).toBeOnTheScreen();
  },
);

test('shared shop navigation opens key destinations', () => {
  render(<ShopChrome />);
  fireEvent.press(screen.getByRole('button', { name: 'На головну' }));
  fireEvent.press(screen.getByRole('button', { name: 'Відкрити пошук' }));
  fireEvent.press(screen.getByRole('button', { name: 'Відкрити профіль' }));
  fireEvent.press(screen.getByRole('button', { name: 'ПИВО' }));
  fireEvent.press(screen.getByRole('button', { name: 'МАГАЗИНИ' }));
  fireEvent.press(screen.getByRole('button', { name: 'ОБРАНЕ' }));
  expect(router.push).toHaveBeenNthCalledWith(1, '/');
  expect(router.push).toHaveBeenNthCalledWith(2, '/search');
  expect(router.push).toHaveBeenNthCalledWith(3, '/profile');
  expect(router.push).toHaveBeenNthCalledWith(4, '/catalog');
  expect(router.push).toHaveBeenNthCalledWith(5, '/stores');
  expect(router.push).toHaveBeenNthCalledWith(6, '/favorites');
});

test('entry chrome keeps the brand while withholding shop navigation', () => {
  render(<ShopChrome minimal />);
  expect(screen.getByRole('header', { name: 'Beerland' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Відкрити пошук' })).toBeNull();
  expect(screen.queryByTestId('header-favorites')).toBeNull();
  expect(screen.queryByRole('header', { name: 'Головна' })).toBeNull();
  expect(screen.queryByText(/Нові смаки вже/)).toBeNull();
});

test('screen can defer to an existing shop header', () => {
  render(
    <Screen chrome="none">
      <AppText>Вміст</AppText>
    </Screen>,
  );
  expect(screen.getByText('Вміст')).toBeOnTheScreen();
  expect(screen.queryByTestId('shop-chrome')).toBeNull();
});

test('page banner exposes its title as a heading', () => {
  render(<ShopPageBanner title="Кошик" subtitle="Ваші смаки" />);
  expect(screen.getByRole('header', { name: 'Кошик' })).toBeOnTheScreen();
  expect(screen.getByText('Ваші смаки')).toBeOnTheScreen();
});

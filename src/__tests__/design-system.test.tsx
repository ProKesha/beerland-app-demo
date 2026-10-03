import { useState, type PropsWithChildren } from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  AppText,
  Button,
  FilterChip,
  SearchInput,
  QuantityControl,
  TextInput,
  Price,
  Modal,
  OfflineBanner,
} from '@/components/ui';
import { EmptyState } from '@/components/common/EmptyState';
import { BitternessIndicator } from '@/features/product/components/BitternessIndicator';
import { FlavorProfile } from '@/features/product/components/FlavorProfile';
import { getBeerStyleTheme } from '@/theme/beerStyles';
import { normalizeFlavorValue } from '@/utils/scales';

function SafeAreaTestWrapper({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      {children}
    </SafeAreaProvider>
  );
}

test.each(['primary', 'secondary', 'outline', 'ghost', 'danger'] as const)(
  '%s button supports its public label and press action',
  (variant) => {
    const action = jest.fn();
    render(<Button label="Продовжити" variant={variant} onPress={action} />);
    fireEvent.press(screen.getByRole('button', { name: 'Продовжити' }));
    expect(action).toHaveBeenCalledTimes(1);
  },
);
test('filter chip changes selection semantically after interaction', () => {
  function Example() {
    const [selected, select] = useState(false);
    return (
      <FilterChip
        label="IPA"
        selected={selected}
        onPress={() => select(!selected)}
      />
    );
  }
  render(<Example />);
  expect(
    screen.getByRole('button', { name: 'IPA', selected: false }),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'IPA' }));
  expect(
    screen.getByRole('button', { name: 'IPA', selected: true }),
  ).toBeOnTheScreen();
});
test('disabled filter chip cannot change selection', () => {
  const action = jest.fn();
  render(<FilterChip label="IPA" disabled onPress={action} />);
  fireEvent.press(screen.getByRole('button', { name: 'IPA' }));
  expect(action).not.toHaveBeenCalled();
});
test('search accepts typing, submits and clears its value', () => {
  const search = jest.fn();
  function Example() {
    const [value, setValue] = useState('');
    return (
      <SearchInput value={value} onChangeText={setValue} onSearch={search} />
    );
  }
  render(<Example />);
  fireEvent.changeText(screen.getByLabelText('Пошук'), 'Лагер');
  expect(screen.getByDisplayValue('Лагер')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Виконати пошук' }));
  expect(search).toHaveBeenCalledWith('Лагер');
  fireEvent(screen.getByLabelText('Пошук'), 'submitEditing', {
    nativeEvent: { text: 'Лагер' },
  });
  expect(search).toHaveBeenCalledTimes(2);
  fireEvent.press(screen.getByRole('button', { name: 'Очистити пошук' }));
  expect(screen.getByDisplayValue('')).toBeOnTheScreen();
});
test('input associates an error with its accessible hint and exposes disabled state', () => {
  const { rerender } = render(
    <TextInput label="Телефон" errorText="Вкажіть номер повністю" />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Вкажіть номер повністю');
  expect(screen.getByLabelText('Телефон')).toHaveProp(
    'accessibilityHint',
    'Вкажіть номер повністю',
  );
  rerender(<TextInput label="Телефон" disabled />);
  expect(screen.getByLabelText('Телефон')).toBeDisabled();
});
test('input preserves focus and blur callbacks for form state', () => {
  const onFocus = jest.fn();
  const onBlur = jest.fn();
  render(<TextInput label="Ім’я" onFocus={onFocus} onBlur={onBlur} />);
  const input = screen.getByLabelText('Ім’я');
  fireEvent(input, 'focus');
  fireEvent(input, 'blur');
  expect(onFocus).toHaveBeenCalledTimes(1);
  expect(onBlur).toHaveBeenCalledTimes(1);
});
test('quantity increases, decreases and prevents changes at both limits', () => {
  function Example() {
    const [value, setValue] = useState(1);
    return (
      <QuantityControl value={value} onChange={setValue} min={1} max={2} />
    );
  }
  render(<Example />);
  expect(
    screen.getByRole('button', { name: 'Зменшити: Кількість' }),
  ).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Збільшити: Кількість' }));
  expect(screen.getByLabelText('Кількість: 2')).toBeOnTheScreen();
  expect(
    screen.getByRole('button', { name: 'Збільшити: Кількість' }),
  ).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Зменшити: Кількість' }));
  expect(screen.getByLabelText('Кількість: 1')).toBeOnTheScreen();
});
test('disabled quantity control does not emit changes', () => {
  const change = jest.fn();
  render(<QuantityControl value={2} onChange={change} disabled />);
  fireEvent.press(screen.getByRole('button', { name: 'Збільшити: Кількість' }));
  fireEvent.press(screen.getByRole('button', { name: 'Зменшити: Кількість' }));
  expect(change).not.toHaveBeenCalled();
});
test.each([
  [' IPA ', 'IPA'],
  ['Amber Ale', 'Бурштиновий ель'],
  ['porter', 'Стаут / портер'],
  ['lager', 'Лагер'],
  ['wheat', 'Пшеничне'],
  ['unknown', 'Інший стиль'],
  ['constructor', 'Інший стиль'],
  ['__proto__', 'Інший стиль'],
])('style %s resolves to %s', (style, label) => {
  expect(getBeerStyleTheme(style)).toMatchObject({
    label,
    accent: expect.any(String),
    tint: expect.any(String),
  });
});
test('empty beer style resolves safely', () =>
  expect(getBeerStyleTheme()).toEqual(getBeerStyleTheme('unknown')));
test.each([
  ['low', 'Низька'],
  ['medium', 'Середня'],
  ['high', 'Висока'],
] as const)('bitterness %s has descriptive semantics', (level, label) => {
  render(<BitternessIndicator level={level} />);
  expect(screen.getByLabelText(`Гіркота: ${label}`)).toBeOnTheScreen();
});
test('flavor profile reports values, clamps out-of-range data and preserves unknowns', () => {
  render(
    <FlavorProfile
      values={{ bitterness: 3, sweetness: 8, acidity: -2, fullness: NaN }}
    />,
  );
  expect(screen.getByLabelText('Гіркота: 3 з 5')).toBeOnTheScreen();
  expect(screen.getByLabelText('Солодкість: 5 з 5')).toBeOnTheScreen();
  expect(screen.getByLabelText('Кислинка: 0 з 5')).toBeOnTheScreen();
  expect(screen.getByLabelText('Насиченість: Немає даних')).toBeOnTheScreen();
  expect(normalizeFlavorValue(undefined)).toBeNull();
  expect(normalizeFlavorValue(Infinity)).toBeNull();
});
test.each(['cart', 'favorites', 'orders', 'search'] as const)(
  'empty state %s invokes its CTA',
  (variant) => {
    const action = jest.fn();
    render(<EmptyState variant={variant} action={{ onPress: action }} />);
    fireEvent.press(screen.getByRole('button'));
    expect(action).toHaveBeenCalledTimes(1);
  },
);
test('price identifies previous price and serving size', () => {
  render(
    <Price
      currentPrice={{ amount: 12000, currency: 'UAH' }}
      discountPrice={{ amount: 9500, currency: 'UAH' }}
      volume={{ value: 500, unit: 'ml' }}
    />,
  );
  expect(screen.getByLabelText(/Попередня ціна/)).toBeOnTheScreen();
  expect(screen.getByText(/95\s*₴/)).toBeOnTheScreen();
  expect(screen.getByText('/ 500 мл')).toBeOnTheScreen();
});
test('price ignores invalid cross-currency discounts', () => {
  render(
    <Price
      currentPrice={{ amount: 12000, currency: 'UAH' }}
      discountPrice={{ amount: 9500, currency: 'USD' }}
    />,
  );
  expect(screen.queryByLabelText(/Попередня ціна/)).toBeNull();
  expect(screen.getByText(/120\s*₴/)).toBeOnTheScreen();
});
test('modal offers a close action and hides when closed', () => {
  const close = jest.fn();
  const { rerender } = render(
    <Modal visible title="Деталі" onClose={close} />,
    { wrapper: SafeAreaTestWrapper },
  );
  fireEvent.press(screen.getByRole('button', { name: 'Закрити вікно' }));
  expect(close).toHaveBeenCalledTimes(1);
  rerender(<Modal visible={false} title="Деталі" onClose={close} />);
  expect(screen.queryByText('Деталі')).toBeNull();
});
test('modal keeps actions outside its independently scrollable content', () => {
  render(
    <Modal
      visible
      title="Фільтри"
      onClose={jest.fn()}
      footer={<Button label="Застосувати" onPress={jest.fn()} />}
    >
      <AppText>Остання опція</AppText>
    </Modal>,
    { wrapper: SafeAreaTestWrapper },
  );
  const scroll = screen.getByTestId('modal-scroll');
  expect(within(scroll).getByText('Остання опція')).toBeOnTheScreen();
  expect(within(scroll).queryByText('Застосувати')).toBeNull();
  expect(
    within(screen.getByTestId('modal-footer')).getByRole('button', {
      name: 'Застосувати',
    }),
  ).toBeOnTheScreen();
});
test('offline banner is controlled by its visibility prop', () => {
  const { rerender } = render(<OfflineBanner />);
  expect(screen.getByText(/Немає з’єднання/)).toBeOnTheScreen();
  rerender(<OfflineBanner visible={false} />);
  expect(screen.queryByText(/Немає з’єднання/)).toBeNull();
});

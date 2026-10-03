import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button, Chip } from '@/components/ui';
import { QuerySummary } from '@/components/common/QuerySummary';
test('button invokes its action and prevents it while disabled or loading', () => {
  const onPress = jest.fn();
  const { rerender } = render(<Button title="Додати" onPress={onPress} />);
  fireEvent.press(screen.getByRole('button', { name: 'Додати' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  rerender(<Button title="Додати" onPress={onPress} disabled />);
  fireEvent.press(screen.getByRole('button', { name: 'Додати' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  rerender(<Button title="Додати" onPress={onPress} loading />);
  expect(screen.getByRole('button', { name: 'Додати' })).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Додати' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
test('chip exposes selection to assistive technology', () => {
  render(<Chip title="Світле" selected />);
  expect(
    screen.getByRole('button', { name: 'Світле', selected: true }),
  ).toBeOnTheScreen();
});
test('query summary shows loading, empty, error with retry and success states', () => {
  const retry = jest.fn();
  const { rerender } = render(
    <QuerySummary pending error={false} label="Товарів" onRetry={retry} />,
  );
  expect(screen.getByRole('progressbar')).toBeOnTheScreen();
  rerender(
    <QuerySummary
      pending={false}
      error={false}
      count={0}
      label="Товарів"
      onRetry={retry}
    />,
  );
  expect(screen.getByText('Поки що нічого немає.')).toBeOnTheScreen();
  rerender(
    <QuerySummary pending={false} error label="Товарів" onRetry={retry} />,
  );
  expect(screen.getByRole('alert')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Спробувати ще раз' }));
  expect(retry).toHaveBeenCalledTimes(1);
  rerender(
    <QuerySummary
      pending={false}
      error={false}
      count={10}
      label="Товарів"
      onRetry={retry}
    />,
  );
  expect(screen.getByText('Товарів: 10')).toBeOnTheScreen();
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import { ProductCard } from '@/features/product/components/ProductCard';
import { ProductImage } from '@/features/product/components/ProductImage';
import { createMockRepositories } from '@/services/mock/repositories';
import type { Product } from '@/types/domain';
let product: Product;
beforeEach(async () => {
  product = (await createMockRepositories().products.list())[0];
});
test.each(['standard', 'compact'] as const)(
  '%s product card renders repository data and delegates actions',
  (variant) => {
    const favorite = jest.fn();
    const add = jest.fn();
    render(
      <ProductCard
        product={product}
        variant={variant}
        onFavorite={favorite}
        onAddToCart={add}
      />,
    );
    expect(screen.getByText(product.name)).toBeOnTheScreen();
    expect(screen.getByText('Лагер')).toBeOnTheScreen();
    expect(screen.getByText(/IBU/)).toBeOnTheScreen();
    expect(screen.getByText('/ 500 мл')).toBeOnTheScreen();
    fireEvent.press(
      screen.getByRole('button', { name: `Додати в обране: ${product.name}` }),
    );
    expect(favorite).toHaveBeenCalledWith(product);
    fireEvent.press(
      screen.getByRole('button', { name: `Додати в кошик: ${product.name}` }),
    );
    expect(add).toHaveBeenCalledWith(product);
  },
);
test('favorited product exposes selection and removal action', () => {
  const favorite = jest.fn();
  render(
    <ProductCard
      product={product}
      isFavorited
      onFavorite={favorite}
      onAddToCart={jest.fn()}
    />,
  );
  const button = screen.getByRole('button', {
    name: `Видалити з обраного: ${product.name}`,
    selected: true,
  });
  fireEvent.press(button);
  expect(favorite).toHaveBeenCalledWith(product);
});
test('unavailable and loading products prevent add-to-cart', () => {
  const add = jest.fn();
  const { rerender } = render(
    <ProductCard
      product={{ ...product, availability: 'unavailable' }}
      onFavorite={jest.fn()}
      onAddToCart={add}
    />,
  );
  fireEvent.press(
    screen.getByRole('button', { name: `Додати в кошик: ${product.name}` }),
  );
  expect(add).not.toHaveBeenCalled();
  rerender(
    <ProductCard
      product={product}
      adding
      onFavorite={jest.fn()}
      onAddToCart={add}
    />,
  );
  expect(
    screen.getByRole('button', { name: `Додати в кошик: ${product.name}` }),
  ).toBeDisabled();
});
test('snacks do not acquire invented ABV or IBU data', async () => {
  const snack = (await createMockRepositories().products.list()).find(
    (item) => item.category === 'snacks',
  )!;
  render(
    <ProductCard
      product={snack}
      onFavorite={jest.fn()}
      onAddToCart={jest.fn()}
    />,
  );
  expect(screen.queryByText(/IBU|%/)).toBeNull();
});
test('missing product image provides a named fallback', () => {
  render(<ProductImage label="Лагер" />);
  expect(screen.getByLabelText('Лагер: фото поки немає')).toBeOnTheScreen();
});
test('product image transitions from loading to image, and falls back on errors', () => {
  const { rerender } = render(
    <ProductImage
      label="Лагер"
      source={{ uri: 'https://example.com/beer.png' }}
    />,
  );
  expect(screen.getByRole('progressbar')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Лагер')).toBeNull();
  fireEvent(
    screen.getByLabelText('Лагер', { includeHiddenElements: true }),
    'load',
  );
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(screen.getByLabelText('Лагер')).toBeOnTheScreen();
  rerender(
    <ProductImage
      label="IPA"
      source={{ uri: 'https://example.com/ipa.png' }}
    />,
  );
  expect(screen.getByRole('progressbar')).toBeOnTheScreen();
  fireEvent(
    screen.getByLabelText('IPA', { includeHiddenElements: true }),
    'error',
  );
  expect(screen.getByLabelText('IPA: фото поки немає')).toBeOnTheScreen();
});

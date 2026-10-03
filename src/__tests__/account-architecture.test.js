/* global test, expect, __dirname */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(dir, entry.name))
        : [path.join(dir, entry.name)],
    );
}
test('account screens never import mock fixtures, storage drivers or create new cart/favorites/address stores', () => {
  const paths = ['profile', 'loyalty', 'favorites', 'orders']
    .flatMap((feature) => files(path.join(root, 'src/features', feature)))
    .filter(
      (file) =>
        /\.tsx?$/.test(file) && !file.endsWith('getOrderStaticParams.ts'),
    );
  for (const file of paths) {
    const source = fs.readFileSync(file, 'utf8');
    expect(source).not.toMatch(
      /from ['"].*(services\/mock|fixtures|async-storage|stores\/persistence)/,
    );
    expect(source).not.toMatch(/from ['"]zustand(?:\/[^'"]*)?['"]/);
  }
});
test('Home repeat action delegates to shared reorder hook', () => {
  const source = fs.readFileSync(
    path.join(root, 'src/features/home/hooks/useHomeActions.ts'),
    'utf8',
  );
  expect(source).toContain('useReorder');
  expect(source).toContain('repeat.reorder(order)');
  expect(source).not.toContain('order.items.forEach(addItem)');
});

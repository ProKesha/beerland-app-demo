/* global test, expect, __dirname */
import fs from 'node:fs';
import path from 'node:path';
function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(file)
      : /\.tsx?$/.test(file)
        ? [file]
        : [];
  });
}
test('cart, checkout and orders never import mock fixtures or adapters', () => {
  for (const feature of ['cart', 'checkout', 'orders']) {
    for (const file of sourceFiles(
      path.join(__dirname, '../features', feature),
    )) {
      expect(fs.readFileSync(file, 'utf8')).not.toMatch(
        /from\s+['"][^'"]*(?:services\/mock|fixtures)[^'"]*['"]/,
      );
    }
  }
});

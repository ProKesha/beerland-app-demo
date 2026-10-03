/* global test, expect, __dirname */
const fs = require('fs');
const path = require('path');
test('stores UI accesses data through repositories, never fixtures', () => {
  const directory = path.join(__dirname, '../features/stores');
  const files = fs
    .readdirSync(directory, { recursive: true })
    .filter((file) => /\.tsx?$/.test(file));
  for (const file of files)
    expect(fs.readFileSync(path.join(directory, file), 'utf8')).not.toMatch(
      /from\s+['"][^'"]*(?:fixtures|services\/mock)/,
    );
});

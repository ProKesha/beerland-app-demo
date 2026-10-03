const { test, expect } = require('@jest/globals');
const { Buffer } = require('node:buffer');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  prepareStaticHostAssets,
} = require('../../scripts/prepare-static-host-assets.cjs');
const projectRoot = path.dirname(
  path.dirname(require.resolve('../../scripts/prepare-static-host-assets.cjs')),
);

test('exports package assets to a Netlify-safe path and removes stale copies', async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'beerland-assets-'));
  const relative = path.join('@expo-google-fonts', 'lora', 'Lora.ttf');
  const source = path.join(output, 'assets', 'node_modules', relative);
  const target = path.join(output, 'host-assets', relative);
  try {
    await fs.mkdir(path.dirname(source), { recursive: true });
    await fs.writeFile(source, Buffer.from([0, 1, 2, 255]));
    await prepareStaticHostAssets(output);
    expect(await fs.readFile(target)).toEqual(Buffer.from([0, 1, 2, 255]));

    const stale = path.join(output, 'host-assets', 'stale.ttf');
    await fs.writeFile(stale, 'old');
    await prepareStaticHostAssets(output);
    await expect(fs.stat(stale)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await fs.readFile(target)).toEqual(Buffer.from([0, 1, 2, 255]));

    const redirects = await fs.readFile(
      path.join(projectRoot, 'public/_redirects'),
      'utf8',
    );
    expect(redirects).toMatch(
      /^\/assets\/node_modules\/\* \/host-assets\/:splat 200$/m,
    );
  } finally {
    await fs.rm(output, { recursive: true, force: true });
  }
});

test('serves the actual Feather font from the short path before the package rewrite', async () => {
  const featherSource = await fs.readFile(
    path.join(
      projectRoot,
      'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf',
    ),
  );
  const featherPublic = await fs.readFile(
    path.join(projectRoot, 'public/Feather.ttf'),
  );
  expect(featherPublic).toEqual(featherSource);
  const redirects = await fs.readFile(
    path.join(projectRoot, 'public/_redirects'),
    'utf8',
  );
  const featherRewrite =
    '/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ca4b48e04dc1ce10bfbddb262c8b835f.ttf /Feather.ttf 200';
  const packageRewrite = '/assets/node_modules/* /host-assets/:splat 200';
  expect(redirects.indexOf(featherRewrite)).toBeGreaterThanOrEqual(0);
  expect(redirects.indexOf(featherRewrite)).toBeLessThan(
    redirects.indexOf(packageRewrite),
  );
});

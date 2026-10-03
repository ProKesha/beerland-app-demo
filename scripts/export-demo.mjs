import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { prepareStaticHostAssets } from './prepare-static-host-assets.cjs';
const require = createRequire(import.meta.url);
const child = spawnSync(
  process.execPath,
  [
    require.resolve('expo/bin/cli'),
    'export',
    '--platform',
    'web',
    '--clear',
    ...process.argv.slice(2),
  ],
  {
    env: {
      ...process.env,
      EXPO_PUBLIC_APP_ENV: 'demo',
      EXPO_PUBLIC_DEMO_AUTH: '0',
      EXPO_PUBLIC_DESIGN_SYSTEM: '0',
    },
    stdio: 'inherit',
  },
);
if (child.error) throw child.error;
if (child.status !== 0) process.exit(child.status ?? 1);
const outputArg = process.argv.indexOf('--output-dir');
const equalsArg = process.argv.find((value) =>
  value.startsWith('--output-dir='),
);
const outputDirectory =
  outputArg >= 0
    ? process.argv[outputArg + 1]
    : (equalsArg?.slice('--output-dir='.length) ?? 'dist');
await prepareStaticHostAssets(path.resolve(outputDirectory));
console.log('Prepared static host assets outside node_modules paths.');

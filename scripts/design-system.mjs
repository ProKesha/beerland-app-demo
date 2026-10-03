import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const exporting = process.argv.includes('--export');
const args = exporting
  ? [
      'export',
      '--dev',
      '--clear',
      '--platform',
      'web',
      '--output-dir',
      '.expo/design-system-export',
    ]
  : ['start', '--clear', '--web', '--port', '8081'];
const child = spawnSync(
  process.execPath,
  [require.resolve('expo/bin/cli'), ...args],
  {
    env: {
      ...process.env,
      EXPO_PUBLIC_APP_ENV: 'development',
      EXPO_PUBLIC_DESIGN_SYSTEM: '1',
    },
    stdio: 'inherit',
  },
);
if (child.error) throw child.error;
process.exit(child.status ?? 1);

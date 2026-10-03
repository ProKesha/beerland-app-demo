const fs = require('node:fs/promises');
const path = require('node:path');

async function prepareStaticHostAssets(outputDirectory) {
  const source = path.join(outputDirectory, 'assets', 'node_modules');
  const target = path.join(outputDirectory, 'host-assets');
  const entry = await fs.stat(source);
  if (!entry.isDirectory()) throw new Error('Expected exported package assets');
  await fs.rm(target, { recursive: true, force: true });
  await fs.cp(source, target, { recursive: true });
}

module.exports = { prepareStaticHostAssets };

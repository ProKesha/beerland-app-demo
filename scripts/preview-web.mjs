import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => args[args.indexOf(name) + 1] ?? fallback;
const root = path.resolve(
  args.includes('--directory') ? option('--directory', 'dist') : 'dist',
);
const port = Number(
  args.includes('--port') ? option('--port', '4173') : '4173',
);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('Invalid preview port');
await stat(root).catch(() => {
  throw new Error('Export Web first: npm run export:demo');
});

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(request.url, 'http://localhost').pathname,
    );
  } catch {
    response.writeHead(400).end();
    return;
  }
  const safePath = path.resolve(root, `.${pathname}`);
  if (safePath !== root && !safePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(400).end();
    return;
  }
  const relative = pathname.replace(/^\/+|\/+$/g, '');
  const candidates =
    safePath === root
      ? [path.join(root, 'index.html')]
      : [safePath, `${safePath}.html`, path.join(safePath, 'index.html')];
  const dynamic = /^(product|store|order)\/[A-Za-z0-9-]{1,80}$/.exec(relative);
  if (dynamic) candidates.push(path.join(root, dynamic[1], 'local.html'));
  let file;
  for (const candidate of candidates) {
    if (
      await stat(candidate)
        .then((entry) => entry.isFile())
        .catch(() => false)
    ) {
      file = candidate;
      break;
    }
  }
  const status = file ? 200 : 404;
  file ??= path.join(root, '+not-found.html');
  try {
    const body = await readFile(file);
    response.writeHead(status, {
      'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Beerland demo preview: http://127.0.0.1:${port}`);
});
process.on('SIGINT', () => server.close());
process.on('SIGTERM', () => server.close());

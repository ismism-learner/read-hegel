// Minimal static server for the reading site (no dependencies).
//   node scripts/serve.mjs [--port 8788] [--root web] [--open]
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const argOf = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const PORT = Number(argOf('port', process.env.PORT || 8788));
const HOST = argOf('host', '127.0.0.1');
const ROOT = path.resolve(argOf('root', 'web'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt']);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, path.normalize(rel).replace(/^([/\\])+/, ''));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }

    let stat;
    try { stat = await fsp.stat(file); } catch { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 ' + rel); return; }
    if (stat.isDirectory()) { res.writeHead(302, { location: rel + '/' }).end(); return; }

    const ext = path.extname(file).toLowerCase();
    const type = TYPES[ext] || 'application/octet-stream';
    const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    if (req.headers['if-none-match'] === etag) { res.writeHead(304).end(); return; }

    const headers = {
      'content-type': type,
      etag,
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    };
    const accept = req.headers['accept-encoding'] || '';
    const body = await fsp.readFile(file);
    if (COMPRESSIBLE.has(ext) && body.length > 1024 && /\bgzip\b/.test(accept)) {
      const gz = zlib.gzipSync(body, { level: 6 });
      headers['content-encoding'] = 'gzip';
      headers['content-length'] = String(gz.length);
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : gz);
    } else {
      headers['content-length'] = String(body.length);
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : body);
    }
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end('500 ' + err.message);
  }
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}/`;
  console.log(`Hegel Werke reader: ${url}  (root: ${ROOT})`);
  if (args.includes('--open')) {
    const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
    import('node:child_process').then(({ spawn }) => spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true }).unref());
  }
});

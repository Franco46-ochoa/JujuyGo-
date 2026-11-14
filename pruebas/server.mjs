// Server estático mínimo para el prototipo (puerto 8790).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tipos = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml'
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const f = normalize(join(root, p));
    if (!f.startsWith(normalize(root))) { res.writeHead(403); return res.end(); }
    const data = await readFile(f);
    res.writeHead(200, { 'content-type': tipos[extname(f)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('no encontrado');
  }
}).listen(8790, () => console.log('server en http://localhost:8790'));

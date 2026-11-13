import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Elect/orca/projects/JujuyGo/frontend/package.json');
const { chromium } = require('playwright-core');
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2' };
const raiz = resolve(process.argv[2]);
const servidor = createServer(async (req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let archivo = join(raiz, ruta);
  try { if (!(await stat(archivo)).isFile()) throw 0; } catch { archivo = join(raiz, 'index.html'); }
  res.writeHead(200, { 'content-type': tipos[extname(archivo)] || 'application/octet-stream' });
  res.end(await readFile(archivo));
});
await new Promise(ok => servidor.listen(4327, ok));
const navegador = await chromium.launch({ channel: 'chrome' });
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route('https://jujuy-go.vercel.app/api/**', async route => {
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': 'http://localhost:4327' } });
  const r = await route.fetch();
  await route.fulfill({ response: r, headers: { ...r.headers(), 'access-control-allow-origin': 'http://localhost:4327' } });
});
const pagina = await ctx.newPage();
await pagina.goto('http://localhost:4327/', { waitUntil: 'networkidle' });
await pagina.waitForTimeout(3000);
const info = await pagina.evaluate(() => new Promise(res => {
  new PerformanceObserver(l => { const e = l.getEntries(); const ult = e[e.length-1]; if (ult) res({ ms: Math.round(ult.startTime), tag: ult.element?.tagName, clase: String(ult.element?.className).slice(0,60), url: ult.url?.split("/").slice(-1)[0] }); }).observe({ type: "largest-contentful-paint", buffered: true }); setTimeout(() => res(null), 5000); return;
  const ult = entradas[entradas.length - 1];
  res(ult ? { ms: Math.round(ult.startTime), tag: ult.element?.tagName, clase: ult.element?.className?.slice(0, 60), url: ult.url?.split('/').slice(-1)[0] } : null);
}));
console.log(JSON.stringify(info));
servidor.close(); await navegador.close();

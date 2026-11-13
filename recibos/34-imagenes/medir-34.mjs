// Medición del slice 34: bytes de imagen transferidos, LCP en 390, hero pedido
// una sola vez, y capturas de nitidez (hero, tarjetas de zona, thumbs).
// Uso: node medir-34.mjs <dirDist> <dirSalida> [puerto]
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [dist, salida, puertoArg] = process.argv.slice(2);
if (!dist || !salida) { console.error('uso: node medir-34.mjs <dirDist> <dirSalida> [puerto]'); process.exit(2); }
const puerto = Number(puertoArg || 4324);
const aqui = dirname(fileURLToPath(import.meta.url));
const require = createRequire(process.env.PW_DESDE || join(aqui, '..', '..', 'frontend', 'package.json'));
const { chromium } = require('playwright-core');

const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2' };
const raiz = resolve(dist);
const servidor = createServer(async (req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let archivo = join(raiz, ruta);
  try { if (!(await stat(archivo)).isFile()) throw 0; } catch { archivo = join(raiz, 'index.html'); }
  res.writeHead(200, { 'content-type': tipos[extname(archivo)] || 'application/octet-stream' });
  res.end(await readFile(archivo));
});
await new Promise(ok => servidor.listen(puerto, ok));
const base = `http://localhost:${puerto}`;
await mkdir(salida, { recursive: true });

let navegador;
for (const channel of ['chrome', 'msedge']) {
  try { navegador = await chromium.launch({ channel }); break; } catch {}
}
if (!navegador) throw new Error('no encontré Chrome ni Edge para playwright-core');

// La API de producción solo permite el origen https://jujuygo-web.vercel.app:
// se reenvía agregando CORS para el origen local. Datos sin tocar.
const nuevoContexto = async opciones => {
  const ctx = await navegador.newContext(opciones);
  await ctx.route('https://jujuy-go.vercel.app/api/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': base, 'access-control-allow-headers': 'Content-Type, Authorization', 'access-control-allow-methods': 'GET, POST, OPTIONS' } });
    const r = await route.fetch();
    await route.fulfill({ response: r, headers: { ...r.headers(), 'access-control-allow-origin': base } });
  });
  return ctx;
};

const resultado = {
  base,
  fecha: new Date().toISOString(),
  metodo: 'performance.getEntriesByType("resource"): transferSize por recurso con content-type/URL de imagen. LCP vía PerformanceObserver. Sin scroll = tras networkidle; con scroll = scroll completo en pasos hasta el fondo.',
  mediciones: {},
  consola: [],
};

// Bytes de imagen transferidos + cuántas veces se pidió el hero.
const resumenImagenes = () => {
  const entradas = performance.getEntriesByType('resource')
    .filter(e => /\.(jpe?g|webp|png|svg|avif)(\?|$)/i.test(e.name));
  const imgs = entradas.map(e => ({ url: e.name.split('/').slice(-1)[0], bytes: e.transferSize || e.encodedBodySize || 0 }));
  return {
    totalBytes: imgs.reduce((a, i) => a + i.bytes, 0),
    archivos: imgs,
    heroPeticiones: imgs.filter(i => /purmamarca/i.test(i.url)).length,
    heroArchivos: imgs.filter(i => /purmamarca/i.test(i.url)).map(i => `${i.url} (${i.bytes}b)`),
  };
};

const scrollCompleto = async pagina => {
  await pagina.evaluate(async () => {
    const paso = Math.round(innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight + innerHeight; y += paso) {
      scrollTo(0, y);
      await new Promise(r => setTimeout(r, 160));
    }
    scrollTo(0, document.body.scrollHeight);
  });
  await pagina.waitForLoadState('networkidle');
};

const lcpEnPagina = () => new Promise(res => {
  let lcp = 0;
  new PerformanceObserver(lista => {
    const entradas = lista.getEntries();
    if (entradas.length) lcp = entradas[entradas.length - 1].startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  setTimeout(() => res(Math.round(lcp)), 6000);
});

async function medir(nombre, url, viewport, { scroll = false, capturas = [] } = {}) {
  const contexto = await nuevoContexto({ viewport, reducedMotion: 'reduce' });
  const pagina = await contexto.newPage();
  pagina.on('console', m => { if (m.type() === 'error') resultado.consola.push(`${nombre}: ${m.text()}`); });
  await pagina.goto(`${base}${url}`, { waitUntil: 'networkidle' });
  // Esperar a que Angular termine de renderizar antes de evaluar (si no, el
  // contexto se destruye con la navegación del router).
  await pagina.locator('img').first().waitFor({ timeout: 30000 });
  await pagina.waitForTimeout(500);
  const clave = `${nombre}-${viewport.width}`;
  const sinScroll = await pagina.evaluate(resumenImagenes);
  const lcp = await pagina.evaluate(lcpEnPagina);
  let conScroll = null;
  if (scroll) {
    await scrollCompleto(pagina);
    conScroll = await pagina.evaluate(resumenImagenes);
  }
  for (const [sel, archivo] of capturas) {
    const el = pagina.locator(sel).first();
    if (await el.count()) {
      await el.scrollIntoViewIfNeeded();
      await pagina.waitForTimeout(350);
      await el.screenshot({ path: join(salida, archivo) });
    }
  }
  await pagina.screenshot({ path: join(salida, `${clave}.png`) });
  resultado.mediciones[clave] = { url, viewport, sinScroll, conScroll, lcpMs: lcp };
  console.log(`${clave}: sinScroll=${(sinScroll.totalBytes / 1024).toFixed(0)}kB` +
    (conScroll ? ` conScroll=${(conScroll.totalBytes / 1024).toFixed(0)}kB` : '') +
    ` hero=${sinScroll.heroPeticiones} petición(es) [${sinScroll.heroArchivos.join(', ')}] lcp=${lcp}ms`);
  await contexto.close();
}

await medir('home', '/', { width: 390, height: 844 }, {
  scroll: true,
  capturas: [
    ['.hero', 'captura-hero-390.png'],
    ['.zone-collage', 'captura-zonas-390.png'],
    ['.place-row', 'captura-thumb-390.png'],
  ],
});
await medir('home', '/', { width: 1440, height: 900 }, {
  scroll: true,
  capturas: [
    ['.hero', 'captura-hero-1440.png'],
    ['.zone-collage', 'captura-zonas-1440.png'],
    ['.place-row', 'captura-thumb-1440.png'],
  ],
});
await medir('detalle', '/lugares/cerro-siete-colores', { width: 390, height: 844 }, {
  capturas: [['.detail-hero', 'captura-detalle-390.png']],
});
await medir('detalle', '/lugares/cerro-siete-colores', { width: 1440, height: 900 }, {
  capturas: [['.detail-hero', 'captura-detalle-1440.png']],
});

await writeFile(join(salida, 'medicion.json'), JSON.stringify(resultado, null, 2));
servidor.close();
await navegador.close();
console.log(`\n→ ${join(salida, 'medicion.json')}`);

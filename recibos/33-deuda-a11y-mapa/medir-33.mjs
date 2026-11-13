// Medición del slice 33: contraste en hover de pins/clusters del mapa y
// rectángulos de los pins de recorrido (.yapa-route-pin) sin intersección.
// Adaptado de recibos/32-contraste-responsive-visual/medir-32.mjs.
// Uso: node medir-33.mjs <dirDist> <dirSalida> [puerto]
//   dirDist: carpeta con index.html del build (p. ej. frontend/dist/frontend/browser)
//   dirSalida: donde se escriben medicion.json y las capturas (antes/ o despues/)
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [dist, salida, puertoArg] = process.argv.slice(2);
if (!dist || !salida) { console.error('uso: node medir-33.mjs <dirDist> <dirSalida> [puerto]'); process.exit(2); }
const puerto = Number(puertoArg || 4322);
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
// La API de producción solo permite el origen https://jujuygo-web.vercel.app: las
// respuestas reales se reenvían agregando CORS para el origen local. Datos sin tocar.
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
  metodo: 'Cálculo WCAG 2.x sobre colores pintados: color computado del texto (alfa × opacidad acumulada) compuesto sobre la pila de background-color de los ancestros (lienzo blanco). Hover real con playwright hover().',
  hover: [],
  pins: {},
  consola: [],
};

// Se inyecta en la página: devuelve la medición de contraste de un elemento.
const medirEnPagina = el => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const sobre = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = c => { const t = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * t(c.r) + 0.7152 * t(c.g) + 0.0722 * t(c.b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const cadena = []; for (let n = el; n && n.nodeType === 1; n = n.parentElement) cadena.push(n);
  let opacidad = 1;
  for (const n of cadena) opacidad *= Number(getComputedStyle(n).opacity);
  let fondo = { r: 255, g: 255, b: 255, a: 1 };
  for (const n of [...cadena].reverse()) { const bg = parse(getComputedStyle(n).backgroundColor); if (bg && bg.a > 0) fondo = sobre(bg, fondo); }
  const s = getComputedStyle(el);
  const texto = parse(s.color);
  const pintado = sobre({ ...texto, a: texto.a * opacidad }, fondo);
  const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  return { ratio: Math.round(ratio(pintado, fondo) * 100) / 100, texto: hex(pintado), fondo: hex(fondo), hover: el.matches(':hover'), contenido: (el.innerText || el.value || '').trim().slice(0, 40) };
};

async function contrasteHover(pagina, fila, locator) {
  const el = locator.first();
  if (!(await el.count())) { resultado.hover.push({ fila, error: 'no encontrado' }); return; }
  await el.scrollIntoViewIfNeeded();
  await el.hover();
  await pagina.waitForTimeout(300);
  const m = await el.evaluate(medirEnPagina);
  resultado.hover.push({ fila, minimo: 4.5, ...m, cumple: m.hover && m.ratio >= 4.5 });
}

// ── Home 1440: hover real sobre un cluster y un pin individual ──
{
  const contexto = await nuevoContexto({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const pagina = await contexto.newPage();
  pagina.on('console', m => { if (m.type() === 'error') resultado.consola.push(`home: ${m.text()}`); });
  await pagina.goto(`${base}/`, { waitUntil: 'networkidle' });
  await pagina.locator('.yapa-cluster-pin, .yapa-marker-pin').first().waitFor({ timeout: 30000 });
  await pagina.locator('.leaflet-container').scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(1200);

  await contrasteHover(pagina, '.yapa-cluster-pin:hover', pagina.locator('.yapa-cluster-pin'));
  await contrasteHover(pagina, '.yapa-marker-pin:hover', pagina.locator('.yapa-marker-pin'));
  // Controles de zoom y link de popup comparten la misma regla de hover.
  await contrasteHover(pagina, '.leaflet-bar a:hover (zoom +)', pagina.locator('.leaflet-bar a').first());

  // Captura con el hover visible sobre el primer cluster (o pin) del mapa.
  const pin = pagina.locator('.yapa-cluster-pin, .yapa-marker-pin').first();
  await pin.hover();
  await pagina.waitForTimeout(300);
  await pagina.screenshot({ path: join(salida, 'home-1440-hover.png'), fullPage: false });
  await contexto.close();
}

// ── Cómo llegar: pins de recorrido sin intersección en 1440 y 390 ──
// cerro-siete-colores tiene el único punto tipo 'cruce' del seed
// (purmamarca-cruce). pucara-de-tilcara es la segunda ruta con parada
// intermedia (tipo 'parada' → .yapa-route-stop).
const rutas = ['cerro-siete-colores', 'pucara-de-tilcara'];
for (const ruta of rutas) for (const [nombre, ancho, alto] of [['1440', 1440, 900], ['390', 390, 844]]) {
  const contexto = await nuevoContexto({ viewport: { width: ancho, height: alto }, reducedMotion: 'reduce' });
  const pagina = await contexto.newPage();
  pagina.on('console', m => { if (m.type() === 'error') resultado.consola.push(`como-llegar ${ruta} ${nombre}: ${m.text()}`); });
  await pagina.goto(`${base}/como-llegar/${ruta}`, { waitUntil: 'networkidle' });
  await pagina.locator('.yapa-route-pin').first().waitFor({ timeout: 30000 });
  await pagina.waitForTimeout(1500);
  resultado.pins[`${ruta}-${nombre}`] = await pagina.evaluate(() => {
    const mapa = document.querySelector('.leaflet-container').getBoundingClientRect();
    const rects = [...document.querySelectorAll('.yapa-route-pin')].map(p => {
      const r = p.getBoundingClientRect();
      const recortado = p.scrollWidth > p.clientWidth + 1 || p.scrollHeight > p.clientHeight + 1;
      const dentroDelMapa = r.left >= mapa.left - 0.5 && r.right <= mapa.right + 0.5 && r.top >= mapa.top - 0.5 && r.bottom <= mapa.bottom + 0.5;
      const clases = p.className;
      return { texto: p.textContent.trim(), clases, rect: { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }, recortado, dentroDelMapa };
    });
    const choca = (a, b) => !(a.rect.r <= b.rect.l || b.rect.r <= a.rect.l || a.rect.b <= b.rect.t || b.rect.b <= a.rect.t);
    const intersecciones = [];
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++)
        if (choca(rects[i], rects[j])) intersecciones.push([rects[i].texto, rects[j].texto]);
    return { pins: rects, intersecciones, ok: !intersecciones.length && rects.every(p => !p.recortado && p.dentroDelMapa) };
  });
  await pagina.locator('.leaflet-container').scrollIntoViewIfNeeded();
  await pagina.screenshot({ path: join(salida, `como-llegar-mapa-${ruta}-${nombre}.png`), fullPage: false });
  await pagina.locator('.leaflet-container').screenshot({ path: join(salida, `como-llegar-mapa-zoom-${ruta}-${nombre}.png`) });
  await contexto.close();
}

await navegador.close();
servidor.close();
await writeFile(join(salida, 'medicion.json'), JSON.stringify(resultado, null, 2));
const malos = resultado.hover.filter(c => !c.cumple);
console.log(`hover: ${resultado.hover.length - malos.length}/${resultado.hover.length} cumplen ≥4.5:1`);
for (const c of resultado.hover) console.log(`  ${c.fila}: ${c.error || `${c.ratio}:1 (${c.texto} sobre ${c.fondo}, hover=${c.hover})`}`);
for (const [n, r] of Object.entries(resultado.pins)) console.log(`pins ${n}: ${r.ok ? 'OK' : 'FALLA'} intersecciones=${JSON.stringify(r.intersecciones)} ${r.pins.map(p => `${p.texto}${p.recortado ? ' [RECORTADO]' : ''}${p.dentroDelMapa ? '' : ' [FUERA]'}`).join(' · ')}`);
console.log(`errores de consola: ${resultado.consola.length}`);

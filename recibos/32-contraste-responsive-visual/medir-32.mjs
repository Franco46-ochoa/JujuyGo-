// Medición del slice 32: contraste sobre colores pintados, tarjetas de regiones,
// pins de recorrido, scroll horizontal y capturas.
// Uso: node medir-32.mjs <dirDist> <dirSalida> [puerto]
//   dirDist: carpeta con index.html del build (p. ej. frontend/dist/frontend/browser)
//   dirSalida: donde se escriben medicion.json y las capturas (antes/ o despues/)
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [dist, salida, puertoArg] = process.argv.slice(2);
if (!dist || !salida) { console.error('uso: node medir-32.mjs <dirDist> <dirSalida> [puerto]'); process.exit(2); }
const puerto = Number(puertoArg || 4321);
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

const resultado = { base, fecha: new Date().toISOString(), metodo: 'Cálculo WCAG 2.x sobre colores pintados: color computado del texto (alfa × opacidad acumulada del elemento y ancestros) compuesto sobre la pila de background-color de los ancestros (lienzo blanco). Fondos con imagen/degradado se marcan y no se puntúan.', contraste: [], zonas: {}, pins: {}, scrollHorizontal: {}, consola: [] };

// Se inyecta en la página: devuelve la medición de contraste de un elemento.
const medirEnPagina = (el, opciones = {}) => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const sobre = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = c => { const t = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * t(c.r) + 0.7152 * t(c.g) + 0.0722 * t(c.b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const cadena = []; for (let n = el; n && n.nodeType === 1; n = n.parentElement) cadena.push(n);
  let opacidad = 1; let conImagen = false;
  for (const n of cadena) { const s = getComputedStyle(n); opacidad *= Number(s.opacity); if (s.backgroundImage !== 'none' && n !== el) conImagen = true; }
  let fondo = { r: 255, g: 255, b: 255, a: 1 };
  for (const n of [...cadena].reverse()) { const bg = parse(getComputedStyle(n).backgroundColor); if (bg && bg.a > 0) fondo = sobre(bg, fondo); }
  const s = getComputedStyle(el);
  const texto = parse(opciones.propiedad ? s[opciones.propiedad] : s.color);
  const pintado = sobre({ ...texto, a: texto.a * opacidad }, fondo);
  const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  return { ratio: Math.round(ratio(pintado, fondo) * 100) / 100, texto: hex(pintado), fondo: hex(fondo), opacidad: Math.round(opacidad * 100) / 100, conImagen, contenido: (el.innerText || el.value || '').trim().slice(0, 40) };
};

async function contraste(pagina, ancho, fila, selector, opciones = {}) {
  const el = await pagina.$(selector);
  if (!el) { resultado.contraste.push({ ancho, fila, selector, error: 'no encontrado' }); return; }
  const m = await el.evaluate(medirEnPagina, opciones);
  resultado.contraste.push({ ancho, fila, selector, minimo: opciones.minimo ?? 4.5, ...m, cumple: m.ratio >= (opciones.minimo ?? 4.5) });
}

async function sinScroll(pagina, clave) {
  resultado.scrollHorizontal[clave] = await pagina.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, hay: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
}

const fechaISO = d => d.toISOString().slice(0, 10);
const inicio = new Date(Date.now() + 7 * 864e5);
const fin = new Date(inicio.getTime() + 2 * 864e5);

for (const [nombre, ancho, alto] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const contexto = await nuevoContexto({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const pagina = await contexto.newPage();
  pagina.on('console', m => { if (m.type() === 'error') resultado.consola.push(`${nombre}: ${m.text()}`); });

  // ── Travesía: wizard → plan ──
  await pagina.goto(`${base}/travesia`, { waitUntil: 'networkidle' });
  const fechas = pagina.locator('.campo-fechas input[type=date]');
  await fechas.nth(0).fill(fechaISO(inicio));
  await fechas.nth(1).fill(fechaISO(fin));
  await pagina.getByRole('button', { name: /Siguiente/ }).click();
  await pagina.locator('.llegada-opciones .opcion').nth(1).click();
  await pagina.getByRole('button', { name: /Siguiente/ }).click();
  await pagina.locator('.intereses-opciones input').first().check({ force: true });
  await pagina.getByRole('button', { name: /Siguiente/ }).click();
  try { await pagina.locator('.lugar-eleccion').first().waitFor(); }
  catch (e) { await pagina.screenshot({ path: join(salida, `error-wizard-${nombre}.png`), fullPage: true }); console.error(resultado.consola.join('\n'), '\n', (await pagina.locator('main').innerText()).slice(0, 800)); throw e; }
  // Fila extra: .boton-principal deshabilitado ("Armar con mis lugares" sin lugares elegidos).
  await contraste(pagina, ancho, 'boton-principal:disabled (paso 4, papel)', '.acciones-lugares .boton-principal:disabled');
  await pagina.getByRole('button', { name: /Proponer según mis intereses/ }).click();
  await pagina.locator('.dia').nth(1).waitFor({ timeout: 30000 });
  await pagina.waitForLoadState('networkidle');
  await pagina.waitForTimeout(1500);

  // La yapa cae en un día según sugerencia.diaIndex. Para medir los dos fondos se
  // clona la tarjeta de yapa (o se crea un <p class="yapa-kicker"> con el CSS real) en
  // un día activo y en uno sobre papel. Solo DOM de la página medida, no del código.
  const yapaReal = await pagina.evaluate(() => { const k = document.querySelector('.yapa-kicker'); return k ? (k.closest('.dia')?.classList.contains('dia-activo') ? 'activo' : 'papel') : 'sin-yapa'; });
  resultado.yapaReal = yapaReal;
  await pagina.evaluate(() => {
    for (const [sel, marca] of [['.dia-activo .dia-cuerpo', 'medir-yapa-activo'], ['.dia:not(.dia-activo) .dia-cuerpo', 'medir-yapa-papel']]) {
      const cuerpo = document.querySelector(sel); if (!cuerpo) continue;
      const existente = cuerpo.querySelector('.yapa-card');
      if (existente) { existente.querySelector('.yapa-kicker')?.setAttribute('data-medir', marca); continue; }
      const molde = document.querySelector('.yapa-card');
      let tarjeta;
      if (molde) tarjeta = molde.cloneNode(true);
      else { tarjeta = document.createElement('aside'); tarjeta.className = 'yapa-card'; tarjeta.innerHTML = '<p class="yapa-kicker">Tu yapa · Misma zona</p>'; for (const a of molde?.getAttributeNames?.() || []) tarjeta.setAttribute(a, ''); }
      // Hereda el atributo de encapsulación de Angular para que aplique el CSS del componente.
      const attrNg = [...cuerpo.attributes].find(a => a.name.startsWith('_ngcontent'))?.name;
      if (attrNg) for (const n of [tarjeta, ...tarjeta.querySelectorAll('*')]) n.setAttribute(attrNg, '');
      tarjeta.querySelector('.yapa-kicker').setAttribute('data-medir', marca);
      cuerpo.prepend(tarjeta);
    }
  });

  await contraste(pagina, ancho, '"Sumar un lugar al día" (label, activo)', '.dia-activo .agregar-lugar label > span');
  await contraste(pagina, ancho, '"Elegí del catálogo" (select, activo)', '.dia-activo .agregar-lugar select');
  await contraste(pagina, ancho, 'borde select (activo, ≥3:1)', '.dia-activo .agregar-lugar select', { propiedad: 'borderTopColor', minimo: 3 });
  await contraste(pagina, ancho, 'separador .agregar-lugar (activo, ≥3:1)', '.dia-activo .agregar-lugar', { propiedad: 'borderTopColor', minimo: 3 });
  await contraste(pagina, ancho, '"Agregar" deshabilitado (activo)', '.dia-activo .agregar-lugar button:disabled');
  await contraste(pagina, ancho, '"Agregar" deshabilitado (papel)', '.dia:not(.dia-activo) .agregar-lugar button:disabled');
  await contraste(pagina, ancho, '.yapa-kicker (activo)', '[data-medir=medir-yapa-activo]');
  await contraste(pagina, ancho, '.yapa-kicker (papel)', '[data-medir=medir-yapa-papel]');
  await contraste(pagina, ancho, 'label "Sumar un lugar" (papel)', '.dia:not(.dia-activo) .agregar-lugar label > span');
  await contraste(pagina, ancho, 'select (papel)', '.dia:not(.dia-activo) .agregar-lugar select');
  // Foco visible del select dentro del día activo (outline vs verde, ≥3:1).
  await pagina.focus('.dia-activo .agregar-lugar select');
  await pagina.keyboard.press('Shift+Tab'); await pagina.keyboard.press('Tab');
  await contraste(pagina, ancho, 'outline foco select (activo, ≥3:1)', '.dia-activo .agregar-lugar select', { propiedad: 'outlineColor', minimo: 3 });

  await pagina.locator('.dia-activo .agregar-lugar').scrollIntoViewIfNeeded();
  await pagina.locator('.dia-activo').screenshot({ path: join(salida, `travesia-dia-activo-deshabilitado-${nombre}.png`) });
  await pagina.locator('.dia').nth(1).screenshot({ path: join(salida, `travesia-dia-papel-deshabilitado-${nombre}.png`) });
  for (const [i, sel] of [[0, '.dia-activo'], [1, '.dia:not(.dia-activo)']]) {
    const s = pagina.locator(`${sel} .agregar-lugar select`).first();
    const valor = await s.locator('option').nth(1).getAttribute('value');
    await s.selectOption(valor);
  }
  await contraste(pagina, ancho, '"Agregar" habilitado (activo)', '.dia-activo .agregar-lugar button:not(:disabled)');
  await contraste(pagina, ancho, '"Agregar" habilitado (papel)', '.dia:not(.dia-activo) .agregar-lugar button:not(:disabled)');
  await pagina.locator('.dia-activo').screenshot({ path: join(salida, `travesia-dia-activo-habilitado-${nombre}.png`) });
  await pagina.locator('.dia').nth(1).screenshot({ path: join(salida, `travesia-dia-papel-habilitado-${nombre}.png`) });
  await sinScroll(pagina, `travesia-${nombre}`);
  await contexto.close();
}

// ── Home: regiones en 1440, 768 y 390 ──
const medirZonas = () => {
  const cortes = [];
  const r = el => el.getBoundingClientRect();
  const choca = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  const tarjetas = [...document.querySelectorAll('.zone-card')].map(card => {
    const c = r(card);
    const nombre = card.querySelector('.zone-name')?.textContent.trim();
    const textos = [...card.querySelectorAll('.zone-name, .zone-description, .zone-facts, .zone-arrival')];
    const fuera = textos.filter(t => { const x = r(t); return x.top < c.top - 0.5 || x.bottom > c.bottom + 0.5 || x.left < c.left - 0.5 || x.right > c.right + 0.5; }).map(t => t.className);
    const flecha = card.querySelector('.zone-arrow');
    const pisa = flecha ? textos.filter(t => choca(r(flecha), r(t))).map(t => t.className) : [];
    return { nombre, rect: { x: Math.round(c.left), y: Math.round(c.top), w: Math.round(c.width), h: Math.round(c.height) }, textoFuera: fuera, flechaPisa: pisa, ok: !fuera.length && !pisa.length };
  });
  return { tarjetas, ok: tarjetas.length === 4 && tarjetas.every(t => t.ok) };
};
for (const [ancho, alto] of [[1440, 900], [768, 1024], [390, 844]]) {
  const contexto = await nuevoContexto({ viewport: { width: ancho, height: alto }, reducedMotion: 'reduce' });
  const pagina = await contexto.newPage();
  pagina.on('console', m => { if (m.type() === 'error') resultado.consola.push(`home ${ancho}: ${m.text()}`); });
  await pagina.goto(`${base}/`, { waitUntil: 'networkidle' });
  await pagina.locator('.zone-card').first().waitFor();
  await pagina.locator('.zone-collage').scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(800);
  resultado.zonas[ancho] = await pagina.evaluate(medirZonas);
  await pagina.locator('.zone-collage').screenshot({ path: join(salida, `home-regiones-${ancho}.png`) });
  await sinScroll(pagina, `home-${ancho}`);
  await contexto.close();
}

// ── Cómo llegar: pins de recorrido ──
for (const [nombre, ancho, alto] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const contexto = await nuevoContexto({ viewport: { width: ancho, height: alto }, reducedMotion: 'reduce' });
  const pagina = await contexto.newPage();
  pagina.on('console', m => { if (m.type() === 'error') resultado.consola.push(`como-llegar ${nombre}: ${m.text()}`); });
  await pagina.goto(`${base}/como-llegar/cerro-siete-colores`, { waitUntil: 'networkidle' });
  await pagina.locator('.yapa-route-pin').first().waitFor({ timeout: 30000 });
  await pagina.waitForTimeout(1500);
  resultado.pins[nombre] = await pagina.evaluate(() => {
    const mapa = document.querySelector('.leaflet-container').getBoundingClientRect();
    return [...document.querySelectorAll('.yapa-route-pin')].map(p => {
      const r = p.getBoundingClientRect();
      const icono = p.closest('.leaflet-marker-icon')?.getBoundingClientRect();
      const recortado = p.scrollWidth > p.clientWidth + 1 || p.scrollHeight > p.clientHeight + 1;
      const dentroDelMapa = r.left >= mapa.left - 0.5 && r.right <= mapa.right + 0.5;
      const centro = icono ? Math.round(((r.left + r.right) / 2 - (icono.left + icono.right) / 2) * 10) / 10 : null;
      return { texto: p.textContent.trim(), ancho: Math.round(r.width), alto: Math.round(r.height), scrollWidth: p.scrollWidth, clientWidth: p.clientWidth, recortado, dentroDelMapa, desvioCentroPx: centro, ok: !recortado && dentroDelMapa };
    });
  });
  await pagina.locator('.leaflet-container').scrollIntoViewIfNeeded();
  await pagina.screenshot({ path: join(salida, `como-llegar-mapa-${nombre}.png`), fullPage: false });
  await pagina.locator('.leaflet-container').screenshot({ path: join(salida, `como-llegar-mapa-zoom-${nombre}.png`) });
  await sinScroll(pagina, `como-llegar-${nombre}`);
  await contexto.close();
}

await navegador.close();
servidor.close();
await writeFile(join(salida, 'medicion.json'), JSON.stringify(resultado, null, 2));
const malos = resultado.contraste.filter(c => !c.cumple);
console.log(`contraste: ${resultado.contraste.length - malos.length}/${resultado.contraste.length} cumplen`);
for (const c of resultado.contraste) console.log(`  [${c.ancho}] ${c.fila}: ${c.error || `${c.ratio}:1 (${c.texto} sobre ${c.fondo}, opac ${c.opacidad}${c.conImagen ? ', FONDO CON IMAGEN' : ''})`}`);
for (const [a, z] of Object.entries(resultado.zonas)) console.log(`zonas ${a}: ${z.ok ? 'OK' : 'FALLA ' + JSON.stringify(z.tarjetas.filter(t => !t.ok))}`);
for (const [n, ps] of Object.entries(resultado.pins)) console.log(`pins ${n}: ${ps.map(p => `${p.texto} ${p.ok ? 'OK' : 'FALLA'} (${p.scrollWidth}/${p.clientWidth}, centro ${p.desvioCentroPx})`).join(' · ')}`);
for (const [k, v] of Object.entries(resultado.scrollHorizontal)) console.log(`scroll ${k}: ${v.hay ? 'HAY ' + v.scrollWidth + '>' + v.clientWidth : 'no'}`);
console.log(`errores de consola: ${resultado.consola.length}`);

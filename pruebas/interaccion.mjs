// ═══ Pruebas de interacción — travesia-v2 ═══
// Requiere el server estático en :8790 (node pruebas/server.mjs).
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('C:\\Users\\Elect\\orca\\projects\\JujuyGo\\frontend\\node_modules\\playwright-core');

const BASE = 'http://localhost:8790/travesia-v2.html';
const CAPS = fileURLToPath(new URL('./capturas', import.meta.url));
const OUT = fileURLToPath(new URL('./resultados.json', import.meta.url));
const DATA = JSON.parse(readFileSync(fileURLToPath(new URL('../data/travesia-v2.json', import.meta.url)), 'utf8'));
const JSONTXT = JSON.stringify(DATA);

const resultados = [];
const ok = (nombre, paso, detalle = '') => {
  resultados.push({ nombre, paso: !!paso, detalle });
  console.log(`${paso ? 'PASS' : 'FAIL'} ${nombre}${detalle ? ' — ' + detalle : ''}`);
};

const rectsI = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);

async function nuevaPage(browser, opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const consola = [], fallidas = [];
  page.on('console', m => { if (m.type() === 'error') consola.push(m.text()); });
  page.on('pageerror', e => consola.push(String(e)));
  page.on('requestfailed', r => fallidas.push(r.url()));
  page._diag = { consola, fallidas };
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.leaflet-marker-icon');
  return { ctx, page };
}

const markersInfo = page => page.evaluate(() =>
  [...document.querySelectorAll('.leaflet-marker-icon')].map(m => {
    const r = m.getBoundingClientRect();
    return { rect: { top: r.top, left: r.left, right: r.right, bottom: r.bottom },
      clases: m.className, title: m.title || m.getAttribute('title') || '' };
  }));

const paresEncimados = ms => {
  const pares = [];
  for (let i = 0; i < ms.length; i++)
    for (let j = i + 1; j < ms.length; j++)
      if (rectsI(ms[i].rect, ms[j].rect)) pares.push([ms[i].title, ms[j].title]);
  return pares;
};
const panelRect = page => page.evaluate(() => {
  const r = document.querySelector('#panel').getBoundingClientRect();
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
});

async function main() {
  await mkdir(CAPS, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  /* ══ DESKTOP 1440×900 ══ */
  {
    const { ctx, page } = await nuevaPage(browser, { viewport: { width: 1440, height: 900 } });

    // D1 — vista general
    {
      const cards = await page.locator('.dia-card').count();
      const ms = await markersInfo(page);
      const pr = await panelRect(page);
      const encimados = ms.filter(m => rectsI(m.rect, pr)).length;
      // vista general: solo 3 visitas + 2 noches
      ok('D1 vista general', cards === 3 && ms.length === 5 && encimados === 0,
        `cards=${cards} marcadores=${ms.length} encimados=${encimados}`);
    }
    // D8 — ningún par de marcadores se intersecta (vista general, desktop)
    {
      await page.waitForTimeout(700); // dejar correr resolverEncimados post-fitBounds
      const ms = await markersInfo(page);
      const pares = paresEncimados(ms);
      ok('D8 sin pares encimados (general desktop)', pares.length === 0, JSON.stringify(pares));
    }
    await page.screenshot({ path: `${CAPS}/d-general.png` });

    // D2 — día 2
    {
      await page.click('.dia-card:nth-of-type(2)');
      await page.waitForTimeout(300);
      await page.click('.v2-nav button[aria-label="Día 2"]');
      await page.waitForTimeout(600);
      const pressed = await page.evaluate(() =>
        [...document.querySelectorAll('.v2-nav .v2-dias button')].map(b => b.getAttribute('aria-pressed')));
      const ms = await markersInfo(page);
      const pr = await panelRect(page);
      const atenuados = ms.filter(m => m.clases.includes('atenuado')).length;
      const activos = ms.filter(m => !m.clases.includes('atenuado'));
      const fuera = activos.filter(m => rectsI(m.rect, pr) ||
        m.rect.left < 0 || m.rect.top < 56 || m.rect.right > 1440 || m.rect.bottom > 900).length;
      ok('D2 día 2', pressed.join() === 'false,true,false' && atenuados === 8 && activos.length === 6 && fuera === 0,
        `pressed=${pressed} atenuados=${atenuados} activos=${activos.length} fuera=${fuera}`);
      // D2-bis — ningún par de marcadores activos se intersecta
      await page.waitForTimeout(700);
      const ms2 = await markersInfo(page);
      const act = ms2.filter(m => !m.clases.includes('atenuado'));
      const pares = paresEncimados(act);
      ok('D2-bis sin pares encimados (día 2)', pares.length === 0, JSON.stringify(pares));
    }
    await page.screenshot({ path: `${CAPS}/d-dia-2.png` });

    // D3 — click card visita → detalle + Escape devuelve foco
    {
      const card = page.locator('#item-d2-i1 .item-btn');
      await card.click();
      await page.waitForTimeout(300);
      const sel = await page.evaluate(() => ({
        detalle: !document.querySelector('#detalle').hidden,
        sel: document.querySelectorAll('.leaflet-marker-icon.sel').length
      }));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const foco = await page.evaluate(() => ({
        detalle: document.querySelector('#detalle').hidden,
        activo: document.activeElement?.closest('li')?.id
      }));
      ok('D3 card→detalle→Escape', sel.detalle && sel.sel >= 1 && foco.detalle && foco.activo === 'item-d2-i1',
        JSON.stringify({ sel, foco }));
    }
    // D9 — el detalle no tapa el control de zoom
    {
      await page.click('#item-d2-i1 .item-btn');
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const d = document.querySelector('#detalle').getBoundingClientRect();
        const z = document.querySelector('.leaflet-control-zoom').getBoundingClientRect();
        return { detTop: d.top, zoomBottom: z.bottom,
          cruza: !(d.right < z.left || d.left > z.right || d.bottom < z.top || d.top > z.bottom) };
      });
      ok('D9 detalle vs control zoom', !r.cruza, JSON.stringify(r));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
    await page.click('#item-d2-i1 .item-btn'); // reabrir para captura
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${CAPS}/d-visita-seleccionada.png` });

    // D4 — click marcador → card aria-current + detalle
    {
      await page.keyboard.press('Escape'); // limpiar selección de D3 (mismo item haría toggle)
      await page.waitForTimeout(200);
      // clic en el marcador de la visita del día 2 (Cerro)
      const centro = await page.evaluate(() => {
        const ms = [...document.querySelectorAll('.leaflet-marker-icon')];
        const m = ms.find(x => !x.classList.contains('atenuado') && x.title === 'Cerro de los Siete Colores');
        const r = m.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      await page.mouse.click(centro.x, centro.y);
      await page.waitForTimeout(300);
      const st = await page.evaluate(() => ({
        current: document.querySelector('#item-d2-i1 .item-btn')?.getAttribute('aria-current'),
        detalle: !document.querySelector('#detalle').hidden
      }));
      ok('D4 marcador→card', st.current === 'true' && st.detalle, JSON.stringify(st));
    }

    // yapa seleccionada (captura)
    {
      const centro = await page.evaluate(() => {
        const ms = [...document.querySelectorAll('.leaflet-marker-icon')];
        const m = ms.find(x => !x.classList.contains('atenuado') && x.title === 'Paleta del Pintor');
        const r = m.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      await page.mouse.click(centro.x, centro.y);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${CAPS}/d-yapa-seleccionada.png` });
      await page.keyboard.press('Escape');
    }

    // D5 — solo teclado: selector → día 3 → visita → Escape
    {
      await page.keyboard.press('Tab'); // empezar a tabular
      let llego = false;
      for (let i = 0; i < 60; i++) {
        const t = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
        if (t === 'Día 3') { llego = true; break; }
        await page.keyboard.press('Tab');
      }
      let paso = llego;
      if (llego) {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        // tab hasta la card del Hornocal
        let okCard = false;
        for (let i = 0; i < 40; i++) {
          const id = await page.evaluate(() => document.activeElement?.closest('li')?.id);
          if (id === 'item-d3-i0') { okCard = true; break; }
          await page.keyboard.press('Tab');
        }
        if (okCard) {
          await page.keyboard.press('Enter');
          await page.waitForTimeout(300);
          const abierto = await page.evaluate(() => !document.querySelector('#detalle').hidden);
          await page.keyboard.press('Escape');
          const cerrado = await page.evaluate(() => document.querySelector('#detalle').hidden);
          paso = abierto && cerrado;
        } else paso = false;
      }
      ok('D5 solo teclado', paso, `llego-selector=${llego}`);
    }

    // D6 — contenido textual
    {
      const txt = await page.evaluate(() => document.body.innerText);
      // día 2 para Purmamarca, día 3 para Hornocal y el descartado
      await page.click('.v2-nav button[aria-label="Día 2"]');
      await page.waitForTimeout(400);
      const t2 = await page.evaluate(() => document.body.innerText);
      await page.click('.v2-nav button[aria-label="Día 3"]');
      await page.waitForTimeout(400);
      const t3 = await page.evaluate(() => document.body.innerText);
      const checks = {
        hornocalSinHorario: /sin horario fijo/i.test(t3),
        hornocalVerificar: /verificar regreso/i.test(t3),
        purmamarcaSinCoords: /Purmamarca Pueblo/.test(t2) && /sin coordenadas verificadas/i.test(t2),
        sinKm: !/\bkm\b/i.test(t3) && !/\bkm\b/i.test(t2) && !/\bkm\b/i.test(txt),
        pericoComoAlternativa: /sigue hasta Perico/i.test(t3) && !/no sirve/i.test(t3),
        leyenda: /conexión esquemática/i.test(t3),
        estadoCondicional: t3.includes('Cierra solo si volvés')
      };
      // yapa sin-garantia (día 1): su bloque no puede contener "cierra"
      await page.click('.v2-nav button[aria-label="Día 2"]');
      await page.waitForTimeout(200);
      await page.click('.v2-nav button[aria-label="Día 1"]');
      await page.waitForTimeout(300);
      const sinG = await page.evaluate(() => {
        const y = [...document.querySelectorAll('.yapa-i')].find(y => y.textContent.includes('sin garantía') || y.textContent.includes('Sin garantía'));
        return y ? !/cierra/i.test(y.textContent) : false;
      });
      checks.sinGarantiaSinCierra = sinG;
      // Paleta del Pintor: sin <img> en la card; foto_nota en el detalle
      await page.click('.v2-nav button[aria-label="Día 2"]');
      await page.waitForTimeout(400);
      const paleta = await page.evaluate(() => {
        const li = document.querySelector('#item-d2-i3');
        return li ? { imgs: li.querySelectorAll('img').length } : null;
      });
      await page.click('#item-d2-i3 .item-btn');
      await page.waitForTimeout(400);
      const detPaleta = await page.evaluate(() => ({
        nota: document.querySelector('#detalle').textContent.includes('no tiene foto propia'),
        imgs: document.querySelector('#detalle').querySelectorAll('img').length
      }));
      checks.paletaSinImg = paleta && paleta.imgs === 0 && detPaleta.nota && detPaleta.imgs === 0;
      await page.keyboard.press('Escape');
      // ningún "cierra" suelto en las tarjetas de día
      await page.click('.v2-volver');
      await page.waitForTimeout(300);
      checks.sinCierraSuelto = await page.evaluate(() =>
        ![...document.querySelectorAll('.dia-card .meta')].some(m => /·\s*cierra\s*$/i.test(m.textContent)) &&
        [...document.querySelectorAll('.dia-card .estado-txt')].length === 3);
      // horas HH:MM del DOM ⊆ JSON
      const horas = [...new Set((await page.evaluate(() => document.body.innerText)).match(/\b\d{2}:\d{2}\b/g) || [])];
      const fuera = horas.filter(h => !JSONTXT.includes(h));
      checks.horasEnJson = fuera.length === 0;
      const horas2 = [...new Set((await page.evaluate(() => document.body.innerText)).match(/\b\d{2}:\d{2}\b/g) || [])];
      const fuera2 = horas2.filter(h => !JSONTXT.includes(h));
      ok('D6 textos', Object.values(checks).every(Boolean) && fuera2.length === 0, JSON.stringify({ ...checks, horasFuera: fuera, horasFuera2: fuera2 }));
    }

    // D7 — consola / requests
    {
      const { consola, fallidas } = page._diag;
      const tilesFallidos = fallidas.filter(u => u.includes('tile.openstreetmap.org'));
      const otras = fallidas.filter(u => !u.includes('tile.openstreetmap.org'));
      ok('D7 sin errores', consola.length === 0 && otras.length === 0,
        `consola=${JSON.stringify(consola.slice(0, 3))} requests=${JSON.stringify(otras.slice(0, 3))} tilesFallidos=${tilesFallidos.length}`);
      if (tilesFallidos.length) resultados.push({ nombre: 'D7 tiles fallidos (red)', paso: true, detalle: `${tilesFallidos.length} tiles no cargaron — problema de red, no del prototipo` });
    }

    // D10 — conexiones de yapas: solo desde su `referencia` declarada; la línea del día no pasa por yapas
    {
      await page.evaluate(() => { location.hash = ''; });
      await page.waitForTimeout(400);
      const lineas = await page.evaluate(() => {
        const out = [];
        window.__mapa.eachLayer(l => {
          if (l.getLatLngs && l.options.className) out.push({ c: l.options.className, ll: l.getLatLngs().map(p => [p.lat, p.lng]) });
        });
        return out;
      });
      const igual = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
      const yapas = DATA.dias.flatMap(d => d.items.filter(i => i.tipo === 'yapa'));
      const linYapa = lineas.filter(l => l.c === 'v2-lin-yapa');
      const esperadas = yapas.filter(y => y.referencia?.lat != null && y.lugar?.lat != null);
      const cadaUna = esperadas.every(y => linYapa.some(l =>
        l.ll.length === 2 && igual(l.ll[0], [y.referencia.lat, y.referencia.lng]) && igual(l.ll[1], [y.lugar.lat, y.lugar.lng])));
      const paleta = yapas.find(y => y.lugar.slug === 'paleta-del-pintor');
      const linPaleta = linYapa.filter(l => igual(l.ll[1], [paleta.lugar.lat, paleta.lugar.lng]));
      const paletaDesdeMaimara = linPaleta.length === 1 && paleta.referencia.nombre === 'Maimará'
        && igual(linPaleta[0].ll[0], [paleta.referencia.lat, paleta.referencia.lng]);
      const sinRef = yapas.filter(y => !y.referencia);
      const sinRefSinLinea = sinRef.every(y => !linYapa.some(l => igual(l.ll[1], [y.lugar.lat, y.lugar.lng])));
      const coordsYapa = yapas.filter(y => y.lugar?.lat != null).map(y => [y.lugar.lat, y.lugar.lng]);
      const diaNoPasaPorYapa = lineas.filter(l => l.c === 'v2-lin').every(l => !l.ll.some(p => coordsYapa.some(c => igual(p, c))));
      ok('D10 conexiones de yapas', linYapa.length === esperadas.length && cadaUna && paletaDesdeMaimara && sinRefSinLinea && diaNoPasaPorYapa,
        JSON.stringify({ lineasYapa: linYapa.length, esperadas: esperadas.length, cadaUna, paletaDesdeMaimara, garganta_sin_linea: sinRefSinLinea, diaNoPasaPorYapa }));
    }
    await ctx.close();
  }

  /* ══ MOBILE 390×844 ══ */
  {
    const { ctx, page } = await nuevaPage(browser, {
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true
    });
    const cdp = await ctx.newCDPSession(page);
    const estado = () => page.evaluate(() => document.querySelector('#panel').dataset.estado);
    const aria = () => page.evaluate(() => document.querySelector('#panel').getAttribute('aria-expanded'));
    const hojaTop = () => page.evaluate(() => document.querySelector('#panel').getBoundingClientRect().top);
    const touch = async (tipo, x, y) => cdp.send('Input.dispatchTouchEvent',
      { type: tipo, touchPoints: [{ x, y }] });

    // D8-m — vista general mobile (hoja contraída): sin pares encimados
    {
      await page.waitForTimeout(800);
      const ms = await markersInfo(page);
      const pares = paresEncimados(ms);
      ok('D8-m sin pares encimados (general mobile)', pares.length === 0, JSON.stringify(pares));
    }

    // M-a — en contraida + general, chip 02 entra al día 2 sin cambiar la hoja
    {
      const antes = await estado();
      await page.tap('#cab-dias button[aria-label="Día 2"]');
      await page.waitForTimeout(600);
      const r = await page.evaluate(() => ({
        estado: document.querySelector('#panel').dataset.estado,
        esDia2: !!document.querySelector('#item-d2-i1')
      }));
      ok('M-a chip en contraida', antes === 'contraida' && r.estado === 'contraida' && r.esDia2,
        JSON.stringify({ antes, ...r }));
      // volver a general para el resto de las pruebas
      await page.evaluate(() => { document.querySelector('#panel').dataset.estado = 'media'; });
      await page.waitForTimeout(300);
      await page.tap('.v2-volver');
      await page.waitForTimeout(300);
      await page.evaluate(() => { document.querySelector('#panel').dataset.estado = 'contraida'; });
      await page.waitForTimeout(300);
    }

    // M-b — ▴/▾ deshabilitados en los extremos
    {
      const r0 = await page.evaluate(() => ({
        subir: document.querySelector('#btn-subir').disabled,
        bajar: document.querySelector('#btn-bajar').disabled
      }));
      await page.evaluate(() => { document.querySelector('#hoja-asa').click(); document.querySelector('#hoja-asa').click(); });
      await page.waitForTimeout(400);
      const r1 = await page.evaluate(() => ({
        estado: document.querySelector('#panel').dataset.estado,
        subir: document.querySelector('#btn-subir').disabled,
        bajar: document.querySelector('#btn-bajar').disabled
      }));
      await page.tap('#btn-bajar'); await page.waitForTimeout(300);
      await page.tap('#btn-bajar'); await page.waitForTimeout(300);
      ok('M-b botones extremos', !r0.subir && r0.bajar && r1.estado === 'expandida' && r1.subir && !r1.bajar,
        JSON.stringify({ contraida: r0, expandida: r1 }));
    }

    // M1 — botones recorren estados
    {
      const e0 = await estado();
      await page.tap('#btn-subir'); await page.waitForTimeout(400);
      const e1 = await estado();
      await page.tap('#btn-subir'); await page.waitForTimeout(400);
      const e2 = await estado();
      await page.tap('#btn-bajar'); await page.waitForTimeout(400);
      const e3 = await estado();
      await page.tap('#btn-bajar'); await page.waitForTimeout(400);
      const e4 = await estado();
      const a = await aria();
      ok('M1 botones hoja', e0 === 'contraida' && e1 === 'media' && e2 === 'expandida' && e3 === 'media' && e4 === 'contraida' && a === 'false',
        `${e0}→${e1}→${e2}→${e3}→${e4} aria=${a}`);
      await page.screenshot({ path: `${CAPS}/m-contraida.png` });
      await page.tap('#btn-subir'); await page.waitForTimeout(400);
      await page.screenshot({ path: `${CAPS}/m-media.png` });
      await page.tap('#btn-subir'); await page.waitForTimeout(400);
      await page.screenshot({ path: `${CAPS}/m-expandida.png` });
      await page.tap('#btn-bajar'); await page.waitForTimeout(400);
    }

    // M2 — arrastre del asa con touch real cambia estado; mapa no se mueve
    {
      await page.waitForTimeout(800); // que termine cualquier re-encuadre previo
      const antes = await page.evaluate(() => ({ c: window.__mapa.getCenter(), z: window.__mapa.getZoom() }));
      const cab = await page.evaluate(() => {
        const r = document.querySelector('.hoja-asa').getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      await touch('touchStart', cab.x, cab.y);
      for (let i = 1; i <= 10; i++) await touch('touchMove', cab.x, cab.y - i * 30);
      await touch('touchEnd', cab.x, cab.y - 300);
      await page.waitForTimeout(500);
      const desp = await page.evaluate(() => ({
        c: window.__mapa.getCenter(), z: window.__mapa.getZoom(),
        e: document.querySelector('#panel').dataset.estado
      }));
      const movio = Math.abs(antes.c.lat - desp.c.lat) + Math.abs(antes.c.lng - desp.c.lng) + Math.abs(antes.z - desp.z);
      ok('M2 arrastre asa', desp.e === 'expandida' && movio < 1e-3,
        `estado=${desp.e} deltaMapa=${movio}`);
    }

    // M3 — scroll dentro de la hoja en expandida no mueve el mapa
    {
      await page.tap('.dia-card:nth-of-type(2)'); // entrar al día 2 (más contenido)
      await page.waitForTimeout(400);
      await page.waitForTimeout(500);
      const antes = await page.evaluate(() => ({
        c: window.__mapa.getCenter(), z: window.__mapa.getZoom(),
        s: document.querySelector('.hoja-contenido').scrollTop
      }));
      const area = await page.evaluate(() => {
        const r = document.querySelector('.hoja-contenido').getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.bottom - 30 };
      });
      await touch('touchStart', area.x, area.y);
      for (let i = 1; i <= 8; i++) await touch('touchMove', area.x, area.y - i * 40);
      await touch('touchEnd', area.x, area.y - 320);
      await page.waitForTimeout(400);
      const desp = await page.evaluate(() => ({
        c: window.__mapa.getCenter(), z: window.__mapa.getZoom(),
        s: document.querySelector('.hoja-contenido').scrollTop
      }));
      const movio = Math.abs(antes.c.lat - desp.c.lat) + Math.abs(antes.c.lng - desp.c.lng) + Math.abs(antes.z - desp.z);
      ok('M3 scroll en hoja', desp.s > antes.s && movio < 1e-9,
        `scroll ${antes.s}→${desp.s} deltaMapa=${movio}`);
    }

    // M4 — tocar marcador → hoja ≥ media + card visible en la hoja
    {
      const vista2 = await page.evaluate(() => !!document.querySelector('#item-d2-i1'));
      if (!vista2) {
        // volver a 'media' según el estado actual (tras M3 queda en expandida)
        const est = await estado();
        if (est === 'expandida') { await page.tap('#btn-bajar'); await page.waitForTimeout(400); }
        else if (est === 'contraida') { await page.tap('#btn-subir'); await page.waitForTimeout(400); }
        await page.tap('.dia-card:nth-of-type(2)'); await page.waitForTimeout(500);
      }
      await page.evaluate(() => { document.querySelector('#panel').dataset.estado = 'contraida'; });
      await page.waitForTimeout(900);
      const mk = await page.evaluate(() => {
        const ms = [...document.querySelectorAll('.leaflet-marker-icon')];
        const m = ms.find(x => !x.classList.contains('atenuado') && x.title === 'Cerro de los Siete Colores');
        if (!m) return null;
        const r = m.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { x: r.left + r.width / 2, y: r.top + r.height / 2,
          topEl: String(top && top.className).slice(0, 90) };
      });
      if (!mk) { ok('M4 tap marcador', false, 'marcador Cerro no encontrado'); }
      else {
      await page.touchscreen.tap(mk.x, mk.y);
      await page.waitForTimeout(600);
      const r = await page.evaluate(() => {
        const panel = document.querySelector('#panel').getBoundingClientRect();
        const li = document.querySelector('#item-d2-i1');
        if (!li) return { estado: document.querySelector('#panel').dataset.estado, cardVisible: false, sinLi: true };
        const card = li.getBoundingClientRect();
        return { estado: document.querySelector('#panel').dataset.estado,
          cardVisible: card.top >= panel.top && card.top < innerHeight && card.bottom > panel.top };
      });
      ok('M4 tap marcador', (r.estado === 'media' || r.estado === 'expandida') && r.cardVisible,
        JSON.stringify({ ...r, mk }));
      await page.screenshot({ path: `${CAPS}/m-marcador-seleccionado.png` });
      }
    }

    // M5 — tocar card → marcador por encima del borde de la hoja
    {
      // des-seleccionar y bajar la hoja para tener margen
      await page.evaluate(() => { document.querySelector('#panel').dataset.estado = 'media'; });
      await page.waitForTimeout(400);
      // ir a día 3 (Hornocal está lejos)
      await page.tap('#cab-dias button[aria-label="Día 3"]');
      await page.waitForTimeout(600);
      const cb = await page.evaluate(() => {
        const r = document.querySelector('#item-d3-i0 .item-btn').getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + 20 };
      });
      await page.touchscreen.tap(cb.x, cb.y);
      await page.waitForTimeout(900);
      const r = await page.evaluate(() => {
        const panel = document.querySelector('#panel').getBoundingClientRect();
        const m = [...document.querySelectorAll('.leaflet-marker-icon')]
          .find(x => !x.classList.contains('atenuado') && x.title === 'Serranía del Hornocal');
        if (!m) return { ok: false, sinMarcador: true };
        const mr = m.getBoundingClientRect();
        return { sheetTop: panel.top, markerBottom: mr.bottom, ok: mr.bottom < panel.top };
      });
      ok('M5 tap card→marcador visible', r.ok, JSON.stringify(r));
    }

    // M6 — en contraida y media, marcadores del día activo sobre la hoja
    {
      const rep = {};
      for (const e of ['contraida', 'media', 'expandida']) {
        await page.evaluate(est => {
          document.querySelector('#panel').dataset.estado = est;
          dispatchEvent(new Event('resize'));
        }, e);
        await page.waitForTimeout(500);
        rep[e] = await page.evaluate(() => {
          const top = document.querySelector('#panel').getBoundingClientRect().top;
          const ms = [...document.querySelectorAll('.leaflet-marker-icon')]
            .filter(x => !x.classList.contains('atenuado'));
          return { n: ms.length, tapados: ms.filter(m => m.getBoundingClientRect().bottom > top + 2).length };
        });
      }
      ok('M6 marcadores sobre hoja', rep.contraida.tapados === 0 && rep.media.tapados === 0,
        JSON.stringify(rep));
      await page.evaluate(() => { document.querySelector('#panel').dataset.estado = 'media'; });
    }

    // M7 — reduced motion
    {
      const ctx2 = await browser.newContext({
        viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce'
      });
      const p2 = await ctx2.newPage();
      await p2.goto(BASE, { waitUntil: 'networkidle' });
      const td = await p2.evaluate(() => getComputedStyle(document.querySelector('#panel')).transitionDuration);
      ok('M7 reduced motion', td === '0s', `transition-duration=${td}`);
      await ctx2.close();
    }

    // M8 — solo teclado
    {
      // limpiar selección previa (si hay detalle abierto la lista no está en expandida)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      // llevar hoja a expandida con asa y luego seleccionar card con Enter
      let paso = false, log = '';
      for (let i = 0; i < 80; i++) {
        const id = await page.evaluate(() => document.activeElement?.id);
        if (id === 'hoja-asa') break;
        await page.keyboard.press('Tab');
      }
      await page.keyboard.press('Enter'); // cicla estados
      await page.waitForTimeout(300);
      const e1 = await estado();
      for (let i = 0; i < 150; i++) {
        const id = await page.evaluate(() => document.activeElement?.closest('li')?.id);
        if (id) { log = id; break; }
        await page.keyboard.press('Tab');
      }
      if (log) {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        paso = await page.evaluate(() => !document.querySelector('#detalle').hidden ||
          document.querySelector('.item-btn[aria-current="true"]') != null);
      }
      const ultimo = await page.evaluate(() => document.activeElement?.id || document.activeElement?.className);
      ok('M8 teclado', e1 !== 'contraida' && paso, `estado=${e1} card=${log} ultimo=${ultimo}`);
    }

    await ctx.close();
  }

  /* Tablet 768 captura */
  {
    const { ctx, page } = await nuevaPage(browser, { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true });
    await page.evaluate(() => { document.querySelector('#panel').dataset.estado = 'media'; });
    await page.tap('.dia-card:nth-of-type(2)');
    await page.waitForTimeout(600);
    await page.evaluate(() => { document.querySelector('#panel').dataset.estado = 'media'; });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${CAPS}/t-dia-2-media.png` });
    await ctx.close();
  }

  await writeFile(OUT, JSON.stringify({ generado: new Date().toISOString(), resultados }, null, 2));
  const fallas = resultados.filter(r => !r.paso).length;
  console.log(`\n${resultados.length - fallas}/${resultados.length} pruebas pasaron. → ${OUT}`);
  await browser.close();
  process.exit(fallas ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });

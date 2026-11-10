// Importa una vez los datos públicos de https://horario-quebrada.netlify.app/
// y genera backend/src/data/horario-quebrada.js.
//
// Uso: node scripts/importar-horario-quebrada.mjs
// Requiere autorización del titular de los datos (ya otorgada por el propietario
// del proyecto). NO corre en runtime ni en tests: es una herramienta de build de datos.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.HQ_BASE_URL || 'https://horario-quebrada.netlify.app';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'horario-quebrada.js');

const fetchText = async (url) => {
  const res = await fetch(url, { headers: { 'user-agent': 'jujuygo-data-import/1.0' } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
};

// ---------- parser de literales JS (solo datos: strings, números, arrays, objetos) ----------

function skipWs(s, i) {
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
}

function parseString(s, i) {
  // s[i] === '"'
  let out = '';
  i++;
  while (i < s.length) {
    const c = s[i];
    if (c === '"') return [out, i + 1];
    if (c === '\\') {
      const n = s[i + 1];
      if (n === 'x') {
        out += String.fromCharCode(parseInt(s.slice(i + 2, i + 4), 16));
        i += 4;
        continue;
      }
      if (n === 'u') {
        out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16));
        i += 6;
        continue;
      }
      const map = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0' };
      out += map[n] ?? n;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  throw new Error('string sin cerrar');
}

function parseNumber(s, i) {
  const m = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i));
  if (!m) throw new Error(`número esperado en ${i}: ${s.slice(i, i + 30)}`);
  return [Number(m[0]), i + m[0].length];
}

function parseIdent(s, i) {
  const m = /^[A-Za-z_$][\w$]*/.exec(s.slice(i));
  if (!m) throw new Error(`identificador esperado en ${i}: ${s.slice(i, i + 30)}`);
  return [m[0], i + m[0].length];
}

function parseValue(s, i) {
  i = skipWs(s, i);
  const c = s[i];
  if (c === '"') return parseString(s, i);
  if (c === '{') return parseObject(s, i);
  if (c === '[') return parseArray(s, i);
  if (c === '-' || /\d/.test(c)) return parseNumber(s, i);
  if (c === '!') {
    // minificado: !0 === true, !1 === false
    if (s[i + 1] === '0') return [true, i + 2];
    if (s[i + 1] === '1') return [false, i + 2];
  }
  if (/[A-Za-z_$]/.test(c)) {
    const [ident, j] = parseIdent(s, i);
    if (ident === 'true') return [true, j];
    if (ident === 'false') return [false, j];
    if (ident === 'null') return [null, j];
    if (ident === 'undefined') return [undefined, j];
    throw new Error(`identificador no soportado como valor: ${ident}`);
  }
  throw new Error(`valor inesperado en ${i}: ${s.slice(i, i + 40)}`);
}

function parseKey(s, i) {
  i = skipWs(s, i);
  const c = s[i];
  if (c === '"') {
    const [v, j] = parseString(s, i);
    return [v, j];
  }
  if (c === '-' || /\d/.test(c)) {
    const [v, j] = parseNumber(s, i);
    return [String(v), j];
  }
  const [ident, j] = parseIdent(s, i);
  return [ident, j];
}

function parseObject(s, i) {
  // s[i] === '{'
  const obj = {};
  i = skipWs(s, i + 1);
  if (s[i] === '}') return [obj, i + 1];
  while (i < s.length) {
    const [key, j1] = parseKey(s, i);
    i = skipWs(s, j1);
    if (s[i] !== ':') throw new Error(`se esperaba ':' tras clave ${key} en ${i}`);
    const [val, j2] = parseValue(s, i + 1);
    obj[key] = val;
    i = skipWs(s, j2);
    if (s[i] === ',') { i = skipWs(s, i + 1); continue; }
    if (s[i] === '}') return [obj, i + 1];
    throw new Error(`se esperaba ',' o '}' en ${i}: ${s.slice(i, i + 40)}`);
  }
  throw new Error('objeto sin cerrar');
}

function parseArray(s, i) {
  // s[i] === '['
  const arr = [];
  i = skipWs(s, i + 1);
  if (s[i] === ']') return [arr, i + 1];
  while (i < s.length) {
    const [val, j] = parseValue(s, i);
    arr.push(val);
    i = skipWs(s, j);
    if (s[i] === ',') { i = skipWs(s, i + 1); continue; }
    if (s[i] === ']') return [arr, i + 1];
    throw new Error(`se esperaba ',' o ']' en ${i}: ${s.slice(i, i + 40)}`);
  }
  throw new Error('array sin cerrar');
}

function extractBalanced(s, start) {
  // start apunta a '{' o '['; devuelve el literal completo respetando strings
  const open = s[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let i = start;
  let inStr = false;
  while (i < s.length) {
    const c = s[i];
    if (inStr) {
      if (c === '\\') { i += 2; continue; }
      if (c === '"') inStr = false;
      i++;
      continue;
    }
    if (c === '"') { inStr = true; i++; continue; }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
    i++;
  }
  throw new Error('literal balanceado no encontrado');
}

// ---------- análisis estático de un chunk ----------

function parseVarDeclarations(src) {
  // Devuelve Map<nombre, valorLiteral> para declaraciones `var a=...,b=...;`.
  // Escanea cada `var ` hasta el `;` de nivel superior (los enums IIFE contienen
  // comas y llaves, así que no sirve un regex simple).
  const vars = new Map();
  let pos = 0;
  while (true) {
    const start = src.indexOf('var ', pos);
    if (start === -1) break;
    // fin de la sentencia: primer ';' a profundidad 0 fuera de strings
    let i = start + 4, depth = 0, inStr = false, end = -1;
    while (i < src.length) {
      const c = src[i];
      if (inStr) {
        if (c === '\\') { i += 2; continue; }
        if (c === '"') inStr = false;
        i++;
        continue;
      }
      if (c === '"') { inStr = true; i++; continue; }
      if (c === '{' || c === '[' || c === '(') depth++;
      else if (c === '}' || c === ']' || c === ')') depth--;
      else if (c === ';' && depth === 0) { end = i; break; }
      i++;
    }
    if (end === -1) break;
    const decls = src.slice(start + 4, end);
    pos = end + 1;

    // trocear por comas de nivel superior
    let d2 = 0, cur = '', parts = [], s2 = false;
    for (const ch of decls) {
      if (s2) { cur += ch; if (ch === '"') s2 = false; continue; }
      if (ch === '"') { s2 = true; cur += ch; continue; }
      if (ch === '{' || ch === '[' || ch === '(') d2++;
      if (ch === '}' || ch === ']' || ch === ')') d2--;
      if (ch === ',' && d2 === 0) { parts.push(cur); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur);

    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const name = part.slice(0, eq).trim();
      if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;
      const expr = part.slice(eq + 1).trim();
      try {
        let value;
        if (expr.startsWith('"')) {
          const [v] = parseString(expr, 0);
          value = { kind: 'string', value: v };
        } else if (/^-?\d/.test(expr)) {
          const [v] = parseNumber(expr, 0);
          value = { kind: 'number', value: v };
        } else if (expr.startsWith('{') || expr.startsWith('[')) {
          const lit = extractBalanced(expr, 0);
          const [v] = expr[0] === '{' ? parseObject(lit, 0) : parseArray(lit, 0);
          value = { kind: 'literal', value: v };
        } else {
          continue; // clase/función/IIFE: no es dato literal
        }
        if (!vars.has(name)) vars.set(name, value);
      } catch {
        // ignorar declaradores no parseables
      }
    }
  }
  return vars;
}

function parseModuleInfo(name, src) {
  const info = { name, src, vars: parseVarDeclarations(src), imports: new Map(), exports: new Map() };

  // import {a as b, c} from "./chunk-X.js"
  const importRe = /import\s*\{([^}]+)\}\s*from\s*["']\.\/([\w.-]+\.js)["']/g;
  let im;
  while ((im = importRe.exec(src))) {
    const [, spec, mod] = im;
    for (const part of spec.split(',')) {
      const p = part.trim();
      if (!p) continue;
      const asM = /^(\w+)\s+as\s+(\w+)$/.exec(p);
      if (asM) info.imports.set(asM[2], { module: mod, export: asM[1] });
      else info.imports.set(p, { module: mod, export: p });
    }
  }

  // export {a as b, c as d}
  const exportRe = /export\s*\{([^}]+)\}/g;
  let ex;
  while ((ex = exportRe.exec(src))) {
    for (const part of ex[1].split(',')) {
      const p = part.trim();
      if (!p) continue;
      const asM = /^(\w+)\s+as\s+(\w+)$/.exec(p);
      if (asM) info.exports.set(asM[2], asM[1]); // exportName -> localName
      else info.exports.set(p, p);
    }
  }
  return info;
}

function makeResolver(modules) {
  const resolve = (chunkName, ident, seen = new Set()) => {
    const mod = modules.get(chunkName);
    if (!mod) return null;
    const key = `${chunkName}:${ident}`;
    if (seen.has(key)) return null;
    seen.add(key);
    // 1) var local
    const v = mod.vars.get(ident);
    if (v && (v.kind === 'string' || v.kind === 'number')) return v.value;
    if (v && v.kind === 'literal') return v.value;
    // 2) import -> export del módulo destino
    const imp = mod.imports.get(ident);
    if (imp) {
      const target = modules.get(imp.module);
      if (!target) return null;
      const local = target.exports.get(imp.export);
      if (!local) return null;
      return resolve(imp.module, local, seen);
    }
    return null;
  };
  return resolve;
}

// ---------- extracción de schedules ----------

const SCHEDULE_RE = /\{id:(\d+),idOrigin:(\d+),idDestination:(\d+),city:([A-Za-z_$][\w$]*),schedule:"([^"]*)",hour:(\d+),minute:(\d+),service:([A-Za-z_$][\w$]*),company:([A-Za-z_$][\w$]*),frequency:(\d+)(?:,rapidStops:\[([0-9,]+)\])?\}/g;

function extractSchedules(modules, resolve) {
  const out = [];
  const unresolved = new Map();
  const seenTuples = new Set();
  let dupes = 0;
  let totalMatches = 0;

  for (const [name, mod] of modules) {
    const src = mod.src;
    let m;
    SCHEDULE_RE.lastIndex = 0;
    while ((m = SCHEDULE_RE.exec(src))) {
      totalMatches++;
      const [, , origen, destino, cityId, hora, , min, serviceId, companyId, freq, rapid] = m;
      const city = resolve(name, cityId);
      const service = resolve(name, serviceId);
      const company = resolve(name, companyId);
      for (const [label, val, ident] of [['city', city, cityId], ['service', service, serviceId], ['company', company, companyId]]) {
        if (val === null || val === undefined) {
          const k = `${label}:${ident}@${name}`;
          unresolved.set(k, (unresolved.get(k) || 0) + 1);
        }
      }
      const tuple = `${origen}|${destino}|${city}|${hora}|${service}|${company}|${freq}`;
      if (seenTuples.has(tuple)) { dupes++; continue; }
      seenTuples.add(tuple);
      out.push({
        origen_id: Number(origen),
        destino_id: Number(destino),
        ciudad_destino: city ?? cityId,
        hora,
        minuto: Number(min),
        servicio: service ?? serviceId,
        empresa: company ?? companyId,
        frecuencia: Number(freq),
        ...(rapid ? { rapid_stops: rapid.split(',').map(Number) } : {}),
      });
    }
    // contar idOrigin no matcheados por el regex estricto
    const totalOrigin = (src.match(/idOrigin:/g) || []).length;
    const matchedOrigin = (src.match(SCHEDULE_RE) || []).length;
    if (totalOrigin !== matchedOrigin) {
      console.warn(`  ! ${name}: ${totalOrigin} idOrigin pero ${matchedOrigin} objetos parseados`);
    }
  }

  out.sort((a, b) => a.origen_id - b.origen_id || a.hora.localeCompare(b.hora) || String(a.empresa).localeCompare(String(b.empresa)));
  out.forEach((s, i) => { s.id = `hq-${String(i + 1).padStart(4, '0')}`; });
  return { schedules: out, unresolved: [...unresolved.entries()], totalMatches, dupes };
}

// ---------- extracción de ciudades/empresas/feriados/tarifas/tiempos ----------

function findChunkWith(modules, needle) {
  for (const [name, mod] of modules) if (mod.src.includes(needle)) return name;
  return null;
}

function extractCitiesCompanies(modules) {
  const chunkName = findChunkWith(modules, 'this.cities=');
  if (!chunkName) throw new Error('no se encontró el chunk con this.cities');
  const src = modules.get(chunkName).src;
  const cities = [];
  const companies = [];

  const citiesIdx = src.indexOf('this.cities=');
  const arrStart = src.indexOf('[', citiesIdx);
  const citiesLit = extractBalanced(src, arrStart);
  const [citiesArr] = parseArray(citiesLit, 0);
  for (const c of citiesArr) cities.push({ id: c.id, nombre: c.name });

  const compIdx = src.indexOf('this.companies=');
  const compStart = src.indexOf('[', compIdx);
  const compLit = extractBalanced(src, compStart);
  const [compArr] = parseArray(compLit, 0);
  for (const c of compArr) companies.push({ id: c.id, nombre: c.name, disabled: !!c.disabled });

  return { cities, companies };
}

function extractHolidays(modules) {
  // Buscar `ci=[...]` y `ti=[...]` (feriados fijos MM-DD y fechas específicas)
  for (const [name, mod] of modules) {
    const src = mod.src;
    const idx = src.search(/var\s+ci=\[/);
    if (idx === -1) continue;
    const ciStart = src.indexOf('[', idx);
    const ciLit = extractBalanced(src, ciStart);
    const [fijos] = parseArray(ciLit, 0);
    // ti=([...]) después de ci
    const tiIdx = src.indexOf('ti=[', ciStart);
    if (tiIdx === -1) throw new Error('ti no encontrado');
    const tiStart = src.indexOf('[', tiIdx);
    const tiLit = extractBalanced(src, tiStart);
    const [especificos] = parseArray(tiLit, 0);
    return { feriados_fijos: fijos, feriados_especificos: especificos };
  }
  return { feriados_fijos: [], feriados_especificos: [] };
}

function extractFaresAndTimes(modules) {
  const chunkName = findChunkWith(modules, 'faresSUBE');
  if (!chunkName) throw new Error('no se encontró el chunk con faresSUBE');
  const src = modules.get(chunkName).src;

  const grab = (prop) => {
    const idx = src.indexOf(prop + '={');
    if (idx === -1) return null;
    const start = src.indexOf('{', idx);
    const lit = extractBalanced(src, start);
    const [v] = parseObject(lit, 0);
    return v;
  };

  const fares_sube = grab('this.faresSUBE') ?? {};
  const tarifas_genericas = grab('this.faresGeneric') ?? {};
  const tarifas_por_empresa = grab('this.companyFares') ?? {};

  // Diccionarios de tiempos: `var B={...},C={...},j={...},w={...};`
  const varB = src.indexOf('var B={');
  let tiempos = {};
  if (varB !== -1) {
    // desde 'var B=' hasta el próximo 'var ' de nivel módulo que inicia una clase
    const endIdx = src.indexOf('var H=', varB);
    const block = src.slice(src.indexOf('B={', varB), endIdx === -1 ? varB + 8000 : endIdx);
    // parsear asignaciones NAME={...} separadas por comas
    let i = 0;
    while (i < block.length) {
      const nameM = /^[A-Za-z_$][\w$]*\s*=\s*/.exec(block.slice(i));
      if (!nameM) break;
      const name = nameM[0].split('=')[0].trim();
      const eqEnd = i + nameM[0].length;
      if (block[eqEnd] !== '{') { i = eqEnd; continue; }
      const lit = extractBalanced(block, eqEnd);
      const [v] = parseObject(lit, 0);
      tiempos[name] = v;
      i = eqEnd + lit.length;
      while (i < block.length && /[\s,]/.test(block[i])) i++;
    }
  }

  return { fares_sube, tarifas_genericas, tarifas_por_empresa, tiempos };
}

// ---------- descubrimiento de chunks ----------

async function discoverChunks() {
  const html = await fetchText(BASE + '/');
  const mainMatch = /src="(main-[^"]+\.js)"/.exec(html) || /src="(chunk-[^"]+\.js)"/.exec(html);
  if (!mainMatch) throw new Error('no se encontró main js en el HTML');
  const mainName = mainMatch[1];
  const chunks = new Map();
  const queue = [mainName];
  const seen = new Set();

  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const src = await fetchText(`${BASE}/${name}`);
    chunks.set(name, src);
    const refs = new Set();
    for (const m of src.matchAll(/["']\.\/([\w.-]+\.js)["']/g)) refs.add(m[1]);
    for (const m of src.matchAll(/import\(["']\.\/([\w.-]+\.js)["']\)/g)) refs.add(m[1]);
    for (const r of refs) if (!seen.has(r)) queue.push(r);
  }
  return chunks;
}

// ---------- main ----------

const chunks = await discoverChunks();
console.log(`Chunks descubiertos: ${chunks.size}`);
for (const [n, s] of chunks) console.log(`  ${n} (${(s.length / 1024).toFixed(0)} kB)`);

const modules = new Map();
for (const [name, src] of chunks) modules.set(name, parseModuleInfo(name, src));
const resolve = makeResolver(modules);

const { schedules, unresolved, totalMatches, dupes } = extractSchedules(modules, resolve);
console.log(`Horarios parseados: ${totalMatches} matches, ${schedules.length} únicos, ${dupes} duplicados`);
if (unresolved.length) {
  console.warn('Identificadores sin resolver:');
  for (const [k, c] of unresolved) console.warn(`  ${k} x${c}`);
}

const { cities, companies } = extractCitiesCompanies(modules);
const { feriados_fijos, feriados_especificos } = extractHolidays(modules);
const { fares_sube, tarifas_genericas, tarifas_por_empresa, tiempos } = extractFaresAndTimes(modules);

const slugify = (s) => s.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

const data = {
  meta: {
    fuente: `${BASE}/`,
    fuente_dominio: 'horariosquebrada.com.ar',
    generado_en: new Date().toISOString(),
    licencia: 'Datos proporcionados por el titular de horario-quebrada.netlify.app con autorización expresa para uso en JujuyGo.',
    nota: 'Datos estáticos mantenidos manualmente por la fuente. hora_salida es el horario publicado; hora_llegada_estimada y precio son estimaciones calculadas por diccionarios de la fuente y deben re-verificarse antes de operaciones críticas.',
  },
  ciudades: cities.map(c => ({ ...c, slug: slugify(c.nombre) })),
  empresas: companies.map(c => ({ ...c, slug: slugify(c.nombre) })),
  feriados_fijos,
  feriados_especificos,
  horarios: schedules,
  tarifas: {
    sube: fares_sube,
    genericas: tarifas_genericas,
    por_empresa: tarifas_por_empresa,
  },
  tiempos_viaje: tiempos,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `// GENERADO por backend/scripts/importar-horario-quebrada.mjs — no editar a mano.\n// Fuente: ${BASE}/ (autorización del titular). Regenerar con: node scripts/importar-horario-quebrada.mjs\nexport default ${JSON.stringify(data, null, 1)};\n`);
console.log(`Escrito: ${OUT}`);
console.log(`Resumen: ${schedules.length} horarios, ${cities.length} ciudades, ${companies.length} empresas, ${Object.keys(tarifas_genericas ?? {}).length} tarifas genéricas`);

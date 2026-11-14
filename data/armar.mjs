// Arma data/travesia-v2.json a partir de datos crudos trazables.
// Uso: node data/armar.mjs <ruta al checkout de JujuyGo>
// - Horarios: registros crudos de backend/src/data/horario-quebrada.js (dataset autorizado).
//   NO se usa /api/hq/salidas: mezcla sentidos y no filtra por ciudad_destino (ver README-datos).
// - Duraciones de viaje: duracionEstimadaMinutos de backend/src/hq.js (réplica del diccionario de la fuente) => siempre "estimado".
// - Márgenes: backend/src/itinerario/margenes.js.
// - Coordenadas: /api/transporte/paradas y /api/lugares de producción (data/crudo/*.json).
// Ninguna hora se escribe a mano: se derivan y se verifican acá. Si algo no cierra, el script falla.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = process.argv[2];
if (!repo) throw new Error('Falta la ruta al checkout de JujuyGo');
const imp = p => import(pathToFileURL(join(repo, p)).href);
const dataset = (await imp('backend/src/data/horario-quebrada.js')).default;
const { duracionEstimadaMinutos } = await imp('backend/src/hq.js');
const margenes = await imp('backend/src/itinerario/margenes.js');
const aqui = new URL('.', import.meta.url);
const leer = f => JSON.parse(readFileSync(new URL(f, aqui), 'utf8'));
const lugaresApi = leer('crudo/lugares.json');
const paradasApi = leer('crudo/paradas.json');

const min = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const ciudad = id => dataset.ciudades.find(c => c.id === id);

// Frecuencia según el bundle de la fuente (data/crudo/fuente-frecuencia.txt).
const FRECUENCIA = {
  1: 'Todos los días',
  2: 'Lunes a viernes (no feriados)',
  3: 'Sábados, domingos y feriados',
  4: 'Solo sábados',
  5: 'Domingos y feriados',
};
function tipoDia(fecha) {
  const d = new Date(`${fecha}T12:00:00`);
  const md = fecha.slice(5);
  if (dataset.feriados_fijos.includes(md) || dataset.feriados_especificos.includes(fecha) || d.getDay() === 0) return 5;
  return d.getDay() === 6 ? 4 : 2;
}
const PERMITIDAS = { 2: [1, 2], 4: [1, 3, 4], 5: [1, 3, 5] };
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Parada: coordenadas solo si vienen de la base (/api/transporte/paradas).
// Mapa ciudad del dataset -> slug de parada RN9 en la base.
const PARADA_DB = { 10: 'terminal-jjs', 20: 'maimara', 21: 'tilcara', 24: 'humahuaca' };
function parada(idCiudad) {
  const c = ciudad(idCiudad);
  const db = paradasApi.find(p => p.slug === PARADA_DB[idCiudad]);
  return db
    ? { id_dataset: c.id, nombre: c.nombre, slug_db: db.slug, lat: db.lat, lng: db.lng, coordenadas: 'verificadas-en-base' }
    : { id_dataset: c.id, nombre: c.nombre, slug_db: null, lat: null, lng: null, coordenadas: 'sin-verificar' };
}
// Una foto del catálogo compartida por varios lugares pertenece al primero que la usa
// (orden de /api/lugares); los demás no la muestran como propia (ej. Paleta del Pintor usa purmamarca.jpg).
function lugar(slug) {
  const l = lugaresApi.find(x => x.slug === slug);
  if (!l) throw new Error(`lugar inexistente en catálogo: ${slug}`);
  const duenio = l.foto ? lugaresApi.find(x => x.foto === l.foto) : null;
  const propia = Boolean(l.foto) && duenio.slug === slug;
  return {
    slug, nombre: l.nombre, localidad: l.datos_json?.localidad ?? null, lat: l.lat, lng: l.lng, altitud_m: l.altitud_m,
    foto: propia ? l.foto : null,
    ...(propia ? {} : { foto_nota: l.foto ? `El catálogo no tiene foto propia de este lugar (repite la de ${duenio.nombre}).` : 'El catálogo no tiene foto de este lugar.' }),
  };
}

const usados = new Map();
function tramo(servicioId, subeEn, bajaEn, fecha) {
  const r = dataset.horarios.find(h => h.id === servicioId);
  if (!r) throw new Error(`servicio inexistente: ${servicioId}`);
  if (!PERMITIDAS[tipoDia(fecha)].includes(r.frecuencia)) throw new Error(`${servicioId} no corre el ${fecha} (frecuencia ${r.frecuencia})`);
  // Mismo sentido, y subida/bajada dentro del recorrido origen→destino del registro.
  const [lo, hi] = [Math.min(r.origen_id, r.destino_id), Math.max(r.origen_id, r.destino_id)];
  if ((r.destino_id > r.origen_id) !== (bajaEn > subeEn)) throw new Error(`${servicioId} va en otro sentido`);
  if (![subeEn, bajaEn].every(x => x >= lo && x <= hi)) throw new Error(`${servicioId} no cubre ${subeEn}->${bajaEn}`);
  // Si se baja en el destino del registro, la ciudad final tiene que ser esa (caso Perico).
  if (bajaEn === r.destino_id && r.ciudad_destino !== ciudad(bajaEn).nombre) throw new Error(`${servicioId} termina en ${r.ciudad_destino}, no en ${ciudad(bajaEn).nombre}`);
  // Solo los "Local por Purmamarca" entran al pueblo (filtro pueblo/ruta de la fuente).
  if ([subeEn, bajaEn].includes(19) && !/purmamarca/i.test(r.servicio)) throw new Error(`${servicioId} no entra a Purmamarca pueblo`);
  const esIntermedio = r.origen_id !== subeEn;
  const offset = esIntermedio ? duracionEstimadaMinutos(r.servicio, r.empresa, r.origen_id, subeEn) : 0;
  const viaje = duracionEstimadaMinutos(r.servicio, r.empresa, r.origen_id, bajaEn) - offset;
  if (!Number.isFinite(viaje) || viaje <= 0) throw new Error(`${servicioId}: sin duración para ${subeEn}->${bajaEn}`);
  const salida = min(r.hora) + offset;
  usados.set(servicioId, r);
  return {
    tipo: 'tramo',
    servicio_id: r.id,
    empresa: r.empresa,
    servicio: r.servicio,
    destino_final: r.ciudad_destino,
    desde: parada(subeEn),
    hasta: parada(bajaEn),
    salida: hhmm(salida),
    salida_confianza: esIntermedio ? 'estimado' : 'publicado',
    salida_nota: esIntermedio ? `Pasa por ${ciudad(subeEn).nombre}; sale de ${ciudad(r.origen_id).nombre} ${r.hora} (publicado)` : null,
    llegada: hhmm(salida + viaje),
    llegada_confianza: 'estimado',
    duracion_min: viaje,
    frecuencia: { codigo: r.frecuencia, texto: FRECUENCIA[r.frecuencia] },
  };
}
const yaPasaPor = (t, idCiudad) => {
  const r = usados.get(t.servicio_id);
  const off = duracionEstimadaMinutos(r.servicio, r.empresa, r.origen_id, idCiudad);
  return off === null ? null : hhmm(min(r.hora) + off);
};

const MARGEN = margenes.MARGEN_BASE_MINUTOS;
const MARGEN_LOCAL = margenes.MARGEN_BASE_MINUTOS + margenes.MARGEN_ACCESO_LOCAL_MINUTOS;
const DUR_DEFECTO = 120; // crearPlan() en frontend/src/app/travesia/travesia.model.ts

function visita(slug, llegadaParada, opciones = {}) {
  const l = lugar(slug);
  const inicio = llegadaParada ? hhmm(min(llegadaParada) + MARGEN) : null;
  return {
    tipo: 'visita',
    lugar: l,
    hora: inicio,
    hora_confianza: inicio ? 'estimado' : null,
    margen_min: MARGEN,
    duracion_min: opciones.duracion ?? DUR_DEFECTO,
    duracion_origen: 'Duración por defecto del planificador (no es un dato del lugar)',
    ...opciones.extra,
  };
}

// ── Itinerario de la ruta piloto (3 días, 2 noches; martes 17 a jueves 19 de noviembre de 2026) ──
const fechas = ['2026-11-17', '2026-11-18', '2026-11-19'];
fechas.forEach(f => { if (tipoDia(f) !== 2) throw new Error(`${f} no es día hábil`); });

// Día 1: SSJ -> Tilcara
const t1 = tramo('hq-0023', 10, 21, fechas[0]);
const v1 = visita('pucara-de-tilcara', t1.llegada);
const y1 = {
  tipo: 'yapa', tipo_yapa: 'localidad', lugar: lugar('garganta-del-diablo-tilcara'),
  mensaje: 'La Garganta del Diablo también queda en Tilcara.',
  hora_sugerida: null,
  cierre: {
    estado: 'sin-garantia',
    faltan: ['Tiempo de acceso desde el pueblo (no está en los datos)', 'Duración de la visita'],
    texto: 'Sin garantía de horario: no tenemos el tiempo de acceso ni la duración de la visita.',
  },
};

// Día 2: Tilcara -> Purmamarca pueblo -> Humahuaca
const t2 = tramo('hq-0595', 21, 19, fechas[1]);
const v2 = visita('cerro-siete-colores', t2.llegada);
const t3 = tramo('hq-0538', 19, 24, fechas[1]);
const finV2 = min(v2.hora) + v2.duracion_min + MARGEN;
if (finV2 > min(t3.salida)) throw new Error('El día 2 no cierra: la visita termina después del 14:40');
const pasoMaimara = yaPasaPor(t3, 20);
const y2 = {
  tipo: 'yapa', tipo_yapa: 'rn9', lugar: lugar('paleta-del-pintor'),
  mensaje: 'Mirá la Paleta del Pintor desde la ventanilla al pasar por Maimará.',
  hora_sugerida: pasoMaimara,
  cierre: {
    estado: 'cierra',
    razones: [
      `No te bajás: el ${t3.salida} de ${t3.empresa} pasa por Maimará ~${pasoMaimara} (estimado)`,
      'La parada de Maimará queda frente a la Paleta del Pintor (notas de parada de la base)',
      'No suma minutos ni cambia el servicio',
    ],
  },
};
const ventanaY3 = min(t3.llegada) + MARGEN;
const DUR_Y3 = 60;
const y3 = {
  tipo: 'yapa', tipo_yapa: 'localidad', lugar: lugar('monumento-independencia-humahuaca'),
  mensaje: 'El Monumento a los Héroes de la Independencia queda en Humahuaca, donde dormís.',
  hora_sugerida: hhmm(ventanaY3),
  cierre: {
    estado: 'cierra',
    razones: [
      `Llegás a Humahuaca ~${t3.llegada} (estimado) + ${MARGEN} min de margen = ${hhmm(ventanaY3)}`,
      `Con una visita de ${DUR_Y3} min (supuesto, no dato) terminás ~${hhmm(ventanaY3 + DUR_Y3)}`,
      'Dormís en Humahuaca: no dependés de otro colectivo hoy',
    ],
  },
};

// Día 3: Hornocal (traslado local) -> regreso a SSJ
const t4 = tramo('hq-0758', 24, 10, fechas[2]);
const limiteHornocal = hhmm(min(t4.salida) - MARGEN_LOCAL);
const v3 = {
  ...visita('serrania-del-hornocal', null),
  hora: null,
  duracion_min: null,
  duracion_origen: 'Sin dato: depende del traslado local',
  acceso_local: margenes.ACCESOS_LOCALES.get('serrania-del-hornocal'),
  badges: ['local', 'sin-horario', 'verificar-regreso'],
  regreso_limite: limiteHornocal,
  regreso_regla: `Volver a la terminal de Humahuaca antes de ${limiteHornocal}: ${MARGEN_LOCAL} min de margen con acceso local (margenes.js) antes del ${t4.salida}`,
};
const alternativas = ['hq-0759', 'hq-0764', 'hq-0766'].map(id => tramo(id, 24, 10, fechas[2]));
const descartados = [dataset.horarios.find(h => h.id === 'hq-0761')].map(r => ({
  servicio_id: r.id, empresa: r.empresa, servicio: r.servicio, salida: r.hora,
  motivo: `Termina en ${r.ciudad_destino}, no en San Salvador de Jujuy`,
}));

const dia = (numero, fecha, recorrido, items, noche) => {
  const lugaresDia = items.filter(i => i.tipo === 'visita').map(i => i.lugar);
  const tramos = items.filter(i => i.tipo === 'tramo');
  const condicionada = items.find(i => i.tipo === 'visita' && i.badges?.includes('verificar-regreso'));
  return {
    numero, fecha, dia_semana: DIAS[new Date(`${fecha}T12:00:00`).getDay()],
    recorrido, noche,
    foto: lugaresDia[0]?.foto ?? null,
    paradas: lugaresDia.length,
    // Span de los colectivos del día (no es la duración del día).
    rango: tramos.length ? { desde: tramos[0].salida, hasta: tramos.at(-1).llegada, confianza_hasta: 'estimado' } : null,
    estado: condicionada ? 'condicional' : 'cierra',
    estado_texto: condicionada
      ? `Cierra solo si volvés de ${condicionada.lugar.nombre} antes de las ${condicionada.regreso_limite}`
      : 'Cierra con los horarios cargados',
    items,
  };
};

const salida = {
  meta: {
    generado: new Date().toISOString(),
    aviso: 'Prototipo. Horarios tomados de los registros crudos del dataset autorizado y armados a mano en la forma del contrato. No es una travesía validada por el backend.',
    fuentes: {
      horarios: `${dataset.meta.fuente} — ${dataset.meta.licencia} (generado ${dataset.meta.generado_en})`,
      nota_fuente: dataset.meta.nota,
      duraciones: 'Diccionario de tiempos de la fuente (backend/src/hq.js duracionEstimadaMinutos): siempre estimado',
      frecuencia: 'Bundle público de la fuente (data/crudo/fuente-frecuencia.txt)',
      margenes: 'backend/src/itinerario/margenes.js',
      coordenadas: 'Producción /api/transporte/paradas y /api/lugares (data/crudo)',
    },
    bloqueos: [
      'Purmamarca pueblo no tiene parada ni coordenadas verificadas en la base: se muestra sin marcador.',
      'No hay geometría verificada del recorrido de los colectivos: las líneas son conexiones esquemáticas.',
      'Traslados a Hornocal: sin horario fijo en ninguna fuente.',
      'Distancia cruce–pueblo de Purmamarca sin confirmar (2 vs 3 km): no se muestran km.',
    ],
    frecuencias: FRECUENCIA,
  },
  dias: [
    dia(1, fechas[0], ['San Salvador de Jujuy', 'Tilcara'], [t1, v1, y1], 'Tilcara'),
    dia(2, fechas[1], ['Tilcara', 'Purmamarca', 'Humahuaca'], [t2, v2, t3, y2, y3], 'Humahuaca'),
    dia(3, fechas[2], ['Humahuaca', 'Hornocal', 'San Salvador de Jujuy'], [v3, t4], null),
  ],
  regreso_plan_b: { alternativas, descartados },
};
salida.dias[2].items.push({ tipo: 'plan-b', ...salida.regreso_plan_b });

writeFileSync(new URL('travesia-v2.json', aqui), `${JSON.stringify(salida, null, 2)}\n`);
writeFileSync(new URL('crudo/hq-registros-usados.json', aqui), `${JSON.stringify([...usados.values(), dataset.horarios.find(h => h.id === 'hq-0761')], null, 2)}\n`);
console.log('OK', [...usados.keys()].join(' '));
for (const d of salida.dias) {
  console.log(`Día ${d.numero} ${d.dia_semana} ${d.fecha}`);
  for (const i of d.items) {
    if (i.tipo === 'tramo') console.log(`  ${i.salida}[${i.salida_confianza}] → ${i.llegada}[est] ${i.empresa} ${i.servicio} ${i.desde.nombre}→${i.hasta.nombre} (${i.frecuencia.texto})`);
    else if (i.tipo === 'visita') console.log(`  visita ${i.lugar.nombre} ${i.hora ?? 'sin hora'} ${i.regreso_limite ? 'volver antes ' + i.regreso_limite : ''}`);
    else if (i.tipo === 'yapa') console.log(`  ✳ ${i.lugar.nombre} ${i.hora_sugerida ?? ''} ${i.cierre.estado}`);
    else console.log(`  plan B: ${i.alternativas.map(a => a.salida + ' ' + a.empresa).join(', ')} | descartado ${i.descartados.map(x => x.salida + ' ' + x.motivo).join('')}`);
  }
}

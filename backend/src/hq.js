// Capa de consulta sobre el dataset propio importado de horario-quebrada.netlify.app.
// Datos estáticos versionados en ./data/horario-quebrada.js (extracción única autorizada
// por el titular). No hay requests externos en runtime.
import data from './data/horario-quebrada.js';

export const HQ_FUENTE = 'Horarios Quebrada (horario-quebrada.netlify.app)';
export const HQ_CONFIANZA = 'publicado';
export const HQ_META = data.meta;

const CIUDADES = data.ciudades;
const POR_ID = new Map(CIUDADES.map(c => [c.id, c]));
const POR_SLUG = new Map(CIUDADES.map(c => [c.slug, c]));
const normalizar = s => String(s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ')
  .trim();
const POR_NOMBRE = new Map(CIUDADES.map(c => [normalizar(c.nombre), c]));

const EMPRESAS = data.empresas;

export function listarCiudades() {
  return CIUDADES.map(c => ({ ...c }));
}

export function listarEmpresas() {
  return EMPRESAS.map(e => ({ ...e }));
}

// Acepta id numérico, slug o nombre (con o sin acentos).
export function buscarCiudad(ref) {
  if (ref === undefined || ref === null || ref === '') return null;
  if (/^\d+$/.test(String(ref))) return POR_ID.get(Number(ref)) || null;
  const s = String(ref);
  return POR_SLUG.get(s) || POR_NOMBRE.get(normalizar(s)) || null;
}

function minutos(hora) {
  const [h, m] = String(hora).split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatoHora(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Réplica de getDictionaryKey del servicio de tiempos de la fuente.
function dictionaryKey(servicio, empresa, origenId, destinoId) {
  const s = String(servicio).toLowerCase();
  const e = String(empresa).toLowerCase();
  const norte = Number(origenId) > Number(destinoId);
  if (s.includes('urbano')) {
    if (norte) {
      if (e.includes('36')) return 'URBANO_NORTE_36';
      if (e.includes('39')) return 'URBANO_NORTE_39';
    }
    return 'URBANO_SUR';
  }
  if (s.includes('directo')) return 'DIRECTO';
  if (s.includes('rápido por maimará') || s.includes('rapido por maimara')) return 'RAPIDO_MAIMARA';
  if (s.includes('rápido por ruta') || s.includes('rapido por ruta')) return 'RAPIDO_RUTA';
  if (s.includes('rápido') || s.includes('rapido')) return 'RAPIDO';
  if (s.includes('local por purmamarca')) return 'LOCAL_PURMA';
  return 'LOCAL';
}

const T = data.tiempos_viaje;

// Réplica de calculateTravelTime: devuelve minutos estimados de viaje u null.
export function duracionEstimadaMinutos(servicio, empresa, origenId, destinoId) {
  const clave = dictionaryKey(servicio, empresa, origenId, destinoId);
  let dict;
  if (clave === 'URBANO_SUR') dict = T.j?.URBANO_SUR;
  else if (clave === 'URBANO_NORTE_36' || clave === 'URBANO_NORTE_39') dict = T.w?.[clave];
  else dict = Number(origenId) > Number(destinoId) ? T.C?.[clave] : T.B?.[clave];
  if (!dict) return null;
  const o = dict[String(origenId)];
  const d = dict[String(destinoId)];
  if (o === undefined || d === undefined) return null;
  let delta = Math.abs(d - o);
  if (clave === 'LOCAL_PURMA' && Number(origenId) > Number(destinoId) && Number(origenId) >= 20 && String(destinoId) === '18') {
    delta -= 10;
  }
  return delta === 0 ? null : delta;
}

function llaveTarifa(a, b) {
  return `${a}-${b}`;
}

function esSoloUrbano(servicio) {
  return String(servicio).toLowerCase().includes('urbano');
}

// Réplica de getPrice: tarifa en ARS para el par origen-destino.
// Prioridad: SUBE (urbano) > tarifa por empresa > tarifa genérica.
export function tarifaPar(origenId, destinoId, empresa, servicio) {
  const i = llaveTarifa(origenId, destinoId);
  const a = llaveTarifa(destinoId, origenId);
  const pick = obj => obj?.[i] ?? obj?.[a] ?? null;
  if (esSoloUrbano(servicio)) return pick(data.tarifas.sube);
  const porEmpresa = data.tarifas.por_empresa?.[empresa];
  if (porEmpresa) {
    const v = pick(porEmpresa);
    if (v !== null) return v;
  }
  return pick(data.tarifas.genericas);
}

export function tarifaGenerica(origenId, destinoId) {
  return tarifaPar(origenId, destinoId, null, null);
}

// Próximas salidas entre dos ciudades. Acepta id, slug o nombre.
// opciones: { desde: 'HH:MM', limite: n, incluir_todos_los_dias: bool }
export function salidas(origenRef, destinoRef, { desde, limite = 20 } = {}) {
  const origen = buscarCiudad(origenRef);
  const destino = buscarCiudad(destinoRef);
  if (!origen || !destino) {
    return { error: !origen ? `origen no encontrado: ${origenRef}` : `destino no encontrado: ${destinoRef}` };
  }
  if (origen.id === destino.id) {
    return { error: 'origen y destino no pueden ser la misma ciudad' };
  }

  const desdeMin = desde ? minutos(desde) : 0;
  const todos = data.horarios.filter(h =>
    (h.origen_id === origen.id && h.destino_id === destino.id) ||
    (h.origen_id === destino.id && h.destino_id === origen.id)
  );

  const items = todos
    .map(h => {
      const esIda = h.origen_id === origen.id;
      const dur = duracionEstimadaMinutos(h.servicio, h.empresa, h.origen_id, h.destino_id);
      const tarifa = tarifaPar(h.origen_id, h.destino_id, h.empresa, h.servicio);
      return {
        id: h.id,
        salida: h.hora,
        salida_minutos: minutos(h.hora),
        direccion: esIda ? 'ida' : 'vuelta',
        servicio: h.servicio,
        empresa: h.empresa,
        frecuencia_dias: h.frecuencia,
        ...(h.rapid_stops ? { rapid_stops: h.rapid_stops } : {}),
        duracion_minutos: dur,
        duracion_confianza: dur === null ? null : 'estimado',
        llegada_estimada: dur === null ? null : formatoHora(minutos(h.hora) + dur),
        tarifa_aros: tarifa === null ? null : tarifa,
        tarifa_moneda: tarifa === null ? null : 'ARS',
        fuente: HQ_FUENTE,
        confianza: HQ_CONFIANZA,
      };
    })
    .filter(s => s.salida_minutos >= desdeMin)
    .sort((x, y) => x.salida_minutos - y.salida_minutos || String(x.empresa).localeCompare(String(y.empresa)));

  // `direccion` en la respuesta marca si el servicio sale del origen pedido o del destino.
  return {
    origen: { ...origen },
    destino: { ...destino },
    total: items.length,
    servicios: items.slice(0, limite),
    fuente: HQ_FUENTE,
    generado_en: data.meta.generado_en,
  };
}

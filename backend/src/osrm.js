// Geometría de ruta siguiendo calles vía OSRM público (router.project-osrm.org).
// Se usa solo para el trazado del mapa; si el servicio no responde o falla,
// el caller cae al polyline recto entre paradas. Cache en memoria por tramo.

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const cache = new Map();
const CACHE_MAX = 300;

function cacheKey(puntos) {
  return puntos
    .map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`)
    .join(';');
}

function guardarCache(key, valor) {
  if (cache.size >= CACHE_MAX) {
    const primera = cache.keys().next().value;
    cache.delete(primera);
  }
  cache.set(key, valor);
}

// puntos: [[lat, lng], ...] con al menos 2 coordenadas.
// Devuelve [[lat, lng], ...] siguiendo la calle, o null si no se pudo calcular.
export async function obtenerGeometriaRuta(puntos, { fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  if (!Array.isArray(puntos) || puntos.length < 2) return null;
  const validos = puntos.filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (validos.length < 2) return null;

  const key = cacheKey(validos);
  if (cache.has(key)) return cache.get(key);

  // OSRM espera lng,lat
  const coords = validos.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;

  let geometria = null;
  try {
    const resp = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (resp.ok) {
      const json = await resp.json();
      const coordsGeo = json?.routes?.[0]?.geometry?.coordinates;
      if (Array.isArray(coordsGeo) && coordsGeo.length >= 2) {
        geometria = coordsGeo.map(([lng, lat]) => [lat, lng]);
      }
    }
  } catch {
    geometria = null;
  }

  guardarCache(key, geometria);
  return geometria;
}

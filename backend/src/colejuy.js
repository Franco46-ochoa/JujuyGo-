const COLEJUY_BASE_URL = 'https://colejuy.vercel.app/api';
const REQUEST_TIMEOUT_MS = 5000;

const CACHE_TTL_MS = {
  lines: 10 * 60 * 1000,
  network: 10 * 60 * 1000,
  line: 60 * 60 * 1000,
  fleet: 30 * 1000,
};

export class ColejuyError extends Error {
  constructor(message, { status = null, cause } = {}) {
    super(message, { cause });
    this.name = 'ColejuyError';
    this.status = status;
  }
}

export function createColejuyClient({
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
} = {}) {
  const cache = new Map();

  async function get(path, cacheKey, ttl) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now()) return cached.data;
    if (cached) cache.delete(cacheKey);

    let response;
    try {
      response = await fetchImpl(`${COLEJUY_BASE_URL}${path}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      throw new ColejuyError(
        timedOut
          ? 'El servicio de colectivos urbanos tardó demasiado en responder'
          : 'No se pudo conectar con el servicio de colectivos urbanos',
        { cause: error },
      );
    }

    if (response.status !== 200) {
      throw new ColejuyError(
        `El servicio de colectivos urbanos respondió con error (HTTP ${response.status})`,
        { status: response.status },
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new ColejuyError('El servicio de colectivos urbanos devolvió una respuesta inválida', {
        cause: error,
      });
    }

    cache.set(cacheKey, { data, expiresAt: now() + ttl });
    return data;
  }

  return {
    getLines: () => get('/lines', 'lines', CACHE_TTL_MS.lines),
    getNetwork: () => get('/network', 'network', CACHE_TTL_MS.network),
    getLine: id => {
      const encodedId = encodeURIComponent(id);
      return get(`/lines/${encodedId}`, `line:${encodedId}`, CACHE_TTL_MS.line);
    },
    getFleet: () => get('/fleet', 'fleet', CACHE_TTL_MS.fleet),
  };
}

export const colejuyClient = createColejuyClient();

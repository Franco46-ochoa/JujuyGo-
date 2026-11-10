import { Router } from 'express';
import { ColejuyError, colejuyClient } from '../colejuy.js';

const FUENTE = 'colejuy.vercel.app';
const EARTH_RADIUS_M = 6371000;
const MAX_NEARBY_STOPS = 50;

function actualizadoEn(data, now = new Date()) {
  const upstreamDate = data?.updatedAt ?? data?.actualizado_en ?? data?.updated_at;
  if (upstreamDate !== undefined && upstreamDate !== null) {
    const parsedDate = new Date(upstreamDate);
    if (!Number.isNaN(parsedDate.getTime())) return parsedDate.toISOString();
  }
  return now.toISOString();
}

function withMetadata(data, now = new Date()) {
  return {
    ...data,
    fuente: FUENTE,
    actualizado_en: actualizadoEn(data, now),
  };
}

function sendUpstreamError(error, res, next, { notFoundIs404 = false } = {}) {
  if (!(error instanceof ColejuyError)) return next(error);

  const status = notFoundIs404 && error.status === 404 ? 404 : 502;
  return res.status(status).json({
    error: status === 404 ? 'Línea urbana no encontrada' : error.message,
    fuente: FUENTE,
    actualizado_en: new Date().toISOString(),
  });
}

function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const radians = degrees => (degrees * Math.PI) / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLng = radians(lng2 - lng1);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseCoordinate(value, minimum, maximum) {
  if (value === undefined || value === '' || !Number.isFinite(Number(value))) return null;
  const number = Number(value);
  return number < minimum || number > maximum ? null : number;
}

export function createUrbanoRouter(client = colejuyClient) {
  const router = Router();

  router.get('/lineas', async (_req, res, next) => {
    try {
      res.json(withMetadata(await client.getLines()));
    } catch (error) {
      sendUpstreamError(error, res, next);
    }
  });

  router.get('/red', async (_req, res, next) => {
    try {
      res.json(withMetadata(await client.getNetwork()));
    } catch (error) {
      sendUpstreamError(error, res, next);
    }
  });

  router.get('/linea/:id', async (req, res, next) => {
    try {
      const data = await client.getLine(req.params.id);
      if (data?.line == null) {
        return res.status(404).json({
          error: 'Línea urbana no encontrada',
          fuente: FUENTE,
          actualizado_en: new Date().toISOString(),
        });
      }
      const paths = Array.isArray(data.paths) ? data.paths
        : Array.isArray(data.line?.paths) ? data.line.paths : [];
      res.json(withMetadata({ ...data, paths }));
    } catch (error) {
      sendUpstreamError(error, res, next, { notFoundIs404: true });
    }
  });

  router.get('/flota', async (_req, res, next) => {
    try {
      res.json(withMetadata(await client.getFleet()));
    } catch (error) {
      sendUpstreamError(error, res, next);
    }
  });

  router.get('/paradas-cercanas', async (req, res, next) => {
    const lat = parseCoordinate(req.query.lat, -90, 90);
    const lng = parseCoordinate(req.query.lng, -180, 180);
    const radio = req.query.radio_m === undefined ? 500 : parseCoordinate(req.query.radio_m, 1, 50000);
    if (lat === null || lng === null || radio === null) {
      return res.status(400).json({
        error: 'lat y lng deben ser coordenadas válidas; radio_m debe ser un número entre 1 y 50000',
        fuente: FUENTE,
        actualizado_en: new Date().toISOString(),
      });
    }

    try {
      const network = await client.getNetwork();
      if (!Array.isArray(network?.lines)) {
        throw new ColejuyError('El servicio de colectivos urbanos devolvió una red inválida');
      }
      const paradas = network.lines.flatMap(line => (Array.isArray(line.stops) ? line.stops : [])
        .map(stop => {
          const stopLat = parseCoordinate(stop.lat, -90, 90);
          const stopLng = parseCoordinate(stop.lng, -180, 180);
          return {
            ...stop,
            linea_id: line.id,
            linea: line.name,
            distancia_m: stopLat === null || stopLng === null
              ? null
              : haversineDistanceMeters(lat, lng, stopLat, stopLng),
          };
        }))
        .filter(stop => stop.distancia_m !== null && stop.distancia_m <= radio)
        .sort((a, b) => a.distancia_m - b.distancia_m)
        .slice(0, MAX_NEARBY_STOPS);
      res.json(withMetadata({ paradas }, new Date()));
    } catch (error) {
      sendUpstreamError(error, res, next);
    }
  });

  return router;
}

export default createUrbanoRouter();

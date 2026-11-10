import { Router } from 'express';
import {
  HQ_FUENTE,
  HQ_META,
  listarCiudades,
  listarEmpresas,
  salidas,
} from '../hq.js';

const router = Router();

router.get('/ciudades', (_req, res) => {
  res.json({ ciudades: listarCiudades(), fuente: HQ_FUENTE });
});

router.get('/empresas', (_req, res) => {
  res.json({ empresas: listarEmpresas(), fuente: HQ_FUENTE });
});

router.get('/salidas', (req, res) => {
  const { origen, destino, desde, limite } = req.query;
  if (!origen || !destino) {
    return res.status(400).json({ error: 'Faltan parametros origen y destino' });
  }
  const lim = limite === undefined ? 20 : Number(limite);
  if (!Number.isInteger(lim) || lim < 1 || lim > 100) {
    return res.status(400).json({ error: 'limite debe ser un entero entre 1 y 100' });
  }
  if (desde !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(desde)) {
    return res.status(400).json({ error: 'desde debe tener formato HH:MM' });
  }
  const r = salidas(origen, destino, { desde, limite: lim });
  if (r.error) return res.status(404).json(r);
  res.json(r);
});

router.get('/meta', (_req, res) => {
  res.json({ ...HQ_META, fuente_api: HQ_FUENTE });
});

export default router;

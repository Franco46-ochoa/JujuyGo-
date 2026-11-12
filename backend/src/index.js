import express from 'express';
import pg from 'pg';
import { createCatalogoRouter } from './routes/catalogo.js';
import { createTravesiaRouter } from './routes/travesia.js';
import { createHospedajeRouter } from './routes/hospedaje.js';
import transporteRouter from './routes/transporte.js';
import hqRouter from './routes/hq.js';
import { colejuyClient } from './colejuy.js';
import { createUrbanoRouter } from './routes/urbano.js';
import yapaLlmRouter from './routes/yapa-llm.js';

function crearPool() {
  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_TEST;
  const esSupabase = /supabase\.(co|com)/.test(connectionString || '');
  return new pg.Pool({
    connectionString,
    max: 2,
    idleTimeoutMillis: 10000,
    ...(esSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

export function createApp({ pool = crearPool(), urbanoClient = colejuyClient } = {}) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const origenes = (process.env.CORS_ORIGIN || '*')
    .split(',').map(o => o.trim()).filter(Boolean);
  app.use('/api', (req, res, next) => {
    const origen = req.headers.origin;
    const permitir = origenes.includes('*') || (origen && origenes.includes(origen));
    res.set('Access-Control-Allow-Origin', permitir ? (origen || '*') : origenes[0]);
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use('/api', createCatalogoRouter(pool));
  app.use('/api', createHospedajeRouter(pool));
  app.use('/api', createTravesiaRouter(pool));
  app.use('/api/hq', hqRouter);
  app.use('/api/urbano', createUrbanoRouter(urbanoClient));
  app.use('/api', transporteRouter);
  app.use('/api', yapaLlmRouter);
  app.use(transporteRouter);
  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

import { pathToFileURL } from 'node:url';

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => {
    console.log(`backend escuchando en :${port}`);
  });
}

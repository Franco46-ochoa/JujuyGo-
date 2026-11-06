import express from 'express';
import pg from 'pg';
import { createCatalogoRouter } from './routes/catalogo.js';
import transporteRouter from './routes/transporte.js';

export function createApp({ pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_URL_TEST,
}) } = {}) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use('/api', createCatalogoRouter(pool));
  app.use('/api', transporteRouter);
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

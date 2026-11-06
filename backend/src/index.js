import express from 'express';
import transporteRouter from './routes/transporte.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Router de transporte registrado bajo /api (y también accesible directo para conveniencia)
  app.use('/api', transporteRouter);
  app.use(transporteRouter);

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

import { createApp } from '../src/index.js';

const app = createApp();

export const config = {
  maxDuration: 30,
};

export default function handler(req, res) {
  if (req.url === '/api/health') {
    res.status(200).json({ status: 'ok' });
    return;
  }
  return app(req, res);
}

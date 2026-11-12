import { createApp } from '../src/index.js';

const app = createApp();

export const config = {
  maxDuration: 30,
};

export default function handler(req, res) {
  return app(req, res);
}

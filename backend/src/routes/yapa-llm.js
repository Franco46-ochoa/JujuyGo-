import { Router } from 'express';
import { redactarYapa } from '../llm.js';

const router = Router();

// POST /api/yapa/redactar — el LLM propone el texto; el cliente decide usarlo
// o quedarse con el mensaje de reglas (fallback). Body:
// { tipo, lugar, mensaje, contexto? , yapas?: [{tipo,lugar,mensaje,contexto?}] }
router.post('/yapa/redactar', async (req, res) => {
  const items = Array.isArray(req.body?.yapas) && req.body.yapas.length
    ? req.body.yapas
    : (req.body?.mensaje ? [req.body] : []);
  if (!items.length || items.length > 6) {
    return res.status(400).json({ error: 'Se espera yapas (1 a 6)' });
  }
  const clean = items.map(y => ({
    tipo: String(y.tipo || '').slice(0, 40),
    lugar: String(y.lugar || '').slice(0, 120),
    mensajeBase: String(y.mensaje || '').slice(0, 500),
    contexto: String(y.contexto || '').slice(0, 200) || undefined,
  })).filter(y => y.tipo && y.lugar && y.mensajeBase);
  if (!clean.length) return res.status(400).json({ error: 'yapas inválidas' });

  const mensajes = await Promise.all(clean.map(redactarYapa));
  res.json({
    mensajes: mensajes.map((m, i) => ({ mensaje: m ?? clean[i].mensajeBase, fuente: m ? 'llm' : 'reglas' })),
  });
});

export default router;

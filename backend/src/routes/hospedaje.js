import { Router } from 'express';

const asyncHandler = handler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export function createHospedajeRouter(pool) {
  const router = Router();

  router.get('/hospedajes', asyncHandler(async (req, res) => {
    const zona = typeof req.query.zona === 'string' ? req.query.zona : null;
    const values = zona ? [zona] : [];
    const filter = zona ? 'WHERE zona_slug = $1' : '';
    const { rows } = await pool.query(
      `SELECT id, nombre, slug, tipo, localidad, zona_slug, descripcion,
              contacto_url, fuente, verificado
       FROM hospedaje ${filter}
       ORDER BY localidad, nombre`,
      values,
    );
    res.json(rows);
  }));

  router.get('/guias', asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT id, nombre, zona_slug, especialidad, fuente, verificado
       FROM guia
       ORDER BY zona_slug NULLS LAST, nombre`,
    );
    res.json(rows);
  }));

  return router;
}

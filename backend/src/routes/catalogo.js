import { Router } from 'express';

const asyncHandler = handler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const lugarFields = `
  l.id, l.nombre, l.slug, l.lat, l.lng, l.altitud_m, l.descripcion,
  l.como_llegar, l.mejor_epoca, l.foto, l.datos_json,
  z.nombre AS zona, z.slug AS zona_slug
`;

export function createCatalogoRouter(pool) {
  const router = Router();

  router.get('/zonas', asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(`
      SELECT z.id, z.nombre, z.slug, z.descripcion, z.orden,
        CASE WHEN l.id IS NULL THEN NULL ELSE json_build_object(
          'nombre', l.nombre,
          'slug', l.slug,
          'altitud_m', l.altitud_m,
          'foto', l.foto,
          'como_llegar', l.como_llegar
        ) END AS lugar_destacado
      FROM zona z
      LEFT JOIN LATERAL (
        SELECT l.id, l.nombre, l.slug, l.altitud_m, l.foto, l.como_llegar
        FROM lugar l
        WHERE l.zona_id = z.id
        ORDER BY (l.foto IS NULL), l.id
        LIMIT 1
      ) l ON true
      ORDER BY z.orden, z.nombre
    `);
    res.json(rows);
  }));

  router.get('/zonas/:slug', asyncHandler(async (req, res) => {
    const result = await pool.query(
      'SELECT id, nombre, slug, descripcion, orden FROM zona WHERE slug = $1',
      [req.params.slug],
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Zona no encontrada' });

    const zona = result.rows[0];
    const lugares = await pool.query(
      `SELECT ${lugarFields} FROM lugar l JOIN zona z ON z.id = l.zona_id
       WHERE z.id = $1 ORDER BY l.nombre`,
      [zona.id],
    );
    res.json({ ...zona, lugares: lugares.rows });
  }));

  router.get('/lugares', asyncHandler(async (req, res) => {
    const zona = typeof req.query.zona === 'string' ? req.query.zona : null;
    const values = zona ? [zona] : [];
    const filter = zona ? 'WHERE z.slug = $1' : '';
    const { rows } = await pool.query(
      `SELECT ${lugarFields} FROM lugar l JOIN zona z ON z.id = l.zona_id
       ${filter} ORDER BY z.orden, l.nombre`,
      values,
    );
    res.json(rows);
  }));

  router.get('/lugares/:slug', asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT ${lugarFields} FROM lugar l JOIN zona z ON z.id = l.zona_id
       WHERE l.slug = $1`,
      [req.params.slug],
    );
    if (!rows.length) return res.status(404).json({ error: 'Lugar no encontrado' });
    res.json(rows[0]);
  }));

  return router;
}

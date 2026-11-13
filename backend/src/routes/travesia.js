import { Router } from 'express';
import { horaAMinutos, resolverParadaLugar, validarItinerario } from '../itinerario/validar.js';
import { ACCESOS_LOCALES, MARGEN_ACCESO_LOCAL_MINUTOS, MARGEN_BASE_MINUTOS } from '../itinerario/margenes.js';

const asyncHandler = handler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function esPlanValido(plan) {
  return plan && Array.isArray(plan.dias) && plan.dias.length > 0
    && plan.dias.every(dia => dia && Array.isArray(dia.eventos)
      && (dia.hora_inicio === undefined || horaAMinutos(dia.hora_inicio) !== null)
      && (dia.hora_cierre === undefined || horaAMinutos(dia.hora_cierre) !== null)
      && (dia.origen === undefined || typeof dia.origen === 'string')
      && (dia.cierre === undefined || typeof dia.cierre === 'string')
      && dia.eventos.every(evento => evento
        && typeof evento.lugar === 'string'
        && horaAMinutos(evento.hora) !== null
        && (evento.duracion_minutos === undefined
          || Number.isInteger(evento.duracion_minutos) && evento.duracion_minutos >= 0
          && evento.duracion_minutos <= 1440)));
}

function agruparHorarios(rows) {
  const servicios = new Map();
  for (const row of rows) {
    const key = `${row.servicio_id}:${row.direccion}`;
    if (!servicios.has(key)) {
      servicios.set(key, {
        servicio_id: row.servicio_id,
        direccion: row.direccion,
        paradas: [],
      });
    }
    servicios.get(key).paradas.push({
      slug: row.parada_slug,
      orden_en_linea: row.orden_en_linea,
      hora: row.hora,
      confianza: row.confianza,
      fuente: row.fuente,
    });
  }
  return [...servicios.values()];
}

export function createTravesiaRouter(pool) {
  const router = Router();

  router.get('/travesia/contexto', asyncHandler(async (_req, res) => {
    const [paradasResult, horariosResult] = await Promise.all([
      pool.query(
        `SELECT slug, nombre, orden_en_linea
         FROM parada
         WHERE linea_id = 'rn9'
         ORDER BY orden_en_linea`,
      ),
      pool.query(
        `SELECT h.servicio_id, h.direccion, to_char(h.hora_saliente, 'HH24:MI') AS hora,
                h.confianza, h.fuente, p.slug AS parada_slug, p.orden_en_linea
         FROM horario h
         JOIN parada p ON p.id = h.parada_id
         WHERE h.linea_id = 'rn9'
         ORDER BY h.servicio_id, p.orden_en_linea`,
      ),
    ]);

    res.json({
      paradas: paradasResult.rows,
      horarios: agruparHorarios(horariosResult.rows),
      margenes: {
        base_minutos: MARGEN_BASE_MINUTOS,
        acceso_local_minutos: MARGEN_ACCESO_LOCAL_MINUTOS,
        accesos_locales: [...ACCESOS_LOCALES.keys()],
      },
    });
  }));

  router.post('/travesia/validar', asyncHandler(async (req, res) => {
    const plan = req.body;
    if (!esPlanValido(plan)) {
      return res.status(400).json({
        error: 'El plan debe incluir días con eventos que tengan lugar y hora.',
      });
    }

    const slugs = [...new Set(plan.dias.flatMap(dia => dia.eventos.map(evento => evento.lugar)))];
    const [lugaresResult, horariosResult] = await Promise.all([
      pool.query(
        `SELECT slug, nombre, datos_json
         FROM lugar
         WHERE slug = ANY($1::text[])`,
        [slugs],
      ),
      pool.query(
        `SELECT h.servicio_id, h.direccion, to_char(h.hora_saliente, 'HH24:MI') AS hora,
                h.confianza, h.fuente, p.slug AS parada_slug, p.orden_en_linea
         FROM horario h
         JOIN parada p ON p.id = h.parada_id
         WHERE h.linea_id = 'rn9'
         ORDER BY h.servicio_id, p.orden_en_linea`,
      ),
    ]);

    const lugaresPorSlug = new Map(lugaresResult.rows.map(lugar => [lugar.slug, lugar]));
    const faltantes = slugs.filter(slug => !lugaresPorSlug.has(slug));
    if (faltantes.length) {
      return res.status(422).json({
        error: 'El plan contiene lugares que no existen en el catálogo.',
        lugares: faltantes,
      });
    }

    const lugares = lugaresResult.rows.map(lugar => ({
      ...lugar,
      parada: resolverParadaLugar(lugar),
    }));

    res.json(validarItinerario(plan, {
      lugares,
      horarios: agruparHorarios(horariosResult.rows),
    }));
  }));

  return router;
}

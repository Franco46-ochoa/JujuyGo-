import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatMinutes(mins) {
  const horas = Math.floor(mins / 60);
  const restantes = mins % 60;
  if (horas === 0) return `${restantes}m`;
  if (restantes === 0) return `${horas}h`;
  return `${horas}h ${restantes}m`;
}

function formatTime(t) {
  if (!t) return t;
  return t.slice(0, 5);
}

// GET /api/transporte/paradas?linea=rn9
// Lista de paradas en orden según orden_en_linea
router.get(['/transporte/paradas', '/paradas'], async (req, res) => {
  try {
    const lineaId = req.query.linea || 'rn9';

    const lineaCheck = await query('SELECT id, nombre, descripcion FROM linea WHERE id = $1', [lineaId]);
    if (lineaCheck.rows.length === 0) {
      return res.status(404).json({ error: `Línea no encontrada: ${lineaId}` });
    }

    const { rows } = await query(
      `SELECT id, linea_id, nombre, slug, orden_en_linea, lat, lng, tipo, notas
       FROM parada
       WHERE linea_id = $1
       ORDER BY orden_en_linea ASC`,
      [lineaId]
    );

    const paradas = rows.map(r => ({
      ...r,
      lat: r.lat !== null ? Number(r.lat) : null,
      lng: r.lng !== null ? Number(r.lng) : null
    }));

    res.json(paradas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transporte/proximos?origen=<slug>&destino=<slug>[&hora=HH:MM]
// Próximos servicios entre origen y destino con hora estimada de llegada,
// duración aproximada entre paradas y confianza del dato.
router.get(['/transporte/proximos', '/proximos'], async (req, res) => {
  try {
    const { origen, destino, hora } = req.query;

    if (!origen || !destino) {
      return res.status(400).json({ error: 'Se requieren los parámetros origen y destino (slugs de parada)' });
    }

    if (origen === destino) {
      return res.status(400).json({ error: 'El origen y el destino no pueden ser la misma parada' });
    }

    const { rows: paradas } = await query(
      `SELECT id, linea_id, nombre, slug, orden_en_linea, lat, lng, tipo, notas
       FROM parada
       WHERE slug IN ($1, $2)`,
      [origen, destino]
    );

    const pOrigen = paradas.find(p => p.slug === origen);
    const pDestino = paradas.find(p => p.slug === destino);

    if (!pOrigen) {
      return res.status(404).json({ error: `Parada de origen no encontrada: ${origen}` });
    }
    if (!pDestino) {
      return res.status(404).json({ error: `Parada de destino no encontrada: ${destino}` });
    }

    if (pOrigen.linea_id !== pDestino.linea_id) {
      return res.status(400).json({ error: 'Las paradas pertenecen a distintas líneas' });
    }

    const direccion = pOrigen.orden_en_linea < pDestino.orden_en_linea ? 'ida' : 'vuelta';

    const { rows: horariosRaw } = await query(
      `SELECT 
         h1.id AS horario_origen_id,
         h2.id AS horario_destino_id,
         h1.servicio_id,
         h1.linea_id,
         l.nombre AS linea_nombre,
         h1.hora_saliente AS hora_salida,
         h2.hora_saliente AS hora_llegada,
         h1.frecuencia_dias,
         h1.fuente AS fuente_origen,
         h2.fuente AS fuente_destino,
         h1.confianza AS confianza_origen,
         h2.confianza AS confianza_destino
       FROM horario h1
       JOIN horario h2 ON h1.servicio_id = h2.servicio_id AND h1.direccion = h2.direccion
       JOIN linea l ON l.id = h1.linea_id
       WHERE h1.parada_id = $1
         AND h2.parada_id = $2
         AND h1.direccion = $3
       ORDER BY h1.hora_saliente ASC`,
      [pOrigen.id, pDestino.id, direccion]
    );

    const servicios = horariosRaw.map(row => {
      const minSalida = timeToMinutes(row.hora_salida);
      const minLlegada = timeToMinutes(row.hora_llegada);
      let duracionMinutos = minLlegada - minSalida;
      if (duracionMinutos < 0) {
        duracionMinutos += 24 * 60;
      }

      // La confianza global del tramo es 'estimado' si alguno de los extremos es estimado
      let confianza = 'publicado';
      if (row.confianza_origen === 'estimado' || row.confianza_destino === 'estimado') {
        confianza = 'estimado';
      }
      if (row.confianza_origen === 'tiempo-real' || row.confianza_destino === 'tiempo-real') {
        confianza = 'tiempo-real';
      }

      const fuente = row.fuente_origen === row.fuente_destino
        ? row.fuente_origen
        : `${row.fuente_origen} / ${row.fuente_destino}`;

      const duracionTexto = formatMinutes(duracionMinutos);
      const horaSalidaFmt = formatTime(row.hora_salida);
      const horaLlegadaFmt = formatTime(row.hora_llegada);

      return {
        servicio_id: row.servicio_id,
        linea_id: row.linea_id,
        linea_nombre: row.linea_nombre,
        hora_salida: horaSalidaFmt,
        hora_llegada: horaLlegadaFmt,
        hora_estimada_llegada: horaLlegadaFmt,
        duracion_minutos: duracionMinutos,
        duracion_estimada: duracionTexto,
        duracion_aproximada: duracionTexto,
        confianza,
        fuente,
        frecuencia_dias: row.frecuencia_dias
      };
    });

    let filtrados = servicios;
    if (hora) {
      const minFiltro = timeToMinutes(hora);
      filtrados = servicios.filter(s => timeToMinutes(s.hora_salida) >= minFiltro);
    }

    res.json({
      origen: {
        id: pOrigen.id,
        nombre: pOrigen.nombre,
        slug: pOrigen.slug,
        tipo: pOrigen.tipo,
        orden_en_linea: pOrigen.orden_en_linea,
        notas: pOrigen.notas,
        lat: pOrigen.lat !== null ? Number(pOrigen.lat) : null,
        lng: pOrigen.lng !== null ? Number(pOrigen.lng) : null
      },
      destino: {
        id: pDestino.id,
        nombre: pDestino.nombre,
        slug: pDestino.slug,
        tipo: pDestino.tipo,
        orden_en_linea: pDestino.orden_en_linea,
        notas: pDestino.notas,
        lat: pDestino.lat !== null ? Number(pDestino.lat) : null,
        lng: pDestino.lng !== null ? Number(pDestino.lng) : null
      },
      direccion,
      servicios: filtrados
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

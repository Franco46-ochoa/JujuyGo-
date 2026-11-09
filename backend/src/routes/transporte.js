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
      `SELECT h1.id AS horario_origen_id,
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

const BASE_ORIGINS = {
  'terminal-jjs': {
    slug: 'terminal-jjs',
    nombre: 'Terminal de Ómnibus SS.Jujuy',
    tipo: 'terminal',
    lat: -24.2128,
    lng: -65.2891,
    parada_slug: 'terminal-jjs',
  },
  'aeropuerto-jujuy': {
    slug: 'aeropuerto-jujuy',
    nombre: 'Aeropuerto Jujuy (Dr. Horacio Guzmán)',
    tipo: 'aeropuerto',
    lat: -24.3928,
    lng: -65.0978,
    parada_slug: 'terminal-jjs',
    traslado_inicial: {
      titulo: 'Traslado al corredor troncal RN9',
      tipo: 'transfer-aeropuerto',
      distancia_km: 33,
      duracion_estimada: '35-40 min',
      descripcion: 'Tomá un taxi, remise oficial o transfer privado desde el Aeropuerto hasta la Terminal de Ómnibus SS.Jujuy (33 km por autopista RN66).'
    }
  }
};

const LUGAR_PARADA_MAPPING = {
  'cerro-siete-colores': {
    parada_slug: 'purmamarca-cruce',
    traslado_final: {
      tipo: 'cruce-a-pueblo',
      distancia_km: 3,
      duracion_estimada: '5-10 min en vehículo / 35-40 min a pie',
      descripcion: 'Purmamarca Cruce queda sobre la RN9, a 3 km del pueblo. Los colectivos troncales de la RN9 no entran al pueblo; tomá un remise local en el cruce o caminá los 3 km por RN52 hacia la plaza y el Cerro de los Siete Colores.'
    }
  },
  'garganta-del-diablo-tilcara': {
    parada_slug: 'tilcara',
    traslado_final: {
      tipo: 'acceso-montaña',
      distancia_km: 5,
      duracion_estimada: '15 min en vehículo / 1h 30m a pie',
      descripcion: 'El colectivo llega a la Terminal de Tilcara. El acceso a la Garganta del Diablo es por un camino de montaña y ripio (caminata exigente con desnivel o remise local contratado en el pueblo).'
    }
  },
  'pucara-de-tilcara': {
    parada_slug: 'tilcara',
    traslado_final: {
      tipo: 'caminata-urbana',
      distancia_km: 1.5,
      duracion_estimada: '15-20 min a pie',
      descripcion: 'Desde la Terminal de Tilcara caminás hacia el sur atravesando el casco urbano y cruzando el río Huasamayo hasta el acceso al Pucará.'
    }
  },
  'paleta-del-pintor': {
    parada_slug: 'maimara',
    traslado_final: {
      tipo: 'caminata-mirador',
      distancia_km: 0.5,
      duracion_estimada: '5-10 min a pie',
      descripcion: 'La parada sobre RN9 queda frente a Maimará. La Paleta del Pintor se aprecia directamente desde la ruta y desde miradores del pueblo a pocos minutos a pie.'
    }
  },
  'monumento-independencia-humahuaca': {
    parada_slug: 'humahuaca',
    traslado_final: {
      tipo: 'caminata-urbana',
      distancia_km: 0.6,
      duracion_estimada: '10 min a pie',
      descripcion: 'Desde la Terminal de Humahuaca caminás hacia la plaza central y subís las escalinatas hacia el Monumento a los Héroes de la Independencia.'
    }
  },
  'serrania-del-hornocal': {
    parada_slug: 'humahuaca',
    traslado_final: {
      tipo: 'traslado-altura',
      distancia_km: 25,
      duracion_estimada: '45-50 min en vehículo 4x4/remise',
      descripcion: 'El colectivo de línea RN9 llega únicamente hasta la Terminal de Humahuaca. El mirador del Hornocal queda a 25 km al este por camino sinuoso de ripio a 4.350 msnm; contratá una excursión o remise local en Humahuaca.'
    }
  },
  'tren-solar-estacion-volcan': {
    parada_slug: 'volcan',
    traslado_final: {
      tipo: 'caminata-estacion',
      distancia_km: 0.3,
      duracion_estimada: '5 min a pie',
      descripcion: 'Bajás en la parada Volcán sobre la RN9; la estación del Tren Solar está a unos 300 metros hacia el cuadro de estación.'
    }
  },
  'salinas-grandes': {
    tiene_servicio_rn9: false,
    parada_conexion: 'purmamarca-cruce',
    motivo: 'Las Salinas Grandes se encuentran en la Puna sobre la RN52 a 3.450 msnm, fuera de la traza troncal de la RN9.',
    alternativa_honesta: 'Tomá el colectivo troncal RN9 hasta Purmamarca Cruce (o Tilcara) y continuá en excursión o traslado particular subiendo por la RN52 y la Cuesta de Lipán (aprox. 65 km de camino de alta montaña).'
  },
  'laguna-de-los-pozuelos': {
    tiene_servicio_rn9: false,
    parada_conexion: 'abra-pampa',
    motivo: 'La Laguna de los Pozuelos queda a 50 km al oeste de la RN9 por caminos secundarios de ripio (RP 7 y RP 69) sin transporte regular.',
    alternativa_honesta: 'Tomá el colectivo RN9 hasta la Terminal de Abra Pampa. Desde allí, contratá un remise particular o vehículo 4x4 local para el trayecto ida y vuelta.'
  },
  'parque-nacional-calilegua': {
    tiene_servicio_rn9: false,
    motivo: 'El Parque Nacional Calilegua está en las Yungas (corredor RN34), no en la Quebrada ni Puna (RN9).',
    alternativa_honesta: 'Desde la Terminal de San Salvador de Jujuy, tomá un transporte interurbano por RN34 hacia Libertador General San Martín / San Pedro, y desde allí un remise o servicio local al parque.'
  },
  'termas-de-caimancito': {
    tiene_servicio_rn9: false,
    motivo: 'Las Termas de Caimancito están en las Yungas (corredor RN34), no en el corredor RN9.',
    alternativa_honesta: 'Desde la Terminal de San Salvador de Jujuy, tomá un transporte interurbano por RN34 hacia Caimancito / Ledesma, y desde allí coordiná acceso a las termas.'
  }
};

// GET /api/transporte/como-llegar?origen=<slug>&destino=<slug>[&hora=HH:MM]
// Guía integral de viaje: resuelve origen, parada RN9, servicios reales,
// traslados locales (cruce≠pueblo), alternativa honesta si no hay RN9, y polyline.
router.get(['/transporte/como-llegar', '/como-llegar'], async (req, res) => {
  try {
    const origenParam = (req.query.origen || 'terminal-jjs').trim();
    const destinoParam = (req.query.destino || 'cerro-siete-colores').trim();
    const hora = req.query.hora;

    if (!origenParam || !destinoParam) {
      return res.status(400).json({ error: 'Se requieren origen y destino' });
    }

    if (origenParam === destinoParam) {
      return res.json({
        mismo_punto: true,
        mensaje: 'El origen y el destino son el mismo punto.',
        servicios: [],
        puntos: [],
        polyline: []
      });
    }

    // Resolver Entidad Origen (Base / Parada / Lugar)
    let entidadOrigen = null;
    let trasladoInicial = null;
    let paradaOrigenSlug = null;

    if (BASE_ORIGINS[origenParam]) {
      entidadOrigen = BASE_ORIGINS[origenParam];
      paradaOrigenSlug = entidadOrigen.parada_slug;
      trasladoInicial = entidadOrigen.traslado_inicial || null;
    } else {
      // Buscar en tabla parada
      const { rows: paradasOrig } = await query('SELECT * FROM parada WHERE slug = $1', [origenParam]);
      if (paradasOrig.length > 0) {
        const p = paradasOrig[0];
        entidadOrigen = {
          slug: p.slug,
          nombre: p.nombre,
          tipo: p.tipo,
          lat: p.lat !== null ? Number(p.lat) : null,
          lng: p.lng !== null ? Number(p.lng) : null,
          parada_slug: p.slug
        };
        paradaOrigenSlug = p.slug;
      } else {
        // Buscar en tabla lugar
        const { rows: lugaresOrig } = await query('SELECT * FROM lugar WHERE slug = $1', [origenParam]);
        if (lugaresOrig.length > 0) {
          const l = lugaresOrig[0];
          entidadOrigen = {
            slug: l.slug,
            nombre: l.nombre,
            tipo: 'lugar',
            lat: Number(l.lat),
            lng: Number(l.lng)
          };
          const mapping = LUGAR_PARADA_MAPPING[l.slug];
          if (mapping?.parada_slug) {
            paradaOrigenSlug = mapping.parada_slug;
            if (mapping.traslado_final) {
              trasladoInicial = {
                titulo: 'Traslado inicial a la parada RN9',
                tipo: mapping.traslado_final.tipo,
                distancia_km: mapping.traslado_final.distancia_km,
                duracion_estimada: mapping.traslado_final.duracion_estimada,
                descripcion: `Desde ${l.nombre}, trasladate hacia la parada ${mapping.parada_slug} sobre la RN9.`
              };
            }
          }
        }
      }
    }

    if (!entidadOrigen) {
      return res.status(404).json({ error: `Origen no encontrado: ${origenParam}` });
    }

    // Resolver Entidad Destino (Lugar / Parada)
    let entidadDestino = null;
    let paradaDestinoSlug = null;
    let trasladoFinal = null;
    let tieneServicioRN9 = true;
    let motivoSinServicio = null;
    let alternativaHonesta = null;

    const { rows: lugaresDest } = await query('SELECT * FROM lugar WHERE slug = $1', [destinoParam]);
    if (lugaresDest.length > 0) {
      const l = lugaresDest[0];
      entidadDestino = {
        slug: l.slug,
        nombre: l.nombre,
        tipo: 'lugar',
        lat: Number(l.lat),
        lng: Number(l.lng),
        altitud_m: l.altitud_m,
        descripcion: l.descripcion,
        como_llegar: l.como_llegar,
        localidad: l.datos_json?.localidad || null
      };

      const mapping = LUGAR_PARADA_MAPPING[l.slug];
      if (mapping) {
        if (mapping.tiene_servicio_rn9 === false) {
          tieneServicioRN9 = false;
          motivoSinServicio = mapping.motivo;
          alternativaHonesta = mapping.alternativa_honesta;
          paradaDestinoSlug = mapping.parada_conexion || null;
        } else {
          paradaDestinoSlug = mapping.parada_slug;
          trasladoFinal = mapping.traslado_final
            ? { titulo: 'Traslado de la parada al destino', ...mapping.traslado_final }
            : null;
        }
      } else {
        // Fallback por localidad
        const loc = l.datos_json?.localidad?.toLowerCase() || '';
        const { rows: paradasLoc } = await query('SELECT slug FROM parada WHERE LOWER(nombre) LIKE $1 LIMIT 1', [`%${loc}%`]);
        if (paradasLoc.length > 0) {
          paradaDestinoSlug = paradasLoc[0].slug;
        } else {
          tieneServicioRN9 = false;
          motivoSinServicio = 'Destino fuera del corredor troncal de la RN9.';
          alternativaHonesta = 'Consultá opciones de transporte interurbano o traslados locales desde San Salvador de Jujuy.';
        }
      }
    } else {
      // Buscar en tabla parada
      const { rows: paradasDest } = await query('SELECT * FROM parada WHERE slug = $1', [destinoParam]);
      if (paradasDest.length > 0) {
        const p = paradasDest[0];
        entidadDestino = {
          slug: p.slug,
          nombre: p.nombre,
          tipo: p.tipo,
          lat: p.lat !== null ? Number(p.lat) : null,
          lng: p.lng !== null ? Number(p.lng) : null
        };
        paradaDestinoSlug = p.slug;
      }
    }

    if (!entidadDestino) {
      return res.status(404).json({ error: `Destino no encontrado: ${destinoParam}` });
    }

    // Traer información de las paradas RN9 involucradas
    let paradaOrigen = null;
    let paradaDestino = null;
    let paradasTramo = [];
    let servicios = [];
    let direccion = null;

    if (paradaOrigenSlug && paradaDestinoSlug && paradaOrigenSlug !== paradaDestinoSlug) {
      const { rows: pRows } = await query(
        'SELECT id, linea_id, nombre, slug, orden_en_linea, lat, lng, tipo, notas FROM parada WHERE slug IN ($1, $2)',
        [paradaOrigenSlug, paradaDestinoSlug]
      );
      paradaOrigen = pRows.find(p => p.slug === paradaOrigenSlug);
      paradaDestino = pRows.find(p => p.slug === paradaDestinoSlug);

      if (paradaOrigen && paradaDestino) {
        paradaOrigen = { ...paradaOrigen, lat: Number(paradaOrigen.lat), lng: Number(paradaOrigen.lng) };
        paradaDestino = { ...paradaDestino, lat: Number(paradaDestino.lat), lng: Number(paradaDestino.lng) };

        direccion = paradaOrigen.orden_en_linea < paradaDestino.orden_en_linea ? 'ida' : 'vuelta';

        // Obtener todas las paradas intermedias del tramo RN9 en orden
        const minOrden = Math.min(paradaOrigen.orden_en_linea, paradaDestino.orden_en_linea);
        const maxOrden = Math.max(paradaOrigen.orden_en_linea, paradaDestino.orden_en_linea);
        const orderDir = direccion === 'ida' ? 'ASC' : 'DESC';

        const { rows: tramoRows } = await query(
          `SELECT id, nombre, slug, orden_en_linea, lat, lng, tipo, notas
           FROM parada
           WHERE linea_id = 'rn9' AND orden_en_linea >= $1 AND orden_en_linea <= $2
           ORDER BY orden_en_linea ${orderDir}`,
          [minOrden, maxOrden]
        );

        paradasTramo = tramoRows.map(r => ({
          ...r,
          lat: r.lat !== null ? Number(r.lat) : null,
          lng: r.lng !== null ? Number(r.lng) : null
        }));

        // Obtener servicios reales de transporte
        const { rows: horariosRaw } = await query(
          `SELECT h1.id AS horario_origen_id,
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
          [paradaOrigen.id, paradaDestino.id, direccion]
        );

        servicios = horariosRaw.map(row => {
          const minSalida = timeToMinutes(row.hora_salida);
          const minLlegada = timeToMinutes(row.hora_llegada);
          let duracionMinutos = minLlegada - minSalida;
          if (duracionMinutos < 0) duracionMinutos += 24 * 60;

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

        if (hora) {
          const minFiltro = timeToMinutes(hora);
          servicios = servicios.filter(s => timeToMinutes(s.hora_salida) >= minFiltro);
        }
      }
    }

    // Armar Polyline para el mapa
    const polyline = [];
    if (entidadOrigen.lat && entidadOrigen.lng) {
      polyline.push([entidadOrigen.lat, entidadOrigen.lng]);
    }

    for (const p of paradasTramo) {
      if (p.lat && p.lng) {
        // Evitar duplicar punto si es casi idéntico al origen
        const last = polyline[polyline.length - 1];
        if (!last || Math.abs(last[0] - p.lat) > 0.0001 || Math.abs(last[1] - p.lng) > 0.0001) {
          polyline.push([p.lat, p.lng]);
        }
      }
    }

    if (entidadDestino.lat && entidadDestino.lng) {
      const last = polyline[polyline.length - 1];
      if (!last || Math.abs(last[0] - entidadDestino.lat) > 0.0001 || Math.abs(last[1] - entidadDestino.lng) > 0.0001) {
        polyline.push([entidadDestino.lat, entidadDestino.lng]);
      }
    }

    // Puntos clave para pins en el mapa
    const puntos = [];
    puntos.push({
      nombre: entidadOrigen.nombre,
      tipo: 'origen',
      lat: entidadOrigen.lat,
      lng: entidadOrigen.lng,
      detalle: 'Punto de partida'
    });

    if (paradaDestino && paradaDestino.slug !== entidadDestino.slug) {
      puntos.push({
        nombre: paradaDestino.nombre,
        tipo: paradaDestino.tipo === 'cruce' ? 'cruce' : 'parada',
        lat: paradaDestino.lat,
        lng: paradaDestino.lng,
        detalle: paradaDestino.tipo === 'cruce'
          ? 'Descenso sobre RN9 (Cruce: requiere traslado local)'
          : `Descenso en ${paradaDestino.nombre}`
      });
    }

    puntos.push({
      nombre: entidadDestino.nombre,
      tipo: 'destino',
      lat: entidadDestino.lat,
      lng: entidadDestino.lng,
      detalle: entidadDestino.tipo === 'lugar' ? 'Destino final' : 'Destino terminal'
    });

    res.json({
      origen: entidadOrigen,
      destino: entidadDestino,
      paradaOrigen,
      paradaDestino,
      direccion,
      tiene_servicio_rn9: tieneServicioRN9,
      motivo_sin_servicio: motivoSinServicio,
      alternativa_honesta: alternativaHonesta,
      traslado_inicial: trasladoInicial,
      traslado_final: trasladoFinal,
      servicios,
      paradas_tramo: paradasTramo,
      polyline,
      puntos
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

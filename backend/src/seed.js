// Seed idempotente de paradas y horarios para la línea RN9 (San Salvador de Jujuy -> La Quiaca)
import pg from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = (((h * 60 + m + mins) % (24 * 60)) + (24 * 60)) % (24 * 60);
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`;
}

export const PARADAS_RN9 = [
  {
    slug: 'terminal-jjs',
    nombre: 'Terminal de Ómnibus SS.Jujuy',
    orden_en_linea: 1,
    lat: -24.2128,
    lng: -65.2891,
    tipo: 'terminal',
    notas: 'Terminal de Ómnibus Gral. Manuel Eduardo Arias (Acceso Sur), cabecera principal.'
  },
  {
    slug: 'volcan',
    nombre: 'Volcán',
    orden_en_linea: 2,
    lat: -23.9167,
    lng: -65.4667,
    tipo: 'parada',
    notas: 'Parada sobre RN9 en el portal de la Quebrada de Humahuaca.'
  },
  {
    slug: 'purmamarca-cruce',
    nombre: 'Purmamarca Cruce',
    orden_en_linea: 3,
    lat: -23.7431,
    lng: -65.4678,
    tipo: 'cruce',
    notas: 'Cruce sobre RN9 e intersección con RN52. No confundir con el pueblo de Purmamarca (a 3 km hacia el oeste por RN52). Los colectivos troncales de la RN9 no entran al pueblo; para llegar al pueblo tomar remise o servicio local en el cruce.'
  },
  {
    slug: 'maimara',
    nombre: 'Maimará',
    orden_en_linea: 4,
    lat: -23.6247,
    lng: -65.4089,
    tipo: 'parada',
    notas: 'Parada sobre RN9 frente al pueblo y la Paleta del Pintor.'
  },
  {
    slug: 'tilcara',
    nombre: 'Tilcara',
    orden_en_linea: 5,
    lat: -23.5776,
    lng: -65.3934,
    tipo: 'terminal',
    notas: 'Terminal de Ómnibus de Tilcara sobre RN9.'
  },
  {
    slug: 'huacalera',
    nombre: 'Huacalera',
    orden_en_linea: 6,
    lat: -23.4419,
    lng: -65.3533,
    tipo: 'parada',
    notas: 'Parada sobre RN9 a la altura del monolito del Trópico de Capricornio.'
  },
  {
    slug: 'uquia',
    nombre: 'Uquía',
    orden_en_linea: 7,
    lat: -23.3056,
    lng: -65.3589,
    tipo: 'parada',
    notas: 'Parada sobre RN9, acceso a la iglesia San Francisco de Paula y Quebrada de las Señoritas.'
  },
  {
    slug: 'humahuaca',
    nombre: 'Humahuaca',
    orden_en_linea: 8,
    lat: -23.2056,
    lng: -65.3503,
    tipo: 'terminal',
    notas: 'Terminal de Ómnibus de Humahuaca.'
  },
  {
    slug: 'abra-pampa',
    nombre: 'Abra Pampa',
    orden_en_linea: 9,
    lat: -22.7247,
    lng: -65.6967,
    tipo: 'terminal',
    notas: 'Terminal de Ómnibus de Abra Pampa (La Siberia Argentina, Puna).'
  },
  {
    slug: 'la-quiaca',
    nombre: 'La Quiaca',
    orden_en_linea: 10,
    lat: -22.1053,
    lng: -65.5978,
    tipo: 'terminal',
    notas: 'Terminal de Ómnibus de La Quiaca, extremo norte de la RN9 y frontera internacional.'
  }
];

export async function seed(connectionString) {
  const url = connectionString || process.argv[2] || process.env.DATABASE_URL || process.env.DATABASE_URL_TEST;
  if (!url) throw new Error('falta DATABASE_URL para seed');

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    await client.query('BEGIN');

    // 1. Línea RN9
    await client.query(`
      INSERT INTO linea (id, nombre, descripcion)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion
    `, [
      'rn9',
      'Línea RN9 (Quebrada y Puna)',
      'Corredor troncal por Ruta Nacional 9: San Salvador de Jujuy a La Quiaca pasando por la Quebrada de Humahuaca'
    ]);

    // 2. Paradas
    const paradaMap = new Map();
    for (const p of PARADAS_RN9) {
      const res = await client.query(`
        INSERT INTO parada (linea_id, nombre, slug, orden_en_linea, lat, lng, tipo, notas)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (slug) DO UPDATE SET
          linea_id = EXCLUDED.linea_id,
          nombre = EXCLUDED.nombre,
          orden_en_linea = EXCLUDED.orden_en_linea,
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng,
          tipo = EXCLUDED.tipo,
          notas = EXCLUDED.notas
        RETURNING id, slug
      `, ['rn9', p.nombre, p.slug, p.orden_en_linea, p.lat, p.lng, p.tipo, p.notas]);
      paradaMap.set(p.slug, res.rows[0].id);
    }

    // 3. Servicios IDA (San Salvador de Jujuy -> Norte)
    // Tiempos aproximados desde Terminal SS.Jujuy:
    // Volcán (+45m), Purmamarca Cruce (+65m), Maimará (+80m), Tilcara (+95m),
    // Huacalera (+115m), Uquía (+125m), Humahuaca (+140m), Abra Pampa (+225m), La Quiaca (+300m)
    const salidasIda = [
      { id: 'rn9-ida-0530', empresa: 'Panamericano', hora: '05:30', hasta: 'la-quiaca' },
      { id: 'rn9-ida-0615', empresa: 'Panamericano', hora: '06:15', hasta: 'la-quiaca' },
      { id: 'rn9-ida-0700', empresa: 'Panamericano', hora: '07:00', hasta: 'humahuaca' },
      { id: 'rn9-ida-0705', empresa: 'Evelia', hora: '07:05', hasta: 'humahuaca' },
      { id: 'rn9-ida-0745', empresa: 'Panamericano', hora: '07:45', hasta: 'humahuaca' },
      { id: 'rn9-ida-0915', empresa: 'Evelia', hora: '09:15', hasta: 'humahuaca' },
      { id: 'rn9-ida-0930', empresa: 'Panamericano', hora: '09:30', hasta: 'la-quiaca' },
      { id: 'rn9-ida-1100', empresa: 'Panamericano', hora: '11:00', hasta: 'humahuaca' },
      { id: 'rn9-ida-1230', empresa: 'Evelia', hora: '12:30', hasta: 'humahuaca' },
      { id: 'rn9-ida-1400', empresa: 'Panamericano', hora: '14:00', hasta: 'la-quiaca' },
      { id: 'rn9-ida-1600', empresa: 'Evelia', hora: '16:00', hasta: 'humahuaca' },
      { id: 'rn9-ida-1730', empresa: 'Panamericano', hora: '17:30', hasta: 'humahuaca' },
      { id: 'rn9-ida-1900', empresa: 'Evelia', hora: '19:00', hasta: 'humahuaca' },
      { id: 'rn9-ida-2030', empresa: 'Panamericano', hora: '20:30', hasta: 'la-quiaca' },
    ];

    const deltasIda = [
      { slug: 'terminal-jjs', delta: 0, publicado: true },
      { slug: 'volcan', delta: 45, publicado: false },
      { slug: 'purmamarca-cruce', delta: 65, publicado: false },
      { slug: 'maimara', delta: 80, publicado: false },
      { slug: 'tilcara', delta: 95, publicado: true },
      { slug: 'huacalera', delta: 115, publicado: false },
      { slug: 'uquia', delta: 125, publicado: false },
      { slug: 'humahuaca', delta: 140, publicado: true },
      { slug: 'abra-pampa', delta: 225, publicado: true },
      { slug: 'la-quiaca', delta: 300, publicado: true }
    ];

    for (const serv of salidasIda) {
      const maxOrden = PARADAS_RN9.find(p => p.slug === serv.hasta).orden_en_linea;
      for (const d of deltasIda) {
        const pDef = PARADAS_RN9.find(p => p.slug === d.slug);
        if (pDef.orden_en_linea > maxOrden) continue;

        const paradaId = paradaMap.get(d.slug);
        const horaSaliente = addMinutes(serv.hora, d.delta);
        const confianza = d.publicado ? 'publicado' : 'estimado';
        const fuente = d.publicado
          ? `horario-quebrada.netlify.app (${serv.empresa})`
          : `horario-quebrada.netlify.app (estimado +${d.delta}m desde Terminal SS.Jujuy)`;

        await client.query(`
          INSERT INTO horario (linea_id, parada_id, servicio_id, hora_saliente, direccion, frecuencia_dias, fuente, confianza)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (servicio_id, parada_id) DO UPDATE SET
            hora_saliente = EXCLUDED.hora_saliente,
            direccion = EXCLUDED.direccion,
            frecuencia_dias = EXCLUDED.frecuencia_dias,
            fuente = EXCLUDED.fuente,
            confianza = EXCLUDED.confianza
        `, ['rn9', paradaId, serv.id, horaSaliente, 'ida', 'diario', fuente, confianza]);
      }
    }

    // 4. Servicios VUELTA (Norte -> San Salvador de Jujuy)
    const salidasVuelta = [
      { id: 'rn9-vta-0600', empresa: 'Evelia', horaOrigen: '06:00', desde: 'humahuaca' },
      { id: 'rn9-vta-0730', empresa: 'Panamericano', horaOrigen: '07:30', desde: 'humahuaca' },
      { id: 'rn9-vta-0740', empresa: 'Panamericano', horaOrigen: '05:00', desde: 'la-quiaca' },
      { id: 'rn9-vta-1130', empresa: 'Evelia', horaOrigen: '11:30', desde: 'humahuaca' },
      { id: 'rn9-vta-1330', empresa: 'Panamericano', horaOrigen: '13:30', desde: 'humahuaca' },
      { id: 'rn9-vta-1530', empresa: 'Evelia', horaOrigen: '15:30', desde: 'humahuaca' },
      { id: 'rn9-vta-1700', empresa: 'Panamericano', horaOrigen: '17:00', desde: 'humahuaca' },
      { id: 'rn9-vta-1900', empresa: 'Evelia', horaOrigen: '19:00', desde: 'humahuaca' },
      { id: 'rn9-vta-1910', empresa: 'Panamericano', horaOrigen: '16:30', desde: 'la-quiaca' }
    ];

    // Deltas en minutos desde Humahuaca hacia el Sur (o si viene de La Quiaca, La Quiaca es -160m)
    // La Quiaca (-160m), Abra Pampa (-85m), Humahuaca (0m), Uquía (+15m), Huacalera (+25m),
    // Tilcara (+45m), Maimará (+60m), Purmamarca Cruce (+75m), Volcán (+95m), Terminal SS.Jujuy (+140m)
    const deltasVuelta = [
      { slug: 'la-quiaca', deltaH: -160, publicado: true },
      { slug: 'abra-pampa', deltaH: -85, publicado: true },
      { slug: 'humahuaca', deltaH: 0, publicado: true },
      { slug: 'uquia', deltaH: 15, publicado: false },
      { slug: 'huacalera', deltaH: 25, publicado: false },
      { slug: 'tilcara', deltaH: 45, publicado: true },
      { slug: 'maimara', deltaH: 60, publicado: false },
      { slug: 'purmamarca-cruce', deltaH: 75, publicado: false },
      { slug: 'volcan', deltaH: 95, publicado: false },
      { slug: 'terminal-jjs', deltaH: 140, publicado: true }
    ];

    for (const serv of salidasVuelta) {
      // Hora base en Humahuaca
      const horaHumahuaca = serv.desde === 'la-quiaca'
        ? addMinutes(serv.horaOrigen, 160)
        : serv.horaOrigen;

      const maxOrden = PARADAS_RN9.find(p => p.slug === serv.desde).orden_en_linea;

      for (const d of deltasVuelta) {
        const pDef = PARADAS_RN9.find(p => p.slug === d.slug);
        if (pDef.orden_en_linea > maxOrden) continue;

        const paradaId = paradaMap.get(d.slug);
        const horaSaliente = addMinutes(horaHumahuaca, d.deltaH);
        const confianza = d.publicado ? 'publicado' : 'estimado';
        const fuente = d.publicado
          ? `horario-quebrada.netlify.app (${serv.empresa})`
          : `horario-quebrada.netlify.app (estimado en ruta ${serv.empresa})`;

        await client.query(`
          INSERT INTO horario (linea_id, parada_id, servicio_id, hora_saliente, direccion, frecuencia_dias, fuente, confianza)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (servicio_id, parada_id) DO UPDATE SET
            hora_saliente = EXCLUDED.hora_saliente,
            direccion = EXCLUDED.direccion,
            frecuencia_dias = EXCLUDED.frecuencia_dias,
            fuente = EXCLUDED.fuente,
            confianza = EXCLUDED.confianza
        `, ['rn9', paradaId, serv.id, horaSaliente, 'vuelta', 'diario', fuente, confianza]);
      }
    }

    await client.query('COMMIT');
    console.log('Seed de transporte RN9 completado con éxito.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error ejecutando seed:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

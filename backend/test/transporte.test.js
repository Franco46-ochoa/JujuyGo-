import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/index.js';
import { getPool, closePool, query } from '../src/db.js';
import { seed } from '../src/seed.js';

process.env.NODE_ENV = 'test';
const testDbUrl = process.env.DATABASE_URL_TEST || 'postgres://jujuygo:jujuygo@localhost:5432/jujuygo_test';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

async function applyMigrations(url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())`);
    const { rows } = await client.query('SELECT name FROM _migrations');
    const done = new Set(rows.map(r => r.name));
    const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const f of files) {
      if (done.has(f)) continue;
      const sql = readFileSync(join(migrationsDir, f), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [f]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    }
  } finally {
    await client.end();
  }
}

describe('Transporte y horarios RN9 (Slice 04)', () => {
  let app;

  before(async () => {
    // Asegurar que la DB de test tenga esquema y datos
    await applyMigrations(testDbUrl);
    await seed(testDbUrl);
    app = createApp();
  });

  after(async () => {
    await closePool();
  });

  describe('Orden de paradas', () => {
    test('GET /api/transporte/paradas devuelve lista completa en orden estricto de ruta', async () => {
      const res = await request(app).get('/api/transporte/paradas?linea=rn9');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length >= 8, 'Debe tener al menos las paradas principales de la RN9');

      // Verificar que los orden_en_linea sean estrictamente crecientes
      for (let i = 0; i < res.body.length; i++) {
        assert.equal(res.body[i].orden_en_linea, i + 1);
      }

      // Parada inicial: Terminal de Ómnibus SS.Jujuy
      assert.equal(res.body[0].slug, 'terminal-jjs');
      assert.equal(res.body[0].tipo, 'terminal');

      // Paradas intermedias esperadas en orden
      const slugs = res.body.map(p => p.slug);
      const expectedInOrder = ['terminal-jjs', 'volcan', 'purmamarca-cruce', 'maimara', 'tilcara', 'humahuaca'];
      let lastIndex = -1;
      for (const expected of expectedInOrder) {
        const idx = slugs.indexOf(expected);
        assert.ok(idx !== -1, `Falta parada requerida: ${expected}`);
        assert.ok(idx > lastIndex, `Parada ${expected} no está en orden`);
        lastIndex = idx;
      }
    });

    test('GET /api/transporte/paradas con línea inexistente devuelve 404', async () => {
      const res = await request(app).get('/api/transporte/paradas?linea=inexistente');
      assert.equal(res.status, 404);
      assert.ok(res.body.error);
    });
  });

  describe('Regla crítica: Cruce ≠ Pueblo', () => {
    test('Purmamarca Cruce tiene tipo="cruce" y notas explicativas diferenciadas del pueblo', async () => {
      const res = await request(app).get('/api/transporte/paradas?linea=rn9');
      assert.equal(res.status, 200);

      const cruce = res.body.find(p => p.slug === 'purmamarca-cruce');
      assert.ok(cruce, 'Debe existir la parada Purmamarca Cruce');
      assert.equal(cruce.tipo, 'cruce', 'El tipo debe ser estrictamente "cruce"');
      assert.match(cruce.nombre, /cruce/i, 'El nombre debe indicar Cruce');
      assert.ok(cruce.notas, 'Debe contener notas explicativas');
      assert.match(cruce.notas, /no confundir con el pueblo|no es el pueblo/i, 'Las notas deben aclarar que no es el pueblo');
    });

    test('La base de datos rechaza tipos de parada no válidos', async () => {
      await assert.rejects(
        () => query(
          `INSERT INTO parada (linea_id, nombre, slug, orden_en_linea, tipo)
           VALUES ('rn9', 'Parada Invalida', 'parada-invalida', 999, 'tipo_invalido')`,
          [],
          testDbUrl
        ),
        /(violates check constraint|viola la restricci[oó]n.*check)/i
      );
    });
  });

  describe('Cálculo de próximos servicios', () => {
    test('GET /api/transporte/proximos?origen=terminal-jjs&destino=tilcara devuelve servicios con hora estimada', async () => {
      const res = await request(app).get('/api/transporte/proximos?origen=terminal-jjs&destino=tilcara');
      assert.equal(res.status, 200);

      assert.equal(res.body.origen.slug, 'terminal-jjs');
      assert.equal(res.body.destino.slug, 'tilcara');
      assert.equal(res.body.direccion, 'ida');

      const { servicios } = res.body;
      assert.ok(Array.isArray(servicios));
      assert.ok(servicios.length > 0, 'Debe devolver al menos un servicio');

      for (const serv of servicios) {
        assert.ok(serv.servicio_id);
        assert.ok(serv.hora_salida);
        assert.ok(serv.hora_llegada || serv.hora_estimada_llegada);
        assert.ok(serv.duracion_minutos > 0);
        assert.ok(serv.duracion_estimada);
        assert.ok(serv.confianza);
        assert.ok(serv.fuente);

        // SS.Jujuy a Tilcara tarda ~1h 35m (95 min)
        assert.equal(serv.duracion_minutos, 95);
      }
    });

    test('GET /api/transporte/proximos dirección vuelta (Humahuaca -> SS.Jujuy)', async () => {
      const res = await request(app).get('/api/transporte/proximos?origen=humahuaca&destino=terminal-jjs');
      assert.equal(res.status, 200);
      assert.equal(res.body.direccion, 'vuelta');
      assert.ok(res.body.servicios.length > 0);

      const primerServicio = res.body.servicios[0];
      assert.ok(primerServicio.duracion_minutos > 0);
      assert.ok(primerServicio.hora_salida);
      assert.ok(primerServicio.hora_llegada);
    });

    test('GET /api/transporte/proximos con filtro ?hora=12:00 devuelve solo salidas posteriores', async () => {
      const res = await request(app).get('/api/transporte/proximos?origen=terminal-jjs&destino=tilcara&hora=12:00');
      assert.equal(res.status, 200);
      assert.ok(res.body.servicios.length > 0);

      for (const serv of res.body.servicios) {
        const [h] = serv.hora_salida.split(':').map(Number);
        assert.ok(h >= 12, `La hora de salida ${serv.hora_salida} debe ser >= 12:00`);
      }
    });

    test('Validación de errores en parámetros origen y destino', async () => {
      // Faltan parámetros
      const resFalta = await request(app).get('/api/transporte/proximos?origen=terminal-jjs');
      assert.equal(resFalta.status, 400);

      // Origen y destino iguales
      const resIguales = await request(app).get('/api/transporte/proximos?origen=tilcara&destino=tilcara');
      assert.equal(resIguales.status, 400);

      // Parada inexistente
      const res404 = await request(app).get('/api/transporte/proximos?origen=inexistente&destino=tilcara');
      assert.equal(res404.status, 404);
    });
  });

  describe('Confianza y fuente presente en cada horario', () => {
    test('Ningún horario en la DB carece de fuente o confianza', async () => {
      const { rows } = await query(
        `SELECT COUNT(*) AS sin_datos
         FROM horario
         WHERE fuente IS NULL OR TRIM(fuente) = '' OR confianza IS NULL`,
        [],
        testDbUrl
      );
      assert.equal(Number(rows[0].sin_datos), 0, 'No debe haber ningún horario sin fuente o confianza');
    });

    test('Todos los valores de confianza son válidos ("publicado", "estimado" o "tiempo-real")', async () => {
      const { rows } = await query(
        `SELECT DISTINCT confianza FROM horario`,
        [],
        testDbUrl
      );
      const permitidos = new Set(['publicado', 'estimado', 'tiempo-real']);
      for (const row of rows) {
        assert.ok(permitidos.has(row.confianza), `Confianza desconocida: ${row.confianza}`);
      }
    });

    test('Tramos que incluyen paradas intermedias sin boletería oficial marcan confianza="estimado"', async () => {
      const res = await request(app).get('/api/transporte/proximos?origen=terminal-jjs&destino=purmamarca-cruce');
      assert.equal(res.status, 200);
      assert.ok(res.body.servicios.length > 0);

      const servicio = res.body.servicios[0];
      assert.equal(servicio.confianza, 'estimado', 'Llegada a cruce debe reportarse como estimada');
      assert.match(servicio.fuente, /estimado/i, 'La fuente debe transparentar que se trata de estimación');
    });
  });

  describe('Idempotencia del seed', () => {
    test('Ejecutar el seed nuevamente no duplica registros', async () => {
      const countsBefore = await query(
        `SELECT 
           (SELECT count(*) FROM linea) as l_count,
           (SELECT count(*) FROM parada) as p_count,
           (SELECT count(*) FROM horario) as h_count`,
        [],
        testDbUrl
      );

      // Correr de nuevo el seed
      await seed(testDbUrl);

      const countsAfter = await query(
        `SELECT 
           (SELECT count(*) FROM linea) as l_count,
           (SELECT count(*) FROM parada) as p_count,
           (SELECT count(*) FROM horario) as h_count`,
        [],
        testDbUrl
      );

      assert.equal(countsAfter.rows[0].l_count, countsBefore.rows[0].l_count);
      assert.equal(countsAfter.rows[0].p_count, countsBefore.rows[0].p_count);
      assert.equal(countsAfter.rows[0].h_count, countsBefore.rows[0].h_count);
    });
  });
});

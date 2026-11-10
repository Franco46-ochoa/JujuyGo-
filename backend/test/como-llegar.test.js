import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/index.js';
import { closePool } from '../src/db.js';
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

describe('API Cómo Llegar (Slice 06)', () => {
  let app;

  before(async () => {
    await applyMigrations(testDbUrl);
    await seed(testDbUrl);
    app = createApp();
  });

  after(async () => {
    await closePool();
  });

  test('GET /api/transporte/como-llegar desde Terminal a Cerro de los Siete Colores', async () => {
    const res = await request(app).get('/api/transporte/como-llegar?origen=terminal-jjs&destino=cerro-siete-colores');
    assert.equal(res.status, 200);
    assert.equal(res.body.tiene_servicio_rn9, true);
    assert.equal(res.body.origen.slug, 'terminal-jjs');
    assert.equal(res.body.destino.slug, 'cerro-siete-colores');

    // Regla crucial: parada de descenso es Purmamarca Cruce (no pueblo)
    assert.equal(res.body.paradaDestino.slug, 'purmamarca-cruce');
    assert.equal(res.body.paradaDestino.tipo, 'cruce');

    // Traslado local de 3 km del cruce al pueblo
    assert.ok(res.body.traslado_final, 'Debe incluir traslado final local');
    assert.equal(res.body.traslado_final.distancia_km, 3);
    assert.match(res.body.traslado_final.descripcion, /3 km/);

    // Servicios con datos reales de la DB de transporte
    assert.ok(Array.isArray(res.body.servicios));
    assert.ok(res.body.servicios.length > 0, 'Debe devolver servicios');
    for (const s of res.body.servicios) {
      assert.ok(s.hora_salida);
      assert.ok(s.hora_llegada);
      assert.ok(s.duracion_estimada);
      assert.ok(['publicado', 'estimado', 'tiempo-real'].includes(s.confianza));
      assert.ok(s.fuente && s.fuente.length > 0, 'Cada servicio debe tener fuente declarada');
    }

    // Polyline y puntos para el mapa
    assert.ok(Array.isArray(res.body.polyline));
    assert.ok(res.body.polyline.length >= 3, 'Debe contener coordenadas del recorrido');
    assert.ok(Array.isArray(res.body.puntos));
    assert.ok(res.body.puntos.some(p => p.tipo === 'origen'));
    assert.ok(res.body.puntos.some(p => p.tipo === 'cruce' || p.tipo === 'parada'));
    assert.ok(res.body.puntos.some(p => p.tipo === 'destino'));
  });

  test('GET /api/transporte/como-llegar desde Aeropuerto Jujuy incluye transfer inicial a Terminal', async () => {
    const res = await request(app).get('/api/transporte/como-llegar?origen=aeropuerto-jujuy&destino=cerro-siete-colores');
    assert.equal(res.status, 200);
    assert.equal(res.body.origen.tipo, 'aeropuerto');
    assert.ok(res.body.traslado_inicial, 'Debe incluir traslado inicial desde aeropuerto');
    assert.equal(res.body.traslado_inicial.distancia_km, 33);
    assert.equal(res.body.paradaOrigen.slug, 'terminal-jjs');
    assert.equal(res.body.paradaDestino.slug, 'purmamarca-cruce');
  });

  test('GET /api/transporte/como-llegar a Salinas Grandes advierte sin servicio directo RN9 y da alternativa honesta', async () => {
    const res = await request(app).get('/api/transporte/como-llegar?origen=terminal-jjs&destino=salinas-grandes');
    assert.equal(res.status, 200);
    assert.equal(res.body.tiene_servicio_rn9, false);
    assert.ok(res.body.motivo_sin_servicio);
    assert.ok(res.body.alternativa_honesta);
    assert.match(res.body.alternativa_honesta, /Cuesta de Lipán|Purmamarca/i);
  });

  test('GET /api/transporte/como-llegar a Yungas (Parque Calilegua) advierte corredor RN34', async () => {
    const res = await request(app).get('/api/transporte/como-llegar?origen=terminal-jjs&destino=parque-nacional-calilegua');
    assert.equal(res.status, 200);
    assert.equal(res.body.tiene_servicio_rn9, false);
    assert.match(res.body.alternativa_honesta, /RN34|Libertador General San Martín/i);
  });

  test('GET /api/transporte/como-llegar con mismo origen y destino', async () => {
    const res = await request(app).get('/api/transporte/como-llegar?origen=terminal-jjs&destino=terminal-jjs');
    assert.equal(res.status, 200);
    assert.equal(res.body.mismo_punto, true);
  });

  test('GET /api/transporte/como-llegar con destino inexistente responde 404', async () => {
    const res = await request(app).get('/api/transporte/como-llegar?origen=terminal-jjs&destino=inexistente-1234');
    assert.equal(res.status, 404);
  });

  test('GET /api/transporte/como-llegar resuelve el origen GPS y no agrega caminata dentro de 300 m', async () => {
    const res = await request(app).get(
      '/api/transporte/como-llegar?origen=mi-ubicacion&origen_lat=-24.21549&origen_lng=-65.2891&origen_precision=12&destino=cerro-siete-colores'
    );
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.origen, {
      slug: 'mi-ubicacion',
      nombre: 'Tu ubicación',
      tipo: 'punto',
      lat: -24.21549,
      lng: -65.2891,
      precision_m: 12
    });
    assert.equal(res.body.paradaOrigen.slug, 'terminal-jjs');
    assert.equal(res.body.tiene_servicio_rn9, true);
    assert.equal(res.body.traslado_inicial, null);
    assert.ok(res.body.servicios.length > 0);
  });

  test('GET /api/transporte/como-llegar informa caminata aproximada a la parada RN9 cercana', async () => {
    const res = await request(app).get(
      '/api/transporte/como-llegar?origen=mi-ubicacion&origen_lat=-24.217&origen_lng=-65.2891&destino=cerro-siete-colores'
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.paradaOrigen.slug, 'terminal-jjs');
    assert.ok(res.body.traslado_inicial);
    assert.equal(res.body.traslado_inicial.distancia_km, 0.5);
    assert.match(res.body.traslado_inicial.descripcion, /Caminá hacia esa parada/);
    assert.match(res.body.traslado_inicial.duracion_estimada, /min a pie/);
  });

  test('GET /api/transporte/como-llegar no inventa parada RN9 a más de 5 km', async () => {
    const res = await request(app).get(
      '/api/transporte/como-llegar?origen=mi-ubicacion&origen_lat=-24.35&origen_lng=-65.4&destino=cerro-siete-colores'
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.origen.tipo, 'punto');
    assert.equal(res.body.paradaOrigen, null);
    assert.equal(res.body.tiene_servicio_rn9, false);
    assert.match(res.body.motivo_sin_servicio, /menos de 5 km/);
    assert.match(res.body.alternativa_honesta, /colectivo urbano/);
    assert.deepEqual(res.body.servicios, []);
  });

  test('GET /api/transporte/como-llegar valida coordenadas GPS y conserva el 404 de destino inválido', async () => {
    const sinCoordenadas = await request(app).get(
      '/api/transporte/como-llegar?origen=mi-ubicacion&destino=cerro-siete-colores'
    );
    assert.equal(sinCoordenadas.status, 400);
    assert.match(sinCoordenadas.body.error, /origen_lat y origen_lng válidos/);

    for (const coords of ['origen_lat=NaN&origen_lng=-65.2', 'origen_lat=-24.2&origen_lng=181']) {
      const invalida = await request(app).get(
        `/api/transporte/como-llegar?origen=mi-ubicacion&${coords}&destino=cerro-siete-colores`
      );
      assert.equal(invalida.status, 400);
      assert.ok(invalida.body.error);
    }

    const destinoInvalido = await request(app).get(
      '/api/transporte/como-llegar?origen=mi-ubicacion&origen_lat=-24.2&origen_lng=-65.2&destino=inexistente-1234'
    );
    assert.equal(destinoInvalido.status, 404);
  });
});

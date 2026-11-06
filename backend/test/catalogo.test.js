import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { migrate } from '../src/migrate.js';

const databaseUrl = process.env.DATABASE_URL_TEST;
const { Pool } = pg;

describe('API de catálogo', { skip: !databaseUrl && 'requiere DATABASE_URL_TEST' }, () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const app = createApp({ pool });

  before(async () => {
    await migrate(databaseUrl);
  });

  after(async () => {
    await pool.end();
  });

  test('lista las cuatro zonas con un lugar destacado', async () => {
    const response = await request(app).get('/api/zonas');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.map(zona => zona.slug), ['quebrada', 'puna', 'yungas', 'valles']);
    assert.ok(response.body.every(zona => zona.lugar_destacado?.como_llegar));
  });

  test('el detalle de zona incluye sus lugares', async () => {
    const response = await request(app).get('/api/zonas/quebrada');
    assert.equal(response.status, 200);
    assert.equal(response.body.slug, 'quebrada');
    assert.ok(response.body.lugares.length >= 6);
  });

  test('lista todos los lugares sembrados', async () => {
    const response = await request(app).get('/api/lugares');
    assert.equal(response.status, 200);
    assert.ok(response.body.length >= 15);
  });

  test('filtra lugares por zona', async () => {
    const response = await request(app).get('/api/lugares?zona=quebrada');
    assert.equal(response.status, 200);
    assert.ok(response.body.length >= 6);
    assert.ok(response.body.every(lugar => lugar.zona_slug === 'quebrada'));
  });

  test('responde 404 para un lugar inexistente', async () => {
    const response = await request(app).get('/api/lugares/no-existe');
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: 'Lugar no encontrado' });
  });

  test('detalle expone todos los campos de catálogo', async () => {
    const response = await request(app).get('/api/lugares/cerro-siete-colores');
    assert.equal(response.status, 200);
    for (const field of ['lat', 'lng', 'altitud_m', 'descripcion', 'como_llegar', 'mejor_epoca', 'foto', 'datos_json']) {
      assert.ok(Object.hasOwn(response.body, field), `falta ${field}`);
    }
  });

  test('el seed puede aplicarse varias veces sin duplicar registros', async () => {
    const migrationPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations', '001-zonas-lugares.sql');
    const migration = await readFile(migrationPath, 'utf8');
    const beforeCounts = await pool.query(`
      SELECT (SELECT count(*)::int FROM zona) AS zonas,
             (SELECT count(*)::int FROM lugar) AS lugares
    `);

    await pool.query(migration);
    await pool.query(migration);

    const afterCounts = await pool.query(`
      SELECT (SELECT count(*)::int FROM zona) AS zonas,
             (SELECT count(*)::int FROM lugar) AS lugares
    `);
    assert.deepEqual(afterCounts.rows[0], beforeCounts.rows[0]);
    assert.equal(Number(afterCounts.rows[0].zonas), 4);
    assert.ok(Number(afterCounts.rows[0].lugares) >= 15);
  });
});

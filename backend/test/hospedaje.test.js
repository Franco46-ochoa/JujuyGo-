import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { migrate } from '../src/migrate.js';

const databaseUrl = process.env.DATABASE_URL_TEST || 'postgres://jujuygo:jujuygo@localhost:5432/jujuygo_test';
const migrationPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations', '003-hospedaje.sql');

describe('API de hospedajes y guías', () => {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const app = createApp({ pool });

  before(async () => {
    await migrate(databaseUrl);
  });

  after(async () => {
    await pool.end();
  });

  test('lista hospedajes con fuente y estado de verificación', async () => {
    const response = await request(app).get('/api/hospedajes');
    assert.equal(response.status, 200);
    assert.ok(response.body.length > 0);
    assert.ok(response.body.every(item => item.nombre && item.fuente && typeof item.verificado === 'boolean'));
  });

  test('filtra hospedajes por zona', async () => {
    const response = await request(app).get('/api/hospedajes?zona=quebrada');
    assert.equal(response.status, 200);
    assert.ok(response.body.length > 0);
    assert.ok(response.body.every(item => item.zona_slug === 'quebrada'));
  });

  test('responde una lista vacía si no hay hospedajes en la zona', async () => {
    const response = await request(app).get('/api/hospedajes?zona=yungas');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, []);
  });

  test('la lista de guías vacía responde correctamente', async () => {
    const response = await request(app).get('/api/guias');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, []);
  });

  test('la migración puede aplicarse varias veces sin duplicar hospedajes', async () => {
    const migration = await readFile(migrationPath, 'utf8');
    const beforeCounts = await pool.query(`
      SELECT (SELECT count(*)::int FROM hospedaje) AS hospedajes,
             (SELECT count(*)::int FROM guia) AS guias
    `);
    await pool.query(migration);
    await pool.query(migration);
    const afterCounts = await pool.query(`
      SELECT (SELECT count(*)::int FROM hospedaje) AS hospedajes,
             (SELECT count(*)::int FROM guia) AS guias
    `);

    assert.deepEqual(afterCounts.rows[0], beforeCounts.rows[0]);
  });
});

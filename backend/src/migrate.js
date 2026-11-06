// Corre las migraciones .sql de backend/migrations en orden alfabético.
// Uso: node src/migrate.js [base_de_datos_url]  (default: DATABASE_URL del .env)
// Cada migración corre una sola vez (tabla _migrations).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const url = process.argv[2] || process.env.DATABASE_URL || process.env.DATABASE_URL_TEST;
if (!url) { console.error('falta DATABASE_URL'); process.exit(1); }

const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query(`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())`);
const { rows } = await client.query('SELECT name FROM _migrations');
const done = new Set(rows.map(r => r.name));
const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
let n = 0;
for (const f of files) {
  if (done.has(f)) continue;
  const sql = readFileSync(join(dir, f), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [f]);
    await client.query('COMMIT');
    console.log(`aplicada: ${f}`); n++;
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(`falló ${f}: ${e.message}`); process.exitCode = 1; break;
  }
}
if (!n) console.log('sin migraciones nuevas');
await client.end();

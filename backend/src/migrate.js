// Corre las migraciones .sql de backend/migrations en orden alfabético.
// Uso: node src/migrate.js [base_de_datos_url] (default: DATABASE_URL del .env)
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pg from 'pg';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

export async function migrate(url = process.argv[2] || process.env.DATABASE_URL || process.env.DATABASE_URL_TEST) {
  if (!url) throw new Error('falta DATABASE_URL');

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())');
    const { rows } = await client.query('SELECT name FROM _migrations');
    const done = new Set(rows.map(row => row.name));
    const files = readdirSync(dir).filter(file => file.endsWith('.sql')).sort();
    let applied = 0;
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = readFileSync(join(dir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`aplicada: ${file}`);
        applied++;
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`falló ${file}: ${error.message}`, { cause: error });
      }
    }
    if (!applied) console.log('sin migraciones nuevas');
  } finally {
    await client.end();
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    await migrate();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

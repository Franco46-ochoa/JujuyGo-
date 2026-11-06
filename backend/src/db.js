import pg from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

export function getConnectionString() {
  if (process.env.NODE_ENV === 'test') {
    return process.env.DATABASE_URL_TEST || 'postgres://jujuygo:jujuygo@localhost:5432/jujuygo_test';
  }
  return process.env.DATABASE_URL || 'postgres://jujuygo:jujuygo@localhost:5432/jujuygo';
}

const pools = new Map();

export function getPool(connectionString) {
  const url = connectionString || getConnectionString();
  if (!pools.has(url)) {
    const pool = new pg.Pool({ connectionString: url });
    pools.set(url, pool);
  }
  return pools.get(url);
}

export async function query(text, params, connectionString) {
  const pool = getPool(connectionString);
  return pool.query(text, params);
}

export async function closePool(connectionString) {
  if (connectionString) {
    const pool = pools.get(connectionString);
    if (pool) {
      await pool.end();
      pools.delete(connectionString);
    }
  } else {
    for (const [url, pool] of pools.entries()) {
      await pool.end();
      pools.delete(url);
    }
  }
}

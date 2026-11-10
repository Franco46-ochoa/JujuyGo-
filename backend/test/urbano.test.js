import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { createColejuyClient } from '../src/colejuy.js';

function mockFetch(responses) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const response = responses[new URL(url).pathname.replace('/api/', '')];
    if (response instanceof Error) throw response;
    if (typeof response === 'function') return response();
    return {
      status: response?.status ?? 200,
      json: async () => response?.body ?? response,
    };
  };
  return { fetchImpl, calls };
}

function appWithResponses(responses) {
  const mock = mockFetch(responses);
  const urbanoClient = createColejuyClient({ fetchImpl: mock.fetchImpl });
  return { app: createApp({ pool: {}, urbanoClient }), calls: mock.calls };
}

test('proxy de líneas, red, línea y flota preserva el shape y agrega metadatos', async () => {
  const fleetTime = '2026-11-09T12:00:00.000Z';
  const { app } = appWithResponses({
    lines: { lines: [{ id: '36', number: '36' }] },
    network: { lines: [{ id: '36', stops: [] }] },
    'lines/36': { line: { id: '36', paths: [] } },
    fleet: { updatedAt: fleetTime, buses: [], stale: false },
  });

  const lines = await request(app).get('/api/urbano/lineas');
  assert.equal(lines.status, 200);
  assert.deepEqual(lines.body.lines, [{ id: '36', number: '36' }]);
  assert.equal(lines.body.fuente, 'colejuy.vercel.app');
  assert.ok(lines.body.actualizado_en);

  const network = await request(app).get('/api/urbano/red');
  assert.equal(network.status, 200);
  assert.deepEqual(network.body.lines, [{ id: '36', stops: [] }]);
  assert.equal(network.body.fuente, 'colejuy.vercel.app');

  const line = await request(app).get('/api/urbano/linea/36');
  assert.equal(line.status, 200);
  assert.deepEqual(line.body.line, { id: '36', paths: [] });
  assert.equal(line.body.fuente, 'colejuy.vercel.app');

  const fleet = await request(app).get('/api/urbano/flota');
  assert.equal(fleet.status, 200);
  assert.deepEqual(fleet.body.buses, []);
  assert.equal(fleet.body.actualizado_en, fleetTime);
  assert.equal(fleet.body.fuente, 'colejuy.vercel.app');
});

test('el cliente reutiliza en caché la respuesta del endpoint dentro del TTL', async () => {
  const mock = mockFetch({ lines: { lines: [{ id: '36' }] } });
  const client = createColejuyClient({ fetchImpl: mock.fetchImpl });

  assert.deepEqual(await client.getLines(), { lines: [{ id: '36' }] });
  assert.deepEqual(await client.getLines(), { lines: [{ id: '36' }] });
  assert.equal(mock.calls.length, 1);
});

test('errores HTTP y timeout upstream responden 502 con fuente', async () => {
  const http = appWithResponses({
    lines: { status: 500, body: { message: 'internal' } },
  });
  const failedHttp = await request(http.app).get('/api/urbano/lineas');
  assert.equal(failedHttp.status, 502);
  assert.match(failedHttp.body.error, /HTTP 500/);
  assert.equal(failedHttp.body.fuente, 'colejuy.vercel.app');

  const timeoutError = new Error('timeout');
  timeoutError.name = 'TimeoutError';
  const timeout = appWithResponses({ fleet: timeoutError });
  const failedTimeout = await request(timeout.app).get('/api/urbano/flota');
  assert.equal(failedTimeout.status, 502);
  assert.match(failedTimeout.body.error, /tardó demasiado/);
  assert.equal(failedTimeout.body.fuente, 'colejuy.vercel.app');
});

test('línea inexistente responde 404', async () => {
  const { app } = appWithResponses({
    'lines/missing': { status: 404, body: {} },
  });
  const response = await request(app).get('/api/urbano/linea/missing');
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Línea urbana no encontrada');
  assert.equal(response.body.fuente, 'colejuy.vercel.app');
});

test('paradas cercanas filtra por distancia y ordena por proximidad', async () => {
  const { app } = appWithResponses({
    network: {
      lines: [{
        id: '36',
        name: 'Línea 36',
        stops: [
          { id: 'far', name: 'Lejos', lat: -24.2, lng: -65.3 },
          { id: 'near', name: 'Cerca', lat: -24.18, lng: -65.3 },
          { id: 'closest', name: 'Muy cerca', lat: -24.1801, lng: -65.3 },
        ],
      }],
    },
  });

  const response = await request(app).get('/api/urbano/paradas-cercanas?lat=-24.1802&lng=-65.3&radio_m=500');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.paradas.map(stop => stop.id), ['closest', 'near']);
  assert.ok(response.body.paradas[0].distancia_m < response.body.paradas[1].distancia_m);
  assert.equal(response.body.fuente, 'colejuy.vercel.app');
});

test('paradas cercanas valida coordenadas y radio', async () => {
  const { app, calls } = appWithResponses({ network: { lines: [] } });
  for (const query of [
    '',
    '?lat=91&lng=0',
    '?lat=0&lng=181',
    '?lat=0&lng=0&radio_m=0',
    '?lat=abc&lng=0',
  ]) {
    const response = await request(app).get(`/api/urbano/paradas-cercanas${query}`);
    assert.equal(response.status, 400);
    assert.equal(response.body.fuente, 'colejuy.vercel.app');
  }
  assert.equal(calls.length, 0);
});

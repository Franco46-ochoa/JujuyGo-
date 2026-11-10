import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/index.js';
import {
  buscarCiudad,
  listarCiudades,
  listarEmpresas,
  salidas,
  tarifaPar,
  duracionEstimadaMinutos,
} from '../src/hq.js';

test('lista ciudades y empresas del dataset', () => {
  assert.equal(listarCiudades().length, 18);
  assert.ok(listarEmpresas().length >= 9);
});

test('buscarCiudad acepta id, slug y nombre con/sin acentos', () => {
  assert.equal(buscarCiudad('24').id, 24);
  assert.equal(buscarCiudad('humahuaca').nombre, 'Humahuaca');
  assert.equal(buscarCiudad('San Salvador de Jujuy').id, 10);
  assert.equal(buscarCiudad('Maimara').nombre, 'Maimará');
  assert.equal(buscarCiudad('inexistente'), null);
});

test('salidas SSJ->Humahuaca devuelve servicios ordenados con tarifa y duración', () => {
  const r = salidas('sansalvadordejujuy', 'humahuaca', { desde: '06:00', limite: 10 });
  assert.equal(r.error, undefined);
  assert.ok(r.total > 0);
  const min = r.servicios.map(s => s.salida_minutos);
  assert.deepEqual(min, [...min].sort((a, b) => a - b));
  for (const s of r.servicios) {
    assert.equal(s.fuente, 'Horarios Quebrada (horario-quebrada.netlify.app)');
    assert.ok(s.tarifa_aros === null || typeof s.tarifa_aros === 'number');
  }
});

test('salidas filtra por hora de salida', () => {
  const tarde = salidas(10, 24, { desde: '18:00' });
  assert.ok(tarde.servicios.every(s => s.salida_minutos >= 18 * 60));
  assert.equal(tarde.servicios.length, Math.min(tarde.total, 20));
});

test('salidas incluye direccion ida/vuelta segun sentido del servicio', () => {
  const r = salidas(10, 24, { limite: 100 });
  assert.ok(r.servicios.some(s => s.direccion === 'ida'));
  assert.ok(r.servicios.some(s => s.direccion === 'vuelta'));
});

test('salidas con origen invalido devuelve error', () => {
  const r = salidas('foo', 'humahuaca');
  assert.match(r.error, /origen no encontrado/);
});

test('salidas misma ciudad devuelve error', () => {
  const r = salidas(24, 'humahuaca');
  assert.match(r.error, /misma ciudad/);
});

test('tarifaPar urbano usa SUBE y tarifa generica usa faresGeneric', () => {
  assert.equal(tarifaPar(10, 11, 'Línea 36 (Santa Ana)', 'Urbano'), 1920.12);
  const gen = tarifaPar(20, 21, 'Evelia', 'Rápido');
  assert.ok(gen === null || typeof gen === 'number');
});

test('duracionEstimadaMinutos urbano y generico', () => {
  assert.equal(duracionEstimadaMinutos('Urbano', 'Línea 36 (Santa Ana)', 10, 11), 40);
  const d = duracionEstimadaMinutos('Rápido', 'Evelia', 18, 24);
  assert.ok(d === null || d > 0);
});

test('endpoint /api/hq/salidas responde y valida params', async () => {
  const app = createApp({ pool: {} });
  const ok = await request(app).get('/api/hq/salidas?origen=maimara&destino=tilcara');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.total, 0);
  const noParams = await request(app).get('/api/hq/salidas');
  assert.equal(noParams.status, 400);
  const badDesde = await request(app).get('/api/hq/salidas?origen=maimara&destino=tilcara&desde=25:00');
  assert.equal(badDesde.status, 400);
  const notFound = await request(app).get('/api/hq/salidas?origen=foo&destino=bar');
  assert.equal(notFound.status, 404);
  const ciudades = await request(app).get('/api/hq/ciudades');
  assert.equal(ciudades.status, 200);
  assert.equal(ciudades.body.ciudades.length, 18);
});

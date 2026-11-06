import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/index.js';

const horarios = [
  {
    servicio_id: 'ida-temprano',
    direccion: 'ida',
    hora: '05:30',
    confianza: 'publicado',
    fuente: 'seed RN9',
    parada_slug: 'terminal-jjs',
    orden_en_linea: 1,
  },
  {
    servicio_id: 'ida-temprano',
    direccion: 'ida',
    hora: '07:05',
    confianza: 'publicado',
    fuente: 'seed RN9',
    parada_slug: 'tilcara',
    orden_en_linea: 5,
  },
  {
    servicio_id: 'vuelta-tarde',
    direccion: 'vuelta',
    hora: '19:45',
    confianza: 'publicado',
    fuente: 'seed RN9',
    parada_slug: 'tilcara',
    orden_en_linea: 5,
  },
  {
    servicio_id: 'vuelta-tarde',
    direccion: 'vuelta',
    hora: '21:20',
    confianza: 'publicado',
    fuente: 'seed RN9',
    parada_slug: 'terminal-jjs',
    orden_en_linea: 1,
  },
];

function crearAppDePrueba() {
  const pool = {
    async query(sql) {
      if (sql.includes('FROM lugar')) {
        return {
          rows: [{
            slug: 'tilcara',
            nombre: 'Tilcara',
            datos_json: { localidad: 'Tilcara' },
          }],
        };
      }
      if (sql.includes('FROM horario')) return { rows: horarios };
      throw new Error('Consulta inesperada en el test de travesía');
    },
  };
  return createApp({ pool });
}

describe('POST /api/travesia/validar', () => {
  test('devuelve los tramos RN9 reales que permiten completar el plan', async () => {
    const response = await request(crearAppDePrueba())
      .post('/api/travesia/validar')
      .send({
        dias: [{
          origen: 'terminal-jjs',
          cierre: 'terminal-jjs',
          eventos: [{ lugar: 'tilcara', hora: '08:00', duracion_minutos: 120 }],
        }],
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.validado, true);
    assert.deepEqual(response.body.tramos.map(tramo => tramo.servicio_id), ['ida-temprano', 'vuelta-tarde']);
  });

  test('propone una corrección cuando el regreso no llega antes de la hora de cierre', async () => {
    const response = await request(crearAppDePrueba())
      .post('/api/travesia/validar')
      .send({
        dias: [{
          origen: 'terminal-jjs',
          cierre: 'terminal-jjs',
          eventos: [{ lugar: 'tilcara', hora: '20:00', duracion_minutos: 120 }],
        }],
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.validado, false);
    assert.equal(response.body.conflictos[0].tipo, 'regreso-no-llega-a-tiempo');
    assert.ok(response.body.conflictos[0].propuesta);
  });

  test('rechaza planes incompletos', async () => {
    const response = await request(crearAppDePrueba())
      .post('/api/travesia/validar')
      .send({ dias: [{ eventos: [{ hora: '10:00' }] }] });

    assert.equal(response.status, 400);
    assert.match(response.body.error, /lugar y hora/);
  });
});

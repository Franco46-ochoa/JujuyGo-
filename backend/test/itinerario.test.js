import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolverParadaLugar, validarItinerario } from '../src/itinerario/validar.js';

const lugares = [
  { slug: 'tilcara', nombre: 'Tilcara', datos_json: { localidad: 'Tilcara' } },
  { slug: 'serrania-del-hornocal', nombre: 'Serranía del Hornocal', datos_json: { localidad: 'Humahuaca' } },
  { slug: 'purmamarca', nombre: 'Cerro de los Siete Colores', datos_json: { localidad: 'Purmamarca' } },
];

const horarios = [
  {
    servicio_id: 'ida-temprano',
    direccion: 'ida',
    paradas: [
      { slug: 'terminal-jjs', orden_en_linea: 1, hora: '05:30', confianza: 'publicado', fuente: 'seed' },
      { slug: 'tilcara', orden_en_linea: 5, hora: '07:05', confianza: 'publicado', fuente: 'seed' },
      { slug: 'humahuaca', orden_en_linea: 8, hora: '07:50', confianza: 'publicado', fuente: 'seed' },
    ],
  },
  {
    servicio_id: 'vuelta-manana',
    direccion: 'vuelta',
    paradas: [
      { slug: 'humahuaca', orden_en_linea: 8, hora: '11:30', confianza: 'publicado', fuente: 'seed' },
      { slug: 'tilcara', orden_en_linea: 5, hora: '12:15', confianza: 'publicado', fuente: 'seed' },
      { slug: 'terminal-jjs', orden_en_linea: 1, hora: '13:50', confianza: 'publicado', fuente: 'seed' },
    ],
  },
  {
    servicio_id: 'vuelta-tarde',
    direccion: 'vuelta',
    paradas: [
      { slug: 'humahuaca', orden_en_linea: 8, hora: '19:00', confianza: 'publicado', fuente: 'seed' },
      { slug: 'tilcara', orden_en_linea: 5, hora: '19:45', confianza: 'publicado', fuente: 'seed' },
      { slug: 'terminal-jjs', orden_en_linea: 1, hora: '21:20', confianza: 'publicado', fuente: 'seed' },
    ],
  },
];

describe('motor de validación de travesía', () => {
  test('valida un día que llega a Tilcara y toma el regreso dentro del horario', () => {
    const resultado = validarItinerario({
      dias: [{
        fecha: '2026-11-07',
        origen: 'terminal-jjs',
        cierre: 'terminal-jjs',
        eventos: [{ lugar: 'tilcara', hora: '08:00', duracion_minutos: 120 }],
      }],
    }, { lugares, horarios });

    assert.equal(resultado.validado, true);
    assert.deepEqual(resultado.conflictos, []);
    assert.deepEqual(resultado.tramos.map(tramo => tramo.servicio_id), ['ida-temprano', 'vuelta-tarde']);
    assert.equal(resultado.tramos[0].evento_indice, 0);
    assert.equal(resultado.tramos[1].evento_indice, undefined);
  });

  test('detecta que el regreso de Humahuaca no llega antes del cierre y sugiere una alternativa', () => {
    const resultado = validarItinerario({
      dias: [{
        fecha: '2026-11-07',
        origen: 'terminal-jjs',
        cierre: 'terminal-jjs',
        eventos: [{ lugar: 'serrania-del-hornocal', hora: '18:00', duracion_minutos: 120 }],
      }],
    }, { lugares, horarios });

    assert.equal(resultado.validado, false);
    assert.equal(resultado.conflictos[0].tipo, 'regreso-no-llega-a-tiempo');
    assert.match(resultado.conflictos[0].propuesta, /pasá la noche/i);
  });

  test('mapea Purmamarca al cruce y nunca afirma que el colectivo llega al pueblo', () => {
    const parada = resolverParadaLugar(lugares.find(lugar => lugar.slug === 'purmamarca'));

    assert.equal(parada.slug, 'purmamarca-cruce');
    assert.match(parada.accesoLocal, /3 km del pueblo/i);
  });

  test('advierte el traslado local desde Humahuaca hasta Hornocal', () => {
    const parada = resolverParadaLugar(lugares.find(lugar => lugar.slug === 'serrania-del-hornocal'));

    assert.equal(parada.slug, 'humahuaca');
    assert.match(parada.accesoLocal, /traslado local/i);
  });

  test('detecta eventos superpuestos aun cuando ocurren en la misma parada', () => {
    const resultado = validarItinerario({
      dias: [{
        origen: 'terminal-jjs',
        cierre: 'terminal-jjs',
        eventos: [
          { lugar: 'tilcara', hora: '08:00', duracion_minutos: 120 },
          { lugar: 'tilcara', hora: '09:00', duracion_minutos: 30 },
        ],
      }],
    }, { lugares, horarios });

    assert.equal(resultado.validado, false);
    assert.ok(resultado.conflictos.some(conflicto => conflicto.tipo === 'eventos-superpuestos'));
  });

  test('no permite que una visita se prolongue al día siguiente', () => {
    const resultado = validarItinerario({
      dias: [{
        origen: 'terminal-jjs',
        cierre: 'terminal-jjs',
        eventos: [{ lugar: 'tilcara', hora: '23:00', duracion_minutos: 120 }],
      }],
    }, { lugares, horarios });

    assert.equal(resultado.validado, false);
    assert.ok(resultado.conflictos.some(conflicto => conflicto.tipo === 'visita-excede-dia'));
  });

  test('marca como conflicto un tramo para el que no hay servicio cargado', () => {
    const resultado = validarItinerario({
      dias: [{
        origen: 'terminal-jjs',
        cierre: 'terminal-jjs',
        eventos: [{ lugar: 'serrania-del-hornocal', hora: '08:00' }],
      }],
    }, { lugares, horarios: [] });

    assert.equal(resultado.validado, false);
    assert.equal(resultado.conflictos[0].tipo, 'tramo-sin-transporte');
    assert.ok(resultado.conflictos[0].propuesta);
  });
});

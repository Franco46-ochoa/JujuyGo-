import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolverParadaLugar, validarItinerario } from '../src/itinerario/validar.js';

const lugares = [
  { slug: 'tilcara', nombre: 'Tilcara', datos_json: { localidad: 'Tilcara' } },
  { slug: 'serrania-del-hornocal', nombre: 'Serranía del Hornocal', datos_json: { localidad: 'Humahuaca' } },
  { slug: 'purmamarca', nombre: 'Cerro de los Siete Colores', datos_json: { localidad: 'Purmamarca' } },
];

const semilla = { confianza: 'publicado', fuente: 'seed' };

const horariosPurmamarca = (llegadaCruce, conRegreso = true) => {
  const servicios = [{
    servicio_id: 'ida-purma',
    direccion: 'ida',
    paradas: [
      { slug: 'terminal-jjs', orden_en_linea: 1, hora: '07:00', ...semilla },
      { slug: 'purmamarca-cruce', orden_en_linea: 3, hora: llegadaCruce, ...semilla },
    ],
  }];
  if (conRegreso) {
    servicios.push({
      servicio_id: 'vuelta-purma',
      direccion: 'vuelta',
      paradas: [
        { slug: 'purmamarca-cruce', orden_en_linea: 3, hora: '13:30', ...semilla },
        { slug: 'terminal-jjs', orden_en_linea: 1, hora: '14:10', ...semilla },
      ],
    });
  }
  return servicios;
};

const horariosTilcara = llegadaTilcara => [
  {
    servicio_id: 'ida-tilc',
    direccion: 'ida',
    paradas: [
      { slug: 'terminal-jjs', orden_en_linea: 1, hora: '07:30', ...semilla },
      { slug: 'tilcara', orden_en_linea: 5, hora: llegadaTilcara, ...semilla },
    ],
  },
  {
    servicio_id: 'vuelta-tilc',
    direccion: 'vuelta',
    paradas: [
      { slug: 'tilcara', orden_en_linea: 5, hora: '12:30', ...semilla },
      { slug: 'terminal-jjs', orden_en_linea: 1, hora: '14:00', ...semilla },
    ],
  },
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

describe('margen de traslado entre colectivo y visita', () => {
  test('exige 45 minutos antes de una visita con acceso local (Purmamarca Cruce)', () => {
    const tarde = validarItinerario({
      dias: [{
        origen: 'terminal-jjs',
        cierre: 'terminal-jjs',
        eventos: [{ lugar: 'purmamarca', hora: '09:00', duracion_minutos: 120 }],
      }],
    }, { lugares, horarios: horariosPurmamarca('08:50', false) });

    assert.ok(tarde.conflictos.some(conflicto => conflicto.tipo === 'no-llega-a-tiempo'));

    const justo = validarItinerario({
      dias: [{
        origen: 'terminal-jjs',
        cierre: 'terminal-jjs',
        eventos: [{ lugar: 'purmamarca', hora: '09:00', duracion_minutos: 120 }],
      }],
    }, { lugares, horarios: horariosPurmamarca('08:15') });

    assert.equal(justo.validado, true);
    assert.equal(justo.tramos[0].servicio_id, 'ida-purma');
    assert.equal(justo.tramos[0].hora_llegada, '08:15');
  });

  test('exige 15 minutos base antes de una visita sin acceso local (Tilcara)', () => {
    const tarde = validarItinerario({
      dias: [{
        origen: 'terminal-jjs',
        cierre: 'terminal-jjs',
        eventos: [{ lugar: 'tilcara', hora: '09:00', duracion_minutos: 120 }],
      }],
    }, { lugares, horarios: horariosTilcara('08:50') });

    assert.ok(tarde.conflictos.some(conflicto => conflicto.tipo === 'no-llega-a-tiempo'));

    const justo = validarItinerario({
      dias: [{
        origen: 'terminal-jjs',
        cierre: 'terminal-jjs',
        eventos: [{ lugar: 'tilcara', hora: '09:00', duracion_minutos: 120 }],
      }],
    }, { lugares, horarios: horariosTilcara('08:45') });

    assert.equal(justo.validado, true);
    assert.equal(justo.tramos[0].servicio_id, 'ida-tilc');
    assert.equal(justo.tramos[0].hora_llegada, '08:45');
  });

  test('el regreso sale desde el fin de la visita más el margen de vuelta a la parada', () => {
    const horariosRegreso = [
      ...horariosPurmamarca('08:50', false),
      {
        servicio_id: 'vuelta-1630',
        direccion: 'vuelta',
        paradas: [
          { slug: 'purmamarca-cruce', orden_en_linea: 3, hora: '16:30', ...semilla },
          { slug: 'terminal-jjs', orden_en_linea: 1, hora: '17:10', ...semilla },
        ],
      },
      {
        servicio_id: 'vuelta-1645',
        direccion: 'vuelta',
        paradas: [
          { slug: 'purmamarca-cruce', orden_en_linea: 3, hora: '16:45', ...semilla },
          { slug: 'terminal-jjs', orden_en_linea: 1, hora: '17:25', ...semilla },
        ],
      },
    ];

    const resultado = validarItinerario({
      dias: [{
        origen: 'terminal-jjs',
        cierre: 'terminal-jjs',
        eventos: [{ lugar: 'purmamarca', hora: '14:00', duracion_minutos: 120 }],
      }],
    }, { lugares, horarios: horariosRegreso });

    assert.equal(resultado.validado, true);
    assert.equal(resultado.tramos.at(-1).etiqueta, 'regreso');
    assert.equal(resultado.tramos.at(-1).servicio_id, 'vuelta-1645');

    const sinAlternativa = validarItinerario({
      dias: [{
        origen: 'terminal-jjs',
        cierre: 'terminal-jjs',
        eventos: [{ lugar: 'purmamarca', hora: '14:00', duracion_minutos: 120 }],
      }],
    }, { lugares, horarios: horariosRegreso.filter(servicio => servicio.servicio_id !== 'vuelta-1645') });

    assert.ok(sinAlternativa.conflictos.some(conflicto => conflicto.tipo === 'regreso-no-llega-a-tiempo'));
  });

  test('dos visitas seguidas en la misma parada dejan 15 minutos de margen', () => {
    const resultado = validarItinerario({
      dias: [{
        origen: 'terminal-jjs',
        cierre: 'terminal-jjs',
        eventos: [
          { lugar: 'tilcara', hora: '10:00', duracion_minutos: 60 },
          { lugar: 'tilcara', hora: '11:00', duracion_minutos: 60 },
        ],
      }],
    }, { lugares, horarios });

    assert.equal(resultado.validado, false);
    assert.ok(resultado.conflictos.some(conflicto => conflicto.tipo === 'eventos-superpuestos'));

    const justo = validarItinerario({
      dias: [{
        origen: 'terminal-jjs',
        cierre: 'terminal-jjs',
        eventos: [
          { lugar: 'tilcara', hora: '10:00', duracion_minutos: 60 },
          { lugar: 'tilcara', hora: '11:15', duracion_minutos: 60 },
        ],
      }],
    }, { lugares, horarios });

    assert.equal(justo.validado, true);
  });
});

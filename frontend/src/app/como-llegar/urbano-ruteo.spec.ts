import { describe, expect, it } from 'vitest';
import { UrbanoRed } from '../urbano.types';
import { buscarCombinacionesUrbanas } from './urbano-ruteo';

const origen = { lat: 0, lng: 0 };
const destino = { lat: 0, lng: 0.02 };

function crearRed(): UrbanoRed {
  return {
    fuente: 'colejuy.vercel.app',
    actualizado_en: '2026-11-10T00:00:00.000Z',
    lines: [
      {
        id: 'A',
        name: 'Línea A',
        stops: [
          { id: 'A1', name: 'Origen A', lat: 0, lng: 0, direction: 'ida', order: 1 },
          { id: 'A2', name: 'Transbordo A', lat: 0, lng: 0.01, direction: 'ida', order: 2 },
        ],
      },
      {
        id: 'B',
        name: 'Línea B',
        stops: [
          { id: 'B1', name: 'Transbordo B', lat: 0, lng: 0.0105, direction: 'vuelta', order: 3 },
          { id: 'B2', name: 'Destino B', lat: 0, lng: 0.02, direction: 'vuelta', order: 4 },
        ],
      },
    ],
  };
}

describe('buscarCombinacionesUrbanas', () => {
  it('encuentra una combinación con sentido y orden coherentes en las dos líneas', () => {
    const [ruta] = buscarCombinacionesUrbanas(crearRed(), origen, destino);

    expect(ruta).toMatchObject({
      lineaA: { id: 'A' },
      direccionA: 'ida',
      ascensoA: { parada: { id: 'A1' } },
      descensoA: { id: 'A2', name: 'Transbordo A' },
      lineaB: { id: 'B' },
      direccionB: 'vuelta',
      ascensoB: { parada: { id: 'B1' } },
      descensoB: { parada: { id: 'B2' } },
    });
    expect(ruta.distanciaTotalCaminadaM).toBeGreaterThan(0);
  });

  it('rechaza una segunda línea cuyo orden no avanza hacia el destino', () => {
    const red = crearRed();
    red.lines[1].stops![1].order = 2;

    expect(buscarCombinacionesUrbanas(red, origen, destino)).toEqual([]);
  });

  it('rechaza un tramo si las paradas no comparten dirección', () => {
    const red = crearRed();
    red.lines[1].stops![1].direction = 'ida';

    expect(buscarCombinacionesUrbanas(red, origen, destino)).toEqual([]);
  });

  it('rechaza transferencias a más de 250 m', () => {
    const red = crearRed();
    red.lines[1].stops![0].lng = 0.0125;

    expect(buscarCombinacionesUrbanas(red, origen, destino)).toEqual([]);
  });

  it('deduplica por par de líneas, conservando la opción de menor caminata', () => {
    const red = crearRed();
    red.lines[0].stops!.push(
      { id: 'A3', name: 'Otra subida A', lat: 0, lng: 0.0005, direction: 'ida', order: 1 },
      { id: 'A4', name: 'Otro transbordo A', lat: 0, lng: 0.0101, direction: 'ida', order: 2 },
    );

    const rutas = buscarCombinacionesUrbanas(red, origen, destino);

    expect(rutas).toHaveLength(1);
    expect(rutas[0].ascensoA.parada.id).toBe('A1');
  });

  it('limita el resultado al top N de pares de líneas por distancia caminada', () => {
    const red = crearRed();
    red.lines.push({
      id: 'C',
      name: 'Línea C',
      stops: [
        { id: 'C1', name: 'Transbordo C', lat: 0, lng: 0.0106, direction: 'ida', order: 1 },
        { id: 'C2', name: 'Destino C', lat: 0, lng: 0.0201, direction: 'ida', order: 2 },
      ],
    });

    const rutas = buscarCombinacionesUrbanas(red, origen, destino, 1);

    expect(rutas).toHaveLength(1);
    expect(rutas[0].lineaB.id).toBe('B');
  });

  it('no devuelve rutas si no hay líneas', () => {
    const red = crearRed();
    red.lines = [];

    expect(buscarCombinacionesUrbanas(red, origen, destino)).toEqual([]);
  });
});

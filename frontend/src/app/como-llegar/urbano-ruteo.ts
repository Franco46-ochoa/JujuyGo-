import { UrbanoLinea, UrbanoParada, UrbanoRed } from '../urbano.types';

const RADIO_ORIGEN_METROS = 600;
// Las paradas de transferencia se consideran conectadas si están a <=250 m.
const RADIO_TRANSBORDO_METROS = 250;
const RADIO_DESTINO_METROS = 600;
const RADIO_TIERRA_METROS = 6_371_000;

export interface UrbanoParadaConDistancia {
  parada: UrbanoParada;
  distanciaM: number;
}

export interface UrbanoCombinacion {
  lineaA: UrbanoLinea;
  direccionA: string;
  ascensoA: UrbanoParadaConDistancia;
  descensoA: UrbanoParada;
  lineaB: UrbanoLinea;
  direccionB: string;
  ascensoB: UrbanoParadaConDistancia;
  descensoB: UrbanoParadaConDistancia;
  distanciaTotalCaminadaM: number;
}

function coordenadasValidas(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

function distanciaMetros(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLng = radians(lng2 - lng1);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return RADIO_TIERRA_METROS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function tieneOrdenCoherente(
  ascenso: UrbanoParada,
  descenso: UrbanoParada,
): boolean {
  return typeof ascenso.order === 'number' && Number.isFinite(ascenso.order) &&
    typeof descenso.order === 'number' && Number.isFinite(descenso.order) &&
    ascenso.order < descenso.order;
}

function paradasValidas(linea: UrbanoLinea): UrbanoParada[] {
  return (linea.stops ?? []).filter(parada =>
    typeof parada.direction === 'string' && parada.direction.trim().length > 0 &&
    coordenadasValidas(parada.lat, parada.lng),
  );
}

/**
 * Encuentra sugerencias estimadas con un solo transbordo usando exclusivamente
 * paradas publicadas. Una transferencia requiere paradas a <=250 m; cada tramo
 * debe tener un sentido y un orden ascendente de paradas verificables.
 */
export function buscarCombinacionesUrbanas(
  red: UrbanoRed,
  origen: { lat: number; lng: number },
  destino: { lat: number; lng: number },
  limite = 5,
): UrbanoCombinacion[] {
  if (!Array.isArray(red?.lines) || !coordenadasValidas(origen.lat, origen.lng) ||
    !coordenadasValidas(destino.lat, destino.lng) || !Number.isFinite(limite) || limite <= 0) {
    return [];
  }

  const mejorPorPar = new Map<string, UrbanoCombinacion>();
  const lineasConParadas = red.lines.map(linea => ({
    linea,
    paradas: paradasValidas(linea),
  }));

  for (const { linea: lineaA, paradas: paradasA } of lineasConParadas) {
    for (const ascensoA of paradasA) {
      const distanciaOrigen = distanciaMetros(origen.lat, origen.lng, ascensoA.lat, ascensoA.lng);
      if (distanciaOrigen > RADIO_ORIGEN_METROS) continue;

      for (const descensoA of paradasA) {
        if (ascensoA.id === descensoA.id ||
          ascensoA.direction !== descensoA.direction ||
          !tieneOrdenCoherente(ascensoA, descensoA)) continue;

        for (const { linea: lineaB, paradas: paradasB } of lineasConParadas) {
          if (lineaA.id === lineaB.id) continue;
          for (const ascensoB of paradasB) {
            const distanciaTransbordo = distanciaMetros(
              descensoA.lat,
              descensoA.lng,
              ascensoB.lat,
              ascensoB.lng,
            );
            if (distanciaTransbordo > RADIO_TRANSBORDO_METROS) continue;

            for (const descensoB of paradasB) {
              const distanciaDestino = distanciaMetros(
                destino.lat,
                destino.lng,
                descensoB.lat,
                descensoB.lng,
              );
              if (ascensoB.id === descensoB.id ||
                ascensoB.direction !== descensoB.direction ||
                !tieneOrdenCoherente(ascensoB, descensoB) ||
                distanciaDestino > RADIO_DESTINO_METROS) continue;

              const distanciaTotalCaminadaM =
                distanciaOrigen + distanciaTransbordo + distanciaDestino;
              const combinacion: UrbanoCombinacion = {
                lineaA,
                direccionA: ascensoA.direction!,
                ascensoA: { parada: ascensoA, distanciaM: distanciaOrigen },
                descensoA,
                lineaB,
                direccionB: ascensoB.direction!,
                ascensoB: { parada: ascensoB, distanciaM: distanciaTransbordo },
                descensoB: { parada: descensoB, distanciaM: distanciaDestino },
                distanciaTotalCaminadaM,
              };
              const clave = `${lineaA.id}\u0000${lineaB.id}`;
              const existente = mejorPorPar.get(clave);
              if (!existente || combinacion.distanciaTotalCaminadaM <
                existente.distanciaTotalCaminadaM) {
                mejorPorPar.set(clave, combinacion);
              }
            }
          }
        }
      }
    }
  }

  return [...mejorPorPar.values()]
    .sort((a, b) => a.distanciaTotalCaminadaM - b.distanciaTotalCaminadaM)
    .slice(0, Math.floor(limite));
}

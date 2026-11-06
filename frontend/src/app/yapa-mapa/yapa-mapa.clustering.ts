import { Lugar } from '../catalogo.types';
import { MapCluster } from './yapa-mapa.types';

/**
 * Calcula la distancia ortodrómica (Haversine) entre dos coordenadas en kilómetros.
 */
export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radio medio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Retorna el radio de clustering en kilómetros según el nivel de zoom de Leaflet.
 * En zoom bajo (mapa provincial) agrupa atractivos del mismo pueblo o valles cercanos.
 * A partir de zoom 12-13 (escala local de pueblo) se separan en pins individuales.
 */
export function clusterRadiusKmForZoom(zoom: number): number {
  if (zoom <= 7) return 45;
  if (zoom === 8) return 25;
  if (zoom === 9) return 18;
  if (zoom === 10) return 10;
  if (zoom === 11) return 5;
  return 1.2; // zoom >= 12: atractivos individuales
}

/**
 * Agrupa una lista de lugares en clusters según la distancia y el zoom actual.
 * Aplica el patrón AllTrails / Airbnb: "Pueblo · N" (ej. "Tilcara · 2").
 */
export function computeClusters(lugares: Lugar[], zoom: number): MapCluster[] {
  if (!lugares || lugares.length === 0) return [];

  const radiusKm = clusterRadiusKmForZoom(zoom);
  const clusters: Array<{
    lugares: Lugar[];
    latSum: number;
    lngSum: number;
  }> = [];

  for (const lugar of lugares) {
    if (typeof lugar.lat !== 'number' || typeof lugar.lng !== 'number') continue;

    let bestCluster: (typeof clusters)[0] | null = null;
    let minDistance = Infinity;

    for (const cluster of clusters) {
      const centroidLat = cluster.latSum / cluster.lugares.length;
      const centroidLng = cluster.lngSum / cluster.lugares.length;
      const dist = haversineDistanceKm(lugar.lat, lugar.lng, centroidLat, centroidLng);

      if (dist <= radiusKm && dist < minDistance) {
        minDistance = dist;
        bestCluster = cluster;
      }
    }

    if (bestCluster) {
      bestCluster.lugares.push(lugar);
      bestCluster.latSum += lugar.lat;
      bestCluster.lngSum += lugar.lng;
    } else {
      clusters.push({
        lugares: [lugar],
        latSum: lugar.lat,
        lngSum: lugar.lng,
      });
    }
  }

  return clusters.map((c, index) => {
    const count = c.lugares.length;
    const isCluster = count > 1;
    const lat = c.latSum / count;
    const lng = c.lngSum / count;

    if (!isCluster) {
      const unico = c.lugares[0];
      return {
        id: `single-${unico.slug || index}`,
        isCluster: false,
        nombre: unico.nombre,
        localidad: unico.datos_json?.localidad,
        zona: unico.zona,
        count: 1,
        lat: unico.lat,
        lng: unico.lng,
        lugares: c.lugares,
      };
    }

    // Determinar nombre del cluster (AllTrails/Airbnb: "Tilcara · 2")
    const primerPueblo = c.lugares[0].datos_json?.localidad;
    const mismoPueblo = primerPueblo && c.lugares.every(l => l.datos_json?.localidad === primerPueblo);
    const primeraZona = c.lugares[0].zona;
    const mismaZona = primeraZona && c.lugares.every(l => l.zona === primeraZona);

    let etiquetaBase = 'Jujuy';
    if (mismoPueblo) {
      etiquetaBase = primerPueblo;
    } else if (mismaZona) {
      etiquetaBase = primeraZona;
    }

    return {
      id: `cluster-${index}-${c.lugares.map(l => l.slug).join('-')}`,
      isCluster: true,
      nombre: `${etiquetaBase} · ${count}`,
      localidad: mismoPueblo ? primerPueblo : undefined,
      zona: mismaZona ? primeraZona : undefined,
      count,
      lat,
      lng,
      lugares: c.lugares,
    };
  });
}

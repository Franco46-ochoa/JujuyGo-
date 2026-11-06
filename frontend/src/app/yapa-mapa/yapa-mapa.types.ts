import { Lugar } from '../catalogo.types';

export interface MapCluster {
  id: string;
  isCluster: boolean;
  nombre: string;
  localidad?: string;
  zona?: string;
  count: number;
  lat: number;
  lng: number;
  lugares: Lugar[];
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

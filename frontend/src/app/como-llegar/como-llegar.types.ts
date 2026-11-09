export interface PuntoTransporte {
  id?: number;
  linea_id?: string;
  nombre: string;
  slug?: string;
  orden_en_linea?: number;
  lat: number | null;
  lng: number | null;
  tipo: string;
  notas?: string | null;
  detalle?: string;
}

export interface EntidadTransporte {
  slug: string;
  nombre: string;
  tipo: string;
  lat: number | null;
  lng: number | null;
  altitud_m?: number | null;
  descripcion?: string;
  como_llegar?: string;
  localidad?: string | null;
}

export interface ServicioTransporte {
  servicio_id: string;
  linea_id: string;
  linea_nombre: string;
  hora_salida: string;
  hora_llegada: string;
  hora_estimada_llegada: string;
  duracion_minutos: number;
  duracion_estimada: string;
  duracion_aproximada: string;
  confianza: 'publicado' | 'estimado' | 'tiempo-real' | string;
  fuente: string;
  frecuencia_dias?: string;
}

export interface TrasladoLocal {
  titulo: string;
  tipo: string;
  distancia_km: number;
  duracion_estimada: string;
  descripcion: string;
}

interface RespuestaTrayecto {
  mismo_punto?: false;
  origen: EntidadTransporte;
  destino: EntidadTransporte;
  paradaOrigen: PuntoTransporte | null;
  paradaDestino: PuntoTransporte | null;
  direccion: string | null;
  tiene_servicio_rn9: boolean;
  motivo_sin_servicio: string | null;
  alternativa_honesta: string | null;
  traslado_inicial: TrasladoLocal | null;
  traslado_final: TrasladoLocal | null;
  servicios: ServicioTransporte[];
  paradas_tramo: PuntoTransporte[];
  polyline: [number, number][];
  puntos: PuntoTransporte[];
}

export interface RespuestaMismoPunto {
  mismo_punto: true;
  mensaje: string;
  servicios: [];
  puntos: [];
  polyline: [];
}

export type RespuestaComoLlegar = RespuestaTrayecto | RespuestaMismoPunto;

export interface OpcionOrigen {
  slug: string;
  nombre: string;
  grupo: 'terminales' | 'paradas' | 'lugares';
}

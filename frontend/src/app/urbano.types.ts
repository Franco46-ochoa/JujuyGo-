export interface UrbanoMetadata {
  fuente: string;
  actualizado_en: string;
}

export interface UrbanoParada {
  id: string | number;
  name: string;
  lat: number;
  lng: number;
  direction?: string;
  order?: number;
}

export interface UrbanoLinea {
  id: string;
  name?: string;
  number?: string | number;
  company?: string;
  stops?: UrbanoParada[];
}

export interface UrbanoRed extends UrbanoMetadata {
  lines: UrbanoLinea[];
}

export interface UrbanoLineas extends UrbanoMetadata {
  lines: UrbanoLinea[];
}

export interface UrbanoGeometria {
  direction: string;
  coordinates: [number, number][];
}

export interface UrbanoDetalleLinea extends UrbanoMetadata {
  line: UrbanoLinea;
  paths: UrbanoGeometria[];
}

export interface UrbanoColectivo {
  id: string;
  line: string;
  number?: string | number;
  lat: number;
  lng: number;
  speed?: number;
  course?: number;
  moving?: boolean;
  fresh: boolean;
  age: number;
}

export interface UrbanoFlota extends UrbanoMetadata {
  buses: UrbanoColectivo[];
  stale: boolean;
}

export interface UrbanoParadasCercanas extends UrbanoMetadata {
  paradas: (UrbanoParada & {
    linea_id: string;
    linea?: string;
    distancia_m: number;
  })[];
}

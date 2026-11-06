export interface Lugar {
  id: number;
  nombre: string;
  slug: string;
  lat: number;
  lng: number;
  altitud_m: number | null;
  descripcion: string;
  como_llegar: string;
  mejor_epoca: string;
  foto: string | null;
  zona: string;
  zona_slug: string;
  datos_json: {
    localidad?: string;
    nota?: string;
  };
}

export interface Zona {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string;
  orden: number;
  lugar_destacado: Pick<Lugar, 'nombre' | 'slug' | 'altitud_m' | 'foto' | 'como_llegar'> | null;
}

export interface ZonaDetalle extends Omit<Zona, 'lugar_destacado'> {
  lugares: Lugar[];
}

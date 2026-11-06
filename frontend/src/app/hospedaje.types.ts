export interface Hospedaje {
  id: number;
  nombre: string;
  slug: string;
  tipo: 'hotel' | 'hosteria' | 'posada' | 'refugio' | 'camping';
  localidad: string;
  zona_slug: string | null;
  descripcion: string | null;
  contacto_url: string | null;
  fuente: string;
  verificado: boolean;
}

export interface Guia {
  id: number;
  nombre: string;
  zona_slug: string | null;
  especialidad: string | null;
  fuente: string;
  verificado: boolean;
}

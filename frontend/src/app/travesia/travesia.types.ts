export type Interes = 'paisaje' | 'cultura' | 'aventura';
export type Llegada = 'avion' | 'terminal' | 'auto';

export interface EventoTravesia {
  id: string;
  lugar: string;
  hora: string;
  duracion_minutos: number;
  nombre?: string;
  parada?: string | null;
  acceso_local?: string;
  validado?: boolean;
}

export interface DiaTravesia {
  fecha: string;
  origen: string;
  cierre: string;
  hora_inicio: string;
  hora_cierre: string;
  eventos: EventoTravesia[];
  validado?: boolean;
  conflictos?: string[];
}

export interface PlanTravesia {
  llegada: Llegada;
  intereses: Interes[];
  dias: DiaTravesia[];
}

export interface ConflictoTravesia {
  dia: number;
  tipo: string;
  mensaje: string;
  propuesta: string;
  tramo?: {
    origen: string;
    destino: string;
    desde: string;
    hasta: string;
    etiqueta: string;
  };
}

export interface TramoTravesia {
  dia: number;
  evento_indice?: number;
  origen: string;
  destino: string;
  etiqueta: string;
  servicio_id: string;
  hora_salida: string;
  hora_llegada: string;
  confianza: string;
  fuente: string;
}

export interface ResultadoValidacion {
  plan: PlanTravesia;
  validado: boolean;
  tramos: TramoTravesia[];
  conflictos: ConflictoTravesia[];
}

export interface ServicioProximo {
  servicio_id: string;
  hora_salida: string;
  hora_llegada: string;
  confianza: string;
  fuente: string;
  duracion_minutos: number;
}

export interface RespuestaProximos {
  origen: { slug: string; nombre: string };
  destino: { slug: string; nombre: string };
  direccion: string;
  servicios: ServicioProximo[];
}


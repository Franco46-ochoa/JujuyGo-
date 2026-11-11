import { DiaTravesia, EventoTravesia, Interes, Llegada, PlanTravesia } from './travesia.types';

export interface DatosTravesiaGuardada {
  plan: PlanTravesia;
  lugaresElegidos: string[];
}

const interesesPermitidos: Interes[] = ['paisaje', 'cultura', 'aventura'];
const llegadasPermitidas: Llegada[] = ['avion', 'terminal', 'auto'];

export function serializarPlan(
  plan: PlanTravesia,
  lugaresElegidos: string[],
): DatosTravesiaGuardada {
  return {
    plan: JSON.parse(JSON.stringify(plan)) as PlanTravesia,
    lugaresElegidos: [...lugaresElegidos],
  };
}

export function deserializarPlan(datos: unknown): DatosTravesiaGuardada | null {
  if (!esRegistro(datos) || !esPlan(datos['plan'])) return null;
  const lugaresElegidos = datos['lugaresElegidos'];
  if (!Array.isArray(lugaresElegidos) || !lugaresElegidos.every(esTexto)) return null;
  return { plan: datos['plan'], lugaresElegidos };
}

export function tituloTravesia(plan: PlanTravesia): string {
  const primeraFecha = plan.dias[0]?.fecha;
  const ultimaFecha = plan.dias.at(-1)?.fecha;
  if (!primeraFecha || !ultimaFecha) return `Travesía ${plan.dias.length} días`;

  const inicio = partesFecha(primeraFecha);
  const fin = partesFecha(ultimaFecha);
  const rango = inicio.mes === fin.mes && inicio.anio === fin.anio
    ? `${inicio.dia}-${fin.dia} ${fin.mes}`
    : `${inicio.dia} ${inicio.mes}-${fin.dia} ${fin.mes}`;
  const cantidad = plan.dias.length === 1 ? 'día' : 'días';
  return `Travesía ${plan.dias.length} ${cantidad} · ${rango}`;
}

function partesFecha(fecha: string): { dia: string; mes: string; anio: string } {
  const date = new Date(`${fecha}T12:00:00`);
  const partes = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date);
  const obtener = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find(parte => parte.type === tipo)?.value ?? '';
  return {
    dia: obtener('day'),
    mes: obtener('month').replace('.', ''),
    anio: obtener('year'),
  };
}

function esPlan(value: unknown): value is PlanTravesia {
  if (!esRegistro(value)
    || !llegadasPermitidas.includes(value['llegada'] as Llegada)
    || !Array.isArray(value['intereses'])
    || !value['intereses'].every(interes => interesesPermitidos.includes(interes as Interes))
    || !Array.isArray(value['dias'])
    || !value['dias'].length) return false;
  return value['dias'].every(esDia);
}

function esDia(value: unknown): value is DiaTravesia {
  return esRegistro(value)
    && esTexto(value['fecha'])
    && esTexto(value['origen'])
    && esTexto(value['cierre'])
    && esTexto(value['hora_inicio'])
    && esTexto(value['hora_cierre'])
    && Array.isArray(value['eventos'])
    && value['eventos'].every(esEvento);
}

function esEvento(value: unknown): value is EventoTravesia {
  return esRegistro(value)
    && esTexto(value['id'])
    && esTexto(value['lugar'])
    && esTexto(value['hora'])
    && typeof value['duracion_minutos'] === 'number'
    && (value['nombre'] === undefined || esTexto(value['nombre']))
    && (value['parada'] === undefined || value['parada'] === null || esTexto(value['parada']))
    && (value['acceso_local'] === undefined || esTexto(value['acceso_local']))
    && (value['validado'] === undefined || typeof value['validado'] === 'boolean');
}

function esRegistro(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function esTexto(value: unknown): value is string {
  return typeof value === 'string';
}

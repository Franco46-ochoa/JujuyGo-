import { Lugar } from '../catalogo.types';
import { DiaTravesia, Interes, Llegada, PlanTravesia } from './travesia.types';

const PARADAS_POR_LOCALIDAD: Record<string, string> = {
  'abra pampa': 'abra-pampa',
  humahuaca: 'humahuaca',
  'la quiaca': 'la-quiaca',
  maimará: 'maimara',
  maimara: 'maimara',
  purmamarca: 'purmamarca-cruce',
  'san salvador de jujuy': 'terminal-jjs',
  tilcara: 'tilcara',
  uquía: 'uquia',
  uquia: 'uquia',
  volcán: 'volcan',
  volcan: 'volcan',
};

const PALABRAS_POR_INTERES: Record<Interes, RegExp> = {
  paisaje: /cerro|serran[ií]a|salinas|laguna|paleta|quebrada|mirador|valle/i,
  cultura: /pucar[aá]|monumento|plaza|tren|iglesia|pueblo|hist[oó]ric/i,
  aventura: /garganta|parque|sendero|laguna|caminata|altura|monta[ñn]a/i,
};

function fechasEntre(inicio: string, fin: string): string[] {
  const fechaInicio = new Date(`${inicio}T12:00:00`);
  const fechaFin = new Date(`${fin}T12:00:00`);
  if (!inicio || !fin || Number.isNaN(fechaInicio.valueOf()) || fechaInicio > fechaFin) return [];

  const fechas: string[] = [];
  for (const fecha = fechaInicio; fecha <= fechaFin; fecha.setDate(fecha.getDate() + 1)) {
    fechas.push(`${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`);
  }
  return fechas;
}

function paradaDe(lugar: Lugar): string | null {
  const localidad = lugar.datos_json.localidad?.trim().toLocaleLowerCase('es');
  return localidad ? PARADAS_POR_LOCALIDAD[localidad] ?? null : null;
}

function puntaje(lugar: Lugar, intereses: Interes[]): number {
  const texto = `${lugar.nombre} ${lugar.descripcion} ${lugar.datos_json.nota ?? ''}`;
  return intereses.reduce((total, interes) => total + Number(PALABRAS_POR_INTERES[interes].test(texto)), 0);
}

export function crearPlan(
  inicio: string,
  fin: string,
  llegada: Llegada,
  intereses: Interes[],
  lugares: Lugar[],
): PlanTravesia | null {
  const fechas = fechasEntre(inicio, fin);
  if (!fechas.length) return null;

  const candidatos = [...lugares]
    .sort((a, b) => puntaje(b, intereses) - puntaje(a, intereses) || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, fechas.length * 2);

  let paradaNoche = llegada === 'auto' ? paradaDe(candidatos[0]) ?? 'terminal-jjs' : 'terminal-jjs';
  const dias: DiaTravesia[] = fechas.map((fecha, indice) => {
    const lugaresDelDia = candidatos.slice(indice * 2, indice * 2 + 2);
    const eventos = lugaresDelDia.map((lugar, eventoIndex) => ({
      id: `${fecha}-${lugar.slug}`,
      lugar: lugar.slug,
      nombre: lugar.nombre,
      hora: eventoIndex === 0 ? '09:00' : '14:00',
      duracion_minutos: 120,
    }));
    const primeraParada = lugaresDelDia[0] ? paradaDe(lugaresDelDia[0]) : null;
    const ultimaParada = lugaresDelDia.length ? paradaDe(lugaresDelDia[lugaresDelDia.length - 1]) : null;
    const origen = indice === 0 ? paradaNoche : paradaNoche;
    const cierre = indice === fechas.length - 1
      ? llegada === 'auto' ? ultimaParada ?? primeraParada ?? paradaNoche : 'terminal-jjs'
      : ultimaParada ?? primeraParada ?? paradaNoche;

    paradaNoche = cierre;
    return {
      fecha,
      origen,
      cierre,
      hora_inicio: indice === 0 && llegada !== 'auto' ? '05:30' : '07:00',
      hora_cierre: '22:00',
      eventos,
    };
  });

  return { llegada, intereses, dias };
}

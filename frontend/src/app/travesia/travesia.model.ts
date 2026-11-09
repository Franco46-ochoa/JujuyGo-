import { Lugar } from '../catalogo.types';
import {
  ContextoTravesia,
  DiaTravesia,
  HorarioTravesia,
  Interes,
  Llegada,
  ParadaTravesia,
  PlanTravesia,
} from './travesia.types';

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

const ORDEN_RN9: Record<string, number> = {
  'terminal-jjs': 1,
  volcan: 2,
  'purmamarca-cruce': 3,
  maimara: 4,
  tilcara: 5,
  huacalera: 6,
  uquia: 7,
  humahuaca: 8,
  'abra-pampa': 9,
  'la-quiaca': 10,
};

const PALABRAS_POR_INTERES: Record<Interes, RegExp> = {
  paisaje: /cerro|serran[ií]a|salinas|laguna|paleta|quebrada|mirador|valle/i,
  cultura: /pucar[aá]|monumento|plaza|tren|iglesia|pueblo|hist[oó]ric/i,
  aventura: /garganta|parque|sendero|laguna|caminata|altura|monta[ñn]a/i,
};

export function paradaSlugDeLugar(lugar: Lugar): string | null {
  const localidad = lugar.datos_json.localidad?.trim().toLocaleLowerCase('es');
  return localidad ? PARADAS_POR_LOCALIDAD[localidad] ?? null : null;
}

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

function puntaje(lugar: Lugar, intereses: Interes[]): number {
  const texto = `${lugar.nombre} ${lugar.descripcion} ${lugar.datos_json.nota ?? ''}`;
  return intereses.reduce((total, interes) => total + Number(PALABRAS_POR_INTERES[interes].test(texto)), 0);
}

function ordenParada(lugar: Lugar, paradas: ParadaTravesia[]): number {
  if (lugar.datos_json.localidad?.trim().toLocaleLowerCase('es') === 'yala') return 0;
  const slug = paradaSlugDeLugar(lugar);
  return paradas.find(parada => parada.slug === slug)?.orden_en_linea
    ?? (slug ? ORDEN_RN9[slug] : Number.MAX_SAFE_INTEGER);
}

function agruparGeograficamente(lugares: Lugar[], paradas: ParadaTravesia[]): Lugar[][] {
  const grupos: Lugar[][] = [];
  for (const lugar of [...lugares].sort((a, b) =>
    ordenParada(a, paradas) - ordenParada(b, paradas)
    || a.zona_slug.localeCompare(b.zona_slug)
    || a.nombre.localeCompare(b.nombre, 'es'),
  )) {
    const grupo = grupos.at(-1);
    const anterior = grupo?.at(-1);
    if (grupo && anterior && (lugar.zona_slug === anterior.zona_slug
      || lugar.datos_json.localidad === anterior.datos_json.localidad)) grupo.push(lugar);
    else grupos.push([lugar]);
  }
  return grupos;
}

function minutos(hora: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(hora);
  if (!match) return null;
  const total = Number(match[1]) * 60 + Number(match[2]);
  return Number(match[1]) < 24 && Number(match[2]) < 60 ? total : null;
}

function horaDesdeMinutos(total: number): string {
  const hora = Math.floor(total / 60) % 24;
  const minuto = total % 60;
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

function primerServicio(
  horarios: HorarioTravesia[],
  paradas: ParadaTravesia[],
  origen: string,
  destino: string,
  despuesDe: string,
): { llegada: string } | null {
  const ordenOrigen = paradas.find(parada => parada.slug === origen)?.orden_en_linea;
  const ordenDestino = paradas.find(parada => parada.slug === destino)?.orden_en_linea;
  const salidaMinima = minutos(despuesDe);
  if (ordenOrigen === undefined || ordenDestino === undefined || salidaMinima === null) return null;

  const servicios = horarios.flatMap(horario => {
    const origenHorario = horario.paradas.find(parada => parada.slug === origen);
    const destinoHorario = horario.paradas.find(parada => parada.slug === destino);
    if (!origenHorario || !destinoHorario) return [];
    const vaAlNorte = ordenOrigen < ordenDestino;
    if (vaAlNorte !== (horario.direccion === 'ida')) return [];
    if (vaAlNorte !== (origenHorario.orden_en_linea < destinoHorario.orden_en_linea)) return [];
    const salida = minutos(origenHorario.hora);
    const llegada = minutos(destinoHorario.hora);
    if (salida === null || llegada === null || salida < salidaMinima) return [];
    return [{ salida, llegada: llegada < salida ? llegada + 1440 : llegada }];
  }).sort((a, b) => a.salida - b.salida);

  const servicio = servicios[0];
  return servicio ? { llegada: horaDesdeMinutos(servicio.llegada) } : null;
}

function gruposParaPlan(
  candidatos: Lugar[],
  seleccionados: boolean,
  fechasDisponibles: number,
  paradas: ParadaTravesia[],
  intereses: Interes[],
): Lugar[][] {
  const grupos = agruparGeograficamente(candidatos, paradas);
  if (seleccionados) {
    return grupos.flatMap(grupo => {
      const partes: Lugar[][] = [];
      for (let indice = 0; indice < grupo.length; indice += 3) {
        partes.push(grupo.slice(indice, indice + 3));
      }
      return partes;
    });
  }

  return grupos
    .map(grupo => ({
      grupo: grupo
        .sort((a, b) => puntaje(b, intereses) - puntaje(a, intereses) || a.nombre.localeCompare(b.nombre, 'es'))
        .slice(0, 3),
      puntaje: Math.max(...grupo.map(lugar => puntaje(lugar, intereses))),
      orden: ordenParada(grupo[0], paradas),
    }))
    .sort((a, b) => b.puntaje - a.puntaje || a.orden - b.orden)
    .slice(0, fechasDisponibles)
    .sort((a, b) => a.orden - b.orden)
    .map(grupo => grupo.grupo);
}

export function crearPlan(
  inicio: string,
  fin: string,
  llegada: Llegada,
  intereses: Interes[],
  lugares: Lugar[],
  lugaresElegidos: string[] = [],
  contexto: ContextoTravesia | null = null,
): PlanTravesia | null {
  const fechas = fechasEntre(inicio, fin);
  if (!fechas.length) return null;

  const paradas = contexto?.paradas ?? [];
  const elegidos = new Set(lugaresElegidos);
  const candidatos = lugaresElegidos.length
    ? lugares.filter(lugar => elegidos.has(lugar.slug))
    : [...lugares]
      .sort((a, b) => puntaje(b, intereses) - puntaje(a, intereses) || a.nombre.localeCompare(b.nombre, 'es'));
  const grupos = gruposParaPlan(
    candidatos,
    lugaresElegidos.length > 0,
    fechas.length,
    paradas,
    intereses,
  );
  if (grupos.length > fechas.length || grupos.some(grupo => grupo.length > fechas.length * 3)) return null;

  const dias: DiaTravesia[] = fechas.map((fecha, indice) => ({
    fecha,
    origen: indice === 0 && llegada === 'auto' ? 'terminal-jjs' : 'terminal-jjs',
    cierre: 'terminal-jjs',
    hora_inicio: indice === 0 && llegada !== 'auto' ? '05:30' : '07:00',
    hora_cierre: '22:00',
    eventos: [],
  }));
  let nocheAnterior = 'terminal-jjs';
  let indiceDia = 0;

  grupos.forEach(grupo => {
    const dia = dias[indiceDia];
    dia.origen = indiceDia === 0 && llegada === 'auto'
      ? paradaSlugDeLugar(grupo[0]) ?? nocheAnterior
      : nocheAnterior;
    if (indiceDia === 0 && llegada === 'auto') nocheAnterior = dia.origen;
    let paradaAnterior = nocheAnterior;
    let finEvento = '07:00';

    grupo.forEach((lugar, eventoIndex) => {
      const paradaActual = paradaSlugDeLugar(lugar);
      let hora = eventoIndex === 0 ? '09:00' : '14:00';
      if (contexto && paradaActual) {
        const servicio = primerServicio(
          contexto.horarios,
          contexto.paradas,
          paradaAnterior,
          paradaActual,
          finEvento,
        );
        if (servicio) {
          const llegadaMinutos = minutos(servicio.llegada) ?? 0;
          hora = horaDesdeMinutos(Math.max(llegadaMinutos + 30, minutos(hora) ?? 0));
        } else if (paradaActual === paradaAnterior) {
          hora = horaDesdeMinutos(Math.max(minutos(hora) ?? 0, (minutos(finEvento) ?? 0) + 30));
        }
      }

      dia.eventos.push({
        id: `${dia.fecha}-${lugar.slug}`,
        lugar: lugar.slug,
        nombre: lugar.nombre,
        hora,
        duracion_minutos: 120,
      });
      paradaAnterior = paradaActual ?? paradaAnterior;
      finEvento = horaDesdeMinutos((minutos(hora) ?? 0) + 150);
    });

    const ultimaParada = grupo.at(-1) ? paradaSlugDeLugar(grupo.at(-1)!) : null;
    const cierre = indiceDia === fechas.length - 1
      ? llegada === 'auto' ? ultimaParada ?? nocheAnterior : 'terminal-jjs'
      : ultimaParada ?? nocheAnterior;
    dia.cierre = cierre;
    nocheAnterior = cierre;
    indiceDia++;
  });

  return { llegada, intereses, dias };
}

import { ACCESOS_LOCALES, margenDeLugar } from './margenes.js';

const PARADAS_POR_LOCALIDAD = new Map([
  ['abra pampa', 'abra-pampa'],
  ['humahuaca', 'humahuaca'],
  ['la quiaca', 'la-quiaca'],
  ['maimará', 'maimara'],
  ['maimara', 'maimara'],
  ['purmamarca', 'purmamarca-cruce'],
  ['san salvador de jujuy', 'terminal-jjs'],
  ['tilcara', 'tilcara'],
  ['uquía', 'uquia'],
  ['uquia', 'uquia'],
  ['volcán', 'volcan'],
  ['volcan', 'volcan'],
]);

export function resolverParadaLugar(lugar) {
  const localidad = lugar?.datos_json?.localidad?.trim().toLocaleLowerCase('es');
  const paradaSlug = localidad ? PARADAS_POR_LOCALIDAD.get(localidad) : null;

  if (!paradaSlug) return null;

  return {
    slug: paradaSlug,
    accesoLocal: ACCESOS_LOCALES.get(lugar.slug) ?? ACCESOS_LOCALES.get(paradaSlug) ?? null,
  };
}

export function horaAMinutos(hora) {
  if (typeof hora !== 'string' || !/^\d{2}:\d{2}$/.test(hora)) return null;
  const [horas, minutos] = hora.split(':').map(Number);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}

function horaDesdeMinutos(total) {
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return `${String(horas).padStart(2, '0')}:${String(resto).padStart(2, '0')}`;
}

function buscarServicio(horarios, origenSlug, destinoSlug, desde, hasta) {
  const salidaMinima = horaAMinutos(desde);
  const llegadaMaxima = horaAMinutos(hasta);
  if (salidaMinima === null || llegadaMaxima === null) return { estado: 'sin-horario' };

  const candidatos = horarios
    .filter(h => h.paradas.some(p => p.slug === origenSlug)
      && h.paradas.some(p => p.slug === destinoSlug))
    .map(horario => {
      const origen = horario.paradas.find(p => p.slug === origenSlug);
      const destino = horario.paradas.find(p => p.slug === destinoSlug);
      return {
        horario,
        origen,
        destino,
        direccionValida: horario.direccion === 'ida'
          ? origen.orden_en_linea < destino.orden_en_linea
          : origen.orden_en_linea > destino.orden_en_linea,
      };
    })
    .filter(({ direccionValida }) => direccionValida);

  const disponibles = candidatos
    .filter(({ origen, destino }) => {
      const salida = horaAMinutos(origen.hora);
      let llegada = horaAMinutos(destino.hora);
      if (llegada < salida) llegada += 24 * 60;
      return salida >= salidaMinima && llegada <= llegadaMaxima;
    })
    .sort((a, b) => horaAMinutos(b.origen.hora) - horaAMinutos(a.origen.hora));

  if (disponibles.length) {
    const elegido = disponibles[0];
    return {
      estado: 'encontrado',
      servicio: {
        servicio_id: elegido.horario.servicio_id,
        hora_salida: elegido.origen.hora,
        hora_llegada: elegido.destino.hora,
        confianza: [elegido.origen.confianza, elegido.destino.confianza].includes('estimado')
          ? 'estimado'
          : 'publicado',
        fuente: elegido.origen.fuente === elegido.destino.fuente
          ? elegido.origen.fuente
          : `${elegido.origen.fuente} / ${elegido.destino.fuente}`,
      },
    };
  }

  return { estado: candidatos.length ? 'no-llega-a-tiempo' : 'sin-transporte' };
}

function crearConflicto({ dia, tipo, mensaje, propuesta, tramo }) {
  return { dia, tipo, mensaje, propuesta, ...(tramo ? { tramo } : {}) };
}

function validarTramo({
  dia,
  origen,
  destino,
  desde,
  hasta,
  horarios,
  conflictos,
  tramos,
  etiqueta,
  eventoIndice,
}) {
  if (origen === destino) return;

  const resultado = buscarServicio(horarios, origen, destino, desde, hasta);
  if (resultado.estado === 'encontrado') {
    tramos.push({
      dia,
      origen,
      destino,
      etiqueta,
      ...(eventoIndice === undefined ? {} : { evento_indice: eventoIndice }),
      ...resultado.servicio,
    });
    return;
  }

  const esRegreso = etiqueta === 'regreso';
  const tipo = resultado.estado === 'sin-transporte'
    ? 'tramo-sin-transporte'
    : esRegreso ? 'regreso-no-llega-a-tiempo' : 'no-llega-a-tiempo';
  const mensaje = resultado.estado === 'sin-transporte'
    ? `No hay un servicio RN9 cargado entre ${origen} y ${destino}.`
    : `No hay un servicio que llegue de ${origen} a ${destino} antes de las ${hasta}.`;
  const propuesta = resultado.estado === 'sin-transporte'
    ? 'Elegí un destino sobre la RN9 o coordiná un traslado local por fuera del colectivo.'
    : esRegreso
      ? 'Acortá la última visita o pasá la noche en el destino para tomar el primer servicio del día siguiente.'
      : 'Mové la visita más tarde o reordená el día para tomar un servicio anterior.';

  conflictos.push(crearConflicto({
    dia,
    tipo,
    mensaje,
    propuesta,
    tramo: { origen, destino, desde, hasta, etiqueta },
  }));
}

export function validarItinerario(plan, { lugares, horarios }) {
  const lugaresPorSlug = new Map(lugares.map(lugar => [lugar.slug, lugar]));
  const conflictos = [];
  const tramos = [];
  const dias = plan.dias.map((dia, indice) => {
    const numeroDia = indice + 1;
    let paradaActual = dia.origen ?? 'terminal-jjs';
    let horaDisponible = dia.hora_inicio ?? '05:30';

    const eventos = dia.eventos.map((evento, eventoIndice) => {
      const lugar = lugaresPorSlug.get(evento.lugar);
      if (!lugar) {
        conflictos.push(crearConflicto({
          dia: numeroDia,
          tipo: 'lugar-desconocido',
          mensaje: `No encontramos el lugar "${evento.lugar}" en el catálogo.`,
          propuesta: 'Elegí un lugar del catálogo para validar sus horarios.',
        }));
        return { ...evento, validado: false, conflictos: ['lugar-desconocido'] };
      }

      const parada = resolverParadaLugar(lugar);
      const horaEvento = horaAMinutos(evento.hora);
      if (!parada) {
        conflictos.push(crearConflicto({
          dia: numeroDia,
          tipo: 'tramo-sin-transporte',
          mensaje: `No hay una parada RN9 asociada a ${lugar.nombre}.`,
          propuesta: 'Coordiná un traslado local o reemplazá el lugar por uno conectado a la RN9.',
        }));
        return {
          ...evento,
          nombre: lugar.nombre,
          parada: null,
          validado: false,
          conflictos: ['tramo-sin-transporte'],
        };
      }

      const conflictoInicial = conflictos.length;
      const margen = margenDeLugar(lugar, parada);
      if (horaEvento === null) {
        conflictos.push(crearConflicto({
          dia: numeroDia,
          tipo: 'hora-invalida',
          mensaje: `La hora de ${lugar.nombre} no es válida.`,
          propuesta: 'Ingresá una hora entre 00:00 y 23:59.',
        }));
      } else {
        if (horaEvento < horaAMinutos(horaDisponible)) {
          conflictos.push(crearConflicto({
            dia: numeroDia,
            tipo: 'eventos-superpuestos',
            mensaje: `${lugar.nombre} empieza antes de que termine el evento anterior.`,
            propuesta: 'Mové esta visita más tarde o reordená los eventos del día.',
          }));
        } else {
          validarTramo({
            dia: numeroDia,
            origen: paradaActual,
            destino: parada.slug,
            desde: horaDisponible,
            hasta: horaDesdeMinutos(Math.max(0, horaEvento - margen)),
            horarios,
            conflictos,
            tramos,
            etiqueta: 'visita',
            eventoIndice,
          });
        }
        paradaActual = parada.slug;
        const duracion = Number.isInteger(evento.duracion_minutos) && evento.duracion_minutos >= 0
          ? evento.duracion_minutos
          : 90;
        const finConMargen = horaEvento + duracion + margen;
        if (finConMargen >= 24 * 60) {
          conflictos.push(crearConflicto({
            dia: numeroDia,
            tipo: 'visita-excede-dia',
            mensaje: `La visita a ${lugar.nombre} termina fuera del día planificado.`,
            propuesta: 'Acortá la visita o movela a otro día.',
          }));
          horaDisponible = '23:59';
        } else {
          horaDisponible = horaDesdeMinutos(finConMargen);
        }
      }

      const accesoLocal = parada.accesoLocal;
      return {
        ...evento,
        nombre: lugar.nombre,
        parada: parada.slug,
        ...(accesoLocal ? { acceso_local: accesoLocal } : {}),
        validado: conflictos.length === conflictoInicial,
        conflictos: conflictos.slice(conflictoInicial).map(conflicto => conflicto.tipo),
      };
    });

    const ultimoEvento = eventos.at(-1);
    const ultimoLugar = ultimoEvento ? lugaresPorSlug.get(ultimoEvento.lugar) : null;
    const ultimaParada = ultimoLugar ? resolverParadaLugar(ultimoLugar)?.slug : null;
    const fin = dia.cierre ?? dia.origen ?? 'terminal-jjs';
    const horaRegreso = horaDisponible;

    if (ultimaParada) {
      validarTramo({
        dia: numeroDia,
        origen: ultimaParada,
        destino: fin,
        desde: horaRegreso,
        hasta: dia.hora_cierre ?? '22:00',
        horarios,
        conflictos,
        tramos,
        etiqueta: 'regreso',
      });
    }

    const conflictosDia = conflictos.filter(conflicto => conflicto.dia === numeroDia);
    return {
      ...dia,
      eventos,
      validado: conflictosDia.length === 0,
      ...(conflictosDia.length ? { conflictos: conflictosDia.map(conflicto => conflicto.tipo) } : {}),
    };
  });

  return {
    plan: { ...plan, dias },
    validado: conflictos.length === 0,
    tramos,
    conflictos,
  };
}

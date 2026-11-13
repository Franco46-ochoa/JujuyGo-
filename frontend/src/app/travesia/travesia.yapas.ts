import { Lugar } from '../catalogo.types';
import { margenDeLugar, paradaSlugDeLugar } from './travesia.model';
import {
  ContextoTravesia,
  HorarioTravesia,
  TipoYapa,
  YapaTravesia,
} from './travesia.types';

function servicioEntre(
  horarios: HorarioTravesia[],
  origen: string,
  destino: string,
  despuesDe: number,
): { hora: string; confianza: string; fuente: string } | null {
  const servicios = horarios.flatMap(horario => {
    const partida = horario.paradas.find(parada => parada.slug === origen);
    const llegada = horario.paradas.find(parada => parada.slug === destino);
    if (!partida || !llegada) return [];
    const vaAlNorte = partida.orden_en_linea < llegada.orden_en_linea;
    if (Math.abs(partida.orden_en_linea - llegada.orden_en_linea) !== 1) return [];
    if (vaAlNorte !== (horario.direccion === 'ida')) return [];
    if (vaAlNorte !== (partida.orden_en_linea < llegada.orden_en_linea)) return [];
    const [hora, minuto] = partida.hora.split(':').map(Number);
    const salida = hora * 60 + minuto;
    if (!Number.isFinite(salida) || salida < despuesDe) return [];
    return [{
      salida,
      hora: llegada.hora,
      confianza: [partida.confianza, llegada.confianza].includes('estimado') ? 'estimado' : 'publicado',
      fuente: partida.fuente === llegada.fuente ? partida.fuente : `${partida.fuente} / ${llegada.fuente}`,
    }];
  }).sort((a, b) => a.salida - b.salida);

  const servicio = servicios[0];
  return servicio ? { hora: servicio.hora, confianza: servicio.confianza, fuente: servicio.fuente } : null;
}

function formatoAltitud(altitud: number | null): string {
  return altitud === null
    ? ''
    : new Intl.NumberFormat('es-AR').format(altitud);
}

function crearYapa(
  tipo: TipoYapa,
  lugar: Lugar,
  mensaje: string,
  horaSugerida?: string,
): YapaTravesia {
  return {
    tipo,
    lugar_sugerido_slug: lugar.slug,
    mensaje,
    accion: 'agregar-al-dia',
    ...(horaSugerida ? { hora_sugerida: horaSugerida } : {}),
  };
}

function crearYapaDeZona(candidato: Lugar, ultimo: Lugar): YapaTravesia {
  const localidad = candidato.datos_json.localidad?.trim();
  const altitud = formatoAltitud(candidato.altitud_m);
  return crearYapa(
    'zona',
    candidato,
    `${candidato.nombre} también queda en ${candidato.zona}${localidad ? `, en ${localidad}` : ''}${altitud ? `, a ${altitud} msnm` : ''}; comparte zona con ${ultimo.nombre}.`,
  );
}

function sumarMinutos(hora: string, cantidad: number): string {
  const [horas, minutos] = hora.split(':').map(Number);
  const total = (horas * 60 + minutos + cantidad) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function generarYapas(
  lugaresDelDia: Lugar[],
  candidatos: Lugar[],
  contexto: ContextoTravesia | null,
  disponibleDesde = 0,
): YapaTravesia[] {
  if (!lugaresDelDia.length) return [];
  const elegidos = new Set(lugaresDelDia.map(lugar => lugar.slug));
  const ultimo = lugaresDelDia.at(-1)!;
  const paradaOrigen = paradaSlugDeLugar(ultimo);
  const horaDisponible = disponibleDesde;
  const sugerencias: Array<{ orden: number; yapa: YapaTravesia }> = [];

  for (const candidato of candidatos) {
    if (elegidos.has(candidato.slug)) continue;
    const localidadCandidata = candidato.datos_json.localidad?.trim();
    const localidadActual = ultimo.datos_json.localidad?.trim();
    const mismaLocalidad = Boolean(
      localidadCandidata
      && localidadActual
      && localidadCandidata.toLocaleLowerCase('es') === localidadActual.toLocaleLowerCase('es'),
    );
    if (mismaLocalidad) {
      const altitud = formatoAltitud(candidato.altitud_m);
      sugerencias.push({
        orden: 0,
        yapa: crearYapa(
          'localidad',
          candidato,
          `${candidato.nombre} también queda en ${candidato.datos_json.localidad}${altitud ? `, a ${altitud} msnm` : ''}.`,
        ),
      });
      continue;
    }

    const zonaCandidata = candidato.zona_slug.trim();
    const zonaActual = ultimo.zona_slug.trim();
    const mismaZona = Boolean(
      zonaCandidata
      && zonaActual
      && zonaCandidata.toLocaleLowerCase('es') === zonaActual.toLocaleLowerCase('es'),
    );
    const paradaDestino = paradaSlugDeLugar(candidato);
    if (!contexto || !paradaOrigen || !paradaDestino) {
      if (mismaZona) sugerencias.push({ orden: 1, yapa: crearYapaDeZona(candidato, ultimo) });
      continue;
    }
    const servicio = servicioEntre(contexto.horarios, paradaOrigen, paradaDestino, horaDisponible);
    if (!servicio) {
      if (mismaZona) sugerencias.push({ orden: 1, yapa: crearYapaDeZona(candidato, ultimo) });
      continue;
    }
    const paradaSalida = contexto.paradas.find(parada => parada.slug === paradaOrigen)?.nombre;
    const paradaLlegada = contexto.paradas.find(parada => parada.slug === paradaDestino)?.nombre;
    if (!paradaSalida || !paradaLlegada) continue;

    const altura = ultimo.altitud_m !== null && candidato.altitud_m !== null
      ? candidato.altitud_m - ultimo.altitud_m
      : 0;
    const tipo: TipoYapa = Math.abs(altura) >= 1000 ? 'aclimatacion' : 'rn9';
    const advertenciaAltitud = tipo === 'aclimatacion'
      ? ` El cambio de ${formatoAltitud(ultimo.altitud_m)} a ${formatoAltitud(candidato.altitud_m)} msnm es de ${formatoAltitud(Math.abs(altura))} m; sumá tiempo para aclimatarte.`
      : '';
    const detalleServicio = servicio.confianza === 'estimado'
      ? `El horario estimado de ${servicio.fuente}`
      : `El servicio RN9 de ${servicio.fuente}`;
    const accesoLocal = paradaDestino === 'purmamarca-cruce'
      ? ' El pueblo queda a 3 km del cruce por RN52 y requiere un traslado local.'
      : '';

    sugerencias.push({
      orden: tipo === 'aclimatacion' ? 2 : 1,
      yapa: crearYapa(
        tipo,
        candidato,
        `${detalleServicio} conecta ${paradaSalida} con ${paradaLlegada} a las ${servicio.hora}; podés sumar ${candidato.nombre}.${accesoLocal}${advertenciaAltitud}`,
        sumarMinutos(servicio.hora, margenDeLugar(candidato, contexto.margenes)),
      ),
    });
  }

  return sugerencias
    .sort((a, b) => a.orden - b.orden || a.yapa.lugar_sugerido_slug.localeCompare(b.yapa.lugar_sugerido_slug))
    .map(sugerencia => sugerencia.yapa);
}

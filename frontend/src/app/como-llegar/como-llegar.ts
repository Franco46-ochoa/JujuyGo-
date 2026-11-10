import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CatalogoService } from '../catalogo.service';
import { Lugar } from '../catalogo.types';
import { TransporteService } from '../transporte.service';
import {
  UrbanoColectivo,
  UrbanoDetalleLinea,
  UrbanoLinea,
  UrbanoParada,
  UrbanoRed,
} from '../urbano.types';
import { UrbanoService } from '../urbano.service';
import { YapaMapaComponent } from '../yapa-mapa/yapa-mapa.component';
import { RutaMapaPunto } from '../yapa-mapa/yapa-mapa.types';
import {
  OpcionOrigen,
  PuntoTransporte,
  RespuestaComoLlegar,
  ServicioTransporte,
  TrasladoLocal,
} from './como-llegar.types';
import { buscarCombinacionesUrbanas, type UrbanoCombinacion } from './urbano-ruteo';

interface PasoRelato {
  titulo: string;
  detalle: string;
  servicio?: ServicioTransporte;
  traslado?: TrasladoLocal;
}

const ORIGENES_BASE: OpcionOrigen[] = [
  { slug: 'terminal-jjs', nombre: 'Terminal de Ómnibus SS.Jujuy', grupo: 'terminales' },
  { slug: 'aeropuerto-jujuy', nombre: 'Aeropuerto Jujuy (Dr. Horacio Guzmán)', grupo: 'terminales' },
];

// Bbox urbano aproximado de San Salvador; evita ofrecer esta red para tramos RN9.
const BBOX_URBANO_SSJ = { minLat: -24.30, maxLat: -24.15, minLng: -65.35, maxLng: -65.20 };
const RADIO_PARADA_METROS = 600;
const RADIO_TIERRA_METROS = 6_371_000;

interface ParadaConDistancia {
  parada: UrbanoParada;
  distanciaM: number;
}

interface LineaCandidata {
  linea: UrbanoLinea;
  ascenso: ParadaConDistancia;
  descenso: ParadaConDistancia;
  direccion: string;
}

interface ParadaCercana {
  linea: UrbanoLinea;
  parada: ParadaConDistancia;
}

function distanciaMetros(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLng = radians(lng2 - lng1);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return RADIO_TIERRA_METROS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function puntoValido(
  punto: { lat: number | null; lng: number | null },
): punto is { lat: number; lng: number } {
  return typeof punto.lat === 'number' && typeof punto.lng === 'number' &&
    coordenadasValidas(punto.lat, punto.lng);
}

function coordenadasValidas(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

function dentroDelAreaUrbana(punto: { lat: number | null; lng: number | null }): boolean {
  return puntoValido(punto) &&
    punto.lat >= BBOX_URBANO_SSJ.minLat && punto.lat <= BBOX_URBANO_SSJ.maxLat &&
    punto.lng >= BBOX_URBANO_SSJ.minLng && punto.lng <= BBOX_URBANO_SSJ.maxLng;
}

function nombreLinea(linea: UrbanoLinea): string {
  return String(linea.number ?? linea.name ?? linea.id);
}

function buscarLineasCandidatas(
  red: UrbanoRed,
  origen: { lat: number; lng: number },
  destino: { lat: number; lng: number },
): LineaCandidata[] {
  return red.lines.flatMap(linea => {
    const sentidos = new Map<string, UrbanoParada[]>();
    for (const parada of linea.stops ?? []) {
      if (!coordenadasValidas(parada.lat, parada.lng)) continue;
      const sentido = parada.direction ?? '';
      sentidos.set(sentido, [...(sentidos.get(sentido) ?? []), parada]);
    }

    const candidatas: LineaCandidata[] = [];
    for (const [direccion, paradasSentido] of sentidos) {
      const ascensos = paradasSentido.map(parada => ({
        parada,
        distanciaM: distanciaMetros(origen.lat, origen.lng, parada.lat, parada.lng),
      })).filter(item => item.distanciaM <= RADIO_PARADA_METROS);
      const descensos = paradasSentido.map(parada => ({
        parada,
        distanciaM: distanciaMetros(destino.lat, destino.lng, parada.lat, parada.lng),
      })).filter(item => item.distanciaM <= RADIO_PARADA_METROS);

      for (const ascenso of ascensos) {
        for (const descenso of descensos) {
          if (ascenso.parada.id === descenso.parada.id) continue;
          if (typeof ascenso.parada.order === 'number' &&
            typeof descenso.parada.order === 'number' &&
            ascenso.parada.order >= descenso.parada.order) continue;
          candidatas.push({ linea, ascenso, descenso, direccion });
        }
      }
    }
    candidatas.sort((a, b) =>
      a.ascenso.distanciaM + a.descenso.distanciaM -
      b.ascenso.distanciaM - b.descenso.distanciaM,
    );
    return candidatas.slice(0, 1);
  }).sort((a, b) =>
    a.ascenso.distanciaM + a.descenso.distanciaM -
    b.ascenso.distanciaM - b.descenso.distanciaM,
  );
}

function paradasCercanas(
  red: UrbanoRed,
  origen: { lat: number; lng: number },
): ParadaCercana[] {
  return red.lines.flatMap(linea => (linea.stops ?? [])
    .filter(parada => coordenadasValidas(parada.lat, parada.lng))
    .map(parada => ({
      linea,
      parada: {
        parada,
        distanciaM: distanciaMetros(origen.lat, origen.lng, parada.lat, parada.lng),
      },
    })))
    .sort((a, b) => a.parada.distanciaM - b.parada.distanciaM)
    .slice(0, 3);
}

@Component({
  imports: [DatePipe, RouterLink, YapaMapaComponent],
  selector: 'app-como-llegar',
  styleUrl: './como-llegar.css',
  templateUrl: './como-llegar.html',
})
export class ComoLlegarPage {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogo = inject(CatalogoService);
  private readonly transporte = inject(TransporteService);
  private readonly urbanoService = inject(UrbanoService);
  private readonly destroyRef = inject(DestroyRef);
  private solicitudUrbana = 0;

  protected readonly lugares = signal<Lugar[]>([]);
  protected readonly paradas = signal<PuntoTransporte[]>([]);
  protected readonly origen = signal('terminal-jjs');
  protected readonly ubicacionGps = signal<{ lat: number; lng: number; precision?: number } | null>(null);
  protected readonly destino = signal('');
  protected readonly destinoFijado = signal(false);
  protected readonly guia = signal<RespuestaComoLlegar | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly errorUbicacion = signal('');
  protected readonly errorOpciones = signal('');
  protected readonly solicitandoUbicacion = signal(false);
  protected readonly redUrbana = signal<UrbanoRed | null>(null);
  protected readonly detalleUrbano = signal<UrbanoDetalleLinea | null>(null);
  protected readonly flotaUrbana = signal<UrbanoColectivo[]>([]);
  protected readonly fuenteFlota = signal('');
  protected readonly geometriaUrbanaDisponible = signal(false);

  protected readonly origenes = computed(() => {
    const slugsBase = new Set(ORIGENES_BASE.map(opcion => opcion.slug));
    const slugsParadas = new Set(
      this.paradas()
        .map(parada => parada.slug)
        .filter((slug): slug is string => Boolean(slug)),
    );
    const slugsOcupados = new Set([...slugsBase, ...slugsParadas]);
    return [
      ...ORIGENES_BASE,
      ...this.paradas()
        .filter(parada => parada.slug && !slugsBase.has(parada.slug))
        .map(parada => ({
          slug: parada.slug!,
          nombre: parada.nombre,
          grupo: 'paradas' as const,
        })),
      // Las paradas RN9 tienen precedencia: un lugar con el mismo slug
      // (ej. Abra Pampa, La Quiaca) ya está cubierto por su parada.
      ...this.lugares()
        .filter(lugar => !slugsOcupados.has(lugar.slug))
        .map(lugar => ({
          slug: lugar.slug,
          nombre: lugar.nombre,
          grupo: 'lugares' as const,
        })),
      ...(this.ubicacionGps()
        ? [{ slug: 'mi-ubicacion', nombre: 'Tu ubicación · GPS', grupo: 'ubicacion' as const }]
        : []),
    ];
  });

  protected readonly nombreDestino = computed(() => {
    const guia = this.guia();
    if (guia && !guia.mismo_punto) return guia.destino.nombre;
    return this.lugares().find(lugar => lugar.slug === this.destino())?.nombre ?? 'tu destino';
  });

  protected readonly urbano = computed(() => {
    const guia = this.guia();
    const red = this.redUrbana();
    if (!guia || guia.mismo_punto || !red ||
      !puntoValido(guia.origen) || !puntoValido(guia.destino) ||
      !dentroDelAreaUrbana(guia.origen)) return null;
    const esAccesoRn9 = !dentroDelAreaUrbana(guia.destino);
    const destinoUrbano = esAccesoRn9
      ? guia.paradaOrigen
      : guia.destino;
    if (!destinoUrbano || !puntoValido(destinoUrbano)) return null;
    // Si el origen ya es (o está a <300 m de) la parada de salida RN9,
    // no hay tramo urbano que sugerir.
    if (esAccesoRn9 &&
      distanciaMetros(guia.origen.lat, guia.origen.lng, destinoUrbano.lat, destinoUrbano.lng) < 300) {
      return null;
    }
    const candidatas = buscarLineasCandidatas(red, guia.origen, destinoUrbano);
    const combinaciones = buscarCombinacionesUrbanas(red, guia.origen, destinoUrbano);
    return {
      red,
      esAccesoRn9,
      candidatas,
      combinaciones,
      cercanas: candidatas.length === 0 && combinaciones.length === 0
        ? paradasCercanas(red, guia.origen)
        : [],
    };
  });

  protected readonly puntosMapa = computed<RutaMapaPunto[]>(() =>
    this.puntosDeMapa(),
  );

  protected readonly polylineMapa = computed<[number, number][]>(() => {
    const guia = this.guia();
    const urbano = this.urbano();
    if (urbano?.esAccesoRn9) return guia?.polyline ?? [];
    const candidata = urbano?.candidatas[0];
    if (!guia || guia.mismo_punto || !candidata) return guia?.polyline ?? [];

    const detalle = this.detalleUrbano();
    const path = detalle?.line?.id === candidata.linea.id
      ? detalle.paths?.find(item => item.direction === candidata.direccion)
      : undefined;
    const geometria = Array.isArray(path?.coordinates) ? path.coordinates : undefined;
    const puntos = geometria?.filter(([lng, lat]) => coordenadasValidas(lat, lng))
      .map(([lng, lat]) => [lat, lng] as [number, number]);
    if (puntos && puntos.length >= 2) return puntos;
    if (puntoValido(guia.origen) && puntoValido(guia.destino)) {
      return [
        [guia.origen.lat, guia.origen.lng],
        [guia.destino.lat, guia.destino.lng],
      ];
    }
    return guia.polyline;
  });

  protected readonly datosMapaUrbano = computed(() => {
    const urbano = this.urbano();
    return Boolean(urbano?.candidatas[0] && !urbano.esAccesoRn9);
  });

  private puntosDeMapa(): RutaMapaPunto[] {
    const guia = this.guia();
    const urbano = this.urbano();
    const puntosBase = (guia?.puntos ?? [])
      .filter((punto): punto is PuntoTransporte & { lat: number; lng: number } =>
        typeof punto.lat === 'number' && Number.isFinite(punto.lat) &&
        typeof punto.lng === 'number' && Number.isFinite(punto.lng),
      )
      .map(punto => ({
        nombre: punto.nombre,
        tipo: punto.tipo,
        lat: punto.lat,
        lng: punto.lng,
      }));
    if (urbano?.esAccesoRn9) return puntosBase;
    const candidata = urbano?.candidatas[0];
    if (!guia || !candidata) return puntosBase;
    return [
      ...puntosBase,
      { nombre: candidata.ascenso.parada.name, tipo: 'ascenso', lat: candidata.ascenso.parada.lat, lng: candidata.ascenso.parada.lng },
      { nombre: candidata.descenso.parada.name, tipo: 'descenso', lat: candidata.descenso.parada.lat, lng: candidata.descenso.parada.lng },
      ...this.flotaUrbana().map(colectivo => ({
        nombre: `Colectivo interno ${colectivo.number ?? colectivo.id}`,
        tipo: 'colectivo',
        lat: colectivo.lat,
        lng: colectivo.lng,
      })),
    ];
  }

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const slug = params.get('slugLugar') ?? '';
      this.destinoFijado.set(Boolean(slug));
      this.destino.set(slug);
      this.guia.set(null);
      this.limpiarUrbano();
      if (slug) this.cargarRecorrido();
    });

    forkJoin({
      lugares: this.catalogo.getLugares(),
      paradas: this.transporte.getParadasRN9(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ lugares, paradas }) => {
        this.lugares.set(lugares);
        this.paradas.set(paradas);
      },
      error: () => this.errorOpciones.set(
        'No pudimos cargar los lugares y paradas para elegir. Revisá tu conexión e intentá de nuevo.',
      ),
    });
  }

  protected seleccionarOrigen(event: Event): void {
    this.origen.set((event.target as HTMLSelectElement).value);
  }

  protected geolocalizacionDisponible(): boolean {
    return typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
  }

  protected usarMiUbicacion(): void {
    if (!this.geolocalizacionDisponible()) {
      this.errorUbicacion.set('Tu navegador no soporta la ubicación. Elegí una parada en el selector.');
      return;
    }

    this.errorUbicacion.set('');
    this.solicitandoUbicacion.set(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude: lat, longitude: lng, accuracy: precision } = position.coords;
        if (!coordenadasValidas(lat, lng)) {
          this.solicitandoUbicacion.set(false);
          this.errorUbicacion.set('No pudimos obtener una ubicación válida. Elegí una parada en el selector.');
          return;
        }
        this.ubicacionGps.set({ lat, lng, precision });
        this.origen.set('mi-ubicacion');
        this.solicitandoUbicacion.set(false);
        this.cargarRecorrido();
      },
      error => {
        this.solicitandoUbicacion.set(false);
        this.errorUbicacion.set(error.code === 1
          ? 'Necesitamos permiso de ubicación para usar tu posición. También podés elegir una parada en el selector.'
          : error.code === 3
            ? 'La ubicación tardó demasiado. Intentá nuevamente o elegí una parada en el selector.'
            : 'No pudimos determinar tu ubicación. Revisá que el servicio esté disponible o elegí una parada en el selector.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  protected seleccionarDestino(event: Event): void {
    this.destino.set((event.target as HTMLSelectElement).value);
  }

  protected cargarRecorrido(): void {
    if (!this.destino()) return;

    this.cargando.set(true);
    this.error.set('');
    this.guia.set(null);
    this.limpiarUrbano();
    const origenGps = this.origen() === 'mi-ubicacion' ? this.ubicacionGps() ?? undefined : undefined;
    this.transporte.getComoLlegar(this.origen(), this.destino(), origenGps)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: guia => {
          this.guia.set(guia);
          this.cargando.set(false);
          if (!guia.mismo_punto &&
            dentroDelAreaUrbana(guia.origen)) {
            this.cargarRedUrbana(guia);
          }
        },
        error: () => {
          this.error.set('No pudimos consultar el recorrido. Revisá tu conexión e intentá de nuevo.');
          this.cargando.set(false);
        },
      });
  }

  private limpiarUrbano(): void {
    this.solicitudUrbana++;
    this.redUrbana.set(null);
    this.detalleUrbano.set(null);
    this.flotaUrbana.set([]);
    this.fuenteFlota.set('');
    this.geometriaUrbanaDisponible.set(false);
  }

  private cargarRedUrbana(guia: Exclude<RespuestaComoLlegar, { mismo_punto: true }>): void {
    if (!puntoValido(guia.origen) || !puntoValido(guia.destino) ||
      !dentroDelAreaUrbana(guia.origen)) return;
    const origen = { lat: guia.origen.lat, lng: guia.origen.lng };
    const destinoUrbano = dentroDelAreaUrbana(guia.destino)
      ? guia.destino
      : guia.paradaOrigen;
    if (!destinoUrbano || !puntoValido(destinoUrbano)) return;
    const destino = { lat: destinoUrbano.lat, lng: destinoUrbano.lng };
    const solicitud = this.solicitudUrbana;
    forkJoin({
      red: this.urbanoService.getRed(),
      lineas: this.urbanoService.getLineas(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ red, lineas }) => {
        if (solicitud !== this.solicitudUrbana ||
          !Array.isArray(red.lines) || !Array.isArray(lineas.lines) ||
          !red.fuente || !red.actualizado_en) return;
        const metadatos = new Map(lineas.lines.map(linea => [String(linea.id), linea]));
        const redCompleta: UrbanoRed = {
          ...red,
          lines: red.lines.map(linea => ({
            ...linea,
            ...metadatos.get(String(linea.id)),
            stops: linea.stops,
          })),
        };
        this.redUrbana.set(redCompleta);
        const candidatas = buscarLineasCandidatas(redCompleta, origen, destino);
        if (candidatas.length === 0) return;
        this.cargarDetalleUrbano(candidatas[0], solicitud);
        this.cargarFlotaUrbana(candidatas.map(candidata => candidata.linea), solicitud);
      },
      error: () => {
        if (solicitud === this.solicitudUrbana) this.limpiarUrbano();
      },
    });
  }

  private cargarDetalleUrbano(candidata: LineaCandidata, solicitud: number): void {
    this.urbanoService.getLinea(candidata.linea.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: detalle => {
          if (solicitud !== this.solicitudUrbana) return;
          this.detalleUrbano.set(detalle);
          this.geometriaUrbanaDisponible.set(
            Boolean(detalle.line?.id === candidata.linea.id && detalle.paths?.some(path =>
              path.direction === candidata.direccion &&
              Array.isArray(path.coordinates) &&
              path.coordinates.filter(([lng, lat]) => coordenadasValidas(lat, lng)).length >= 2,
            )),
          );
        },
        error: () => {
          if (solicitud === this.solicitudUrbana) this.detalleUrbano.set(null);
        },
      });
  }

  private cargarFlotaUrbana(lineasCandidatas: UrbanoLinea[], solicitud: number): void {
    this.urbanoService.getFlota().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: flota => {
        if (solicitud !== this.solicitudUrbana) return;
        const lineas = new Set(lineasCandidatas.flatMap(linea =>
          [linea.id, linea.name, linea.number]
            .filter((valor): valor is string | number => valor !== undefined)
            .map(valor => String(valor).toLocaleLowerCase()),
        ));
        const colectivos = flota.stale === false && Array.isArray(flota.buses) &&
          typeof flota.fuente === 'string' && flota.fuente.length > 0
          ? flota.buses.filter(bus =>
            bus.fresh === true && Number.isFinite(bus.age) && bus.age >= 0 &&
              coordenadasValidas(bus.lat, bus.lng) &&
            lineas.has(String(bus.line).toLocaleLowerCase()),
          )
          : [];
        this.flotaUrbana.set(colectivos);
        this.fuenteFlota.set(colectivos.length > 0 ? flota.fuente : '');
      },
      error: () => {
        if (solicitud === this.solicitudUrbana) {
          this.flotaUrbana.set([]);
          this.fuenteFlota.set('');
        }
      },
    });
  }

  protected etiquetaLinea(linea: UrbanoLinea): string {
    return linea.name ?? `Línea ${nombreLinea(linea)}`;
  }

  protected distanciaParada(distanciaM: number): number {
    return Math.round(distanciaM);
  }

  protected antiguedadColectivo(antiguedadSegundos: number): string {
    const minutos = Math.floor(antiguedadSegundos / 60);
    if (minutos < 1) return 'hace menos de 1 min';
    return `hace ${minutos} min`;
  }

  protected pasosRelato(guia: RespuestaComoLlegar): PasoRelato[] {
    if (guia.mismo_punto) {
      return [{ titulo: 'Ya estás en el destino', detalle: guia.mensaje }];
    }

    const pasos: PasoRelato[] = [];
    if (guia.origen.tipo === 'punto') {
      pasos.push({
        titulo: guia.origen.nombre,
        detalle: 'Punto de partida obtenido con el GPS de tu dispositivo.',
      });
    }
    if (guia.traslado_inicial) {
      pasos.push({
        titulo: guia.traslado_inicial.titulo,
        detalle: guia.traslado_inicial.descripcion,
        traslado: guia.traslado_inicial,
      });
    }

    const servicio = guia.servicios[0];
    if (servicio) {
      const paradaSalida = guia.paradaOrigen?.nombre ?? guia.origen.nombre;
      pasos.push({
        titulo: `Tomá el colectivo en ${paradaSalida}`,
        detalle: `${servicio.linea_nombre}: salida ${servicio.hora_salida}, llegada ${servicio.hora_llegada} (${servicio.duracion_estimada}).`,
        servicio,
      });

      if (guia.paradaDestino && guia.paradaDestino.slug !== guia.destino.slug) {
        pasos.push({
          titulo: `Bajá en ${guia.paradaDestino.nombre}`,
          detalle: guia.paradaDestino.tipo === 'cruce'
            ? 'Es un cruce sobre la RN9; el colectivo no llega hasta el pueblo.'
            : `Esta es la parada de conexión para ${guia.destino.nombre}.`,
        });
      }
    } else if (guia.tiene_servicio_rn9) {
      pasos.push({
        titulo: 'No hay horarios disponibles para este tramo',
        detalle: 'La consulta no devolvió salidas para el recorrido elegido. Probá con otro origen.',
      });
    }

    if (guia.traslado_final) {
      pasos.push({
        titulo: guia.traslado_final.titulo,
        detalle: guia.traslado_final.descripcion,
        traslado: guia.traslado_final,
      });
    } else if (guia.tiene_servicio_rn9 && servicio && pasos.length > 0 &&
      !guia.paradaDestino?.slug?.includes(guia.destino.slug)) {
      pasos.push({
        titulo: `Llegá a ${guia.destino.nombre}`,
        detalle: guia.destino.localidad
          ? `Destino en ${guia.destino.localidad}.`
          : 'Destino indicado en el catálogo.',
      });
    }

    return pasos;
  }

  protected confianza(servicio: ServicioTransporte): string {
    switch (servicio.confianza) {
      case 'publicado': return 'Horario publicado';
      case 'estimado': return 'Horario estimado';
      case 'tiempo-real': return 'Tiempo real';
      default: return servicio.confianza;
    }
  }

  protected horaFuente(servicio: ServicioTransporte): string {
    return servicio.fuente;
  }

  protected etiquetaGrupo(grupo: OpcionOrigen): string {
    return {
      terminales: 'Terminales y aeropuerto',
      paradas: 'Paradas RN9',
      lugares: 'Lugares del catálogo',
      ubicacion: 'Ubicación',
    }[grupo.grupo];
  }
}

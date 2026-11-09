import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CatalogoService } from '../catalogo.service';
import { Lugar } from '../catalogo.types';
import { TransporteService } from '../transporte.service';
import { YapaMapaComponent } from '../yapa-mapa/yapa-mapa.component';
import { RutaMapaPunto } from '../yapa-mapa/yapa-mapa.types';
import {
  OpcionOrigen,
  PuntoTransporte,
  RespuestaComoLlegar,
  ServicioTransporte,
  TrasladoLocal,
} from './como-llegar.types';

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

@Component({
  imports: [RouterLink, YapaMapaComponent],
  selector: 'app-como-llegar',
  styleUrl: './como-llegar.css',
  templateUrl: './como-llegar.html',
})
export class ComoLlegarPage {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogo = inject(CatalogoService);
  private readonly transporte = inject(TransporteService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly lugares = signal<Lugar[]>([]);
  protected readonly paradas = signal<PuntoTransporte[]>([]);
  protected readonly origen = signal('terminal-jjs');
  protected readonly destino = signal('');
  protected readonly destinoFijado = signal(false);
  protected readonly guia = signal<RespuestaComoLlegar | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly errorOpciones = signal('');

  protected readonly origenes = computed(() => {
    const slugsBase = new Set(ORIGENES_BASE.map(opcion => opcion.slug));
    return [
      ...ORIGENES_BASE,
      ...this.paradas()
        .filter(parada => parada.slug && !slugsBase.has(parada.slug))
        .map(parada => ({
          slug: parada.slug!,
          nombre: parada.nombre,
          grupo: 'paradas' as const,
        })),
      ...this.lugares().map(lugar => ({
        slug: lugar.slug,
        nombre: lugar.nombre,
        grupo: 'lugares' as const,
      })),
    ];
  });

  protected readonly nombreDestino = computed(() => {
    const guia = this.guia();
    if (guia && !guia.mismo_punto) return guia.destino.nombre;
    return this.lugares().find(lugar => lugar.slug === this.destino())?.nombre ?? 'tu destino';
  });

  protected readonly puntosMapa = computed<RutaMapaPunto[]>(() =>
    (this.guia()?.puntos ?? [])
      .filter((punto): punto is PuntoTransporte & { lat: number; lng: number } =>
        typeof punto.lat === 'number' && Number.isFinite(punto.lat) &&
        typeof punto.lng === 'number' && Number.isFinite(punto.lng),
      )
      .map(punto => ({
        nombre: punto.nombre,
        tipo: punto.tipo,
        lat: punto.lat,
        lng: punto.lng,
      })),
  );

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const slug = params.get('slugLugar') ?? '';
      this.destinoFijado.set(Boolean(slug));
      this.destino.set(slug);
      this.guia.set(null);
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

  protected seleccionarDestino(event: Event): void {
    this.destino.set((event.target as HTMLSelectElement).value);
  }

  protected cargarRecorrido(): void {
    if (!this.destino()) return;

    this.cargando.set(true);
    this.error.set('');
    this.guia.set(null);
    this.transporte.getComoLlegar(this.origen(), this.destino())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: guia => {
          this.guia.set(guia);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No pudimos consultar el recorrido. Revisá tu conexión e intentá de nuevo.');
          this.cargando.set(false);
        },
      });
  }

  protected pasosRelato(guia: RespuestaComoLlegar): PasoRelato[] {
    if (guia.mismo_punto) {
      return [{ titulo: 'Ya estás en el destino', detalle: guia.mensaje }];
    }

    const pasos: PasoRelato[] = [];
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
    }[grupo.grupo];
  }
}

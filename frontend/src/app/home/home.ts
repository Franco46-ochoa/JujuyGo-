import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { CatalogoService } from '../catalogo.service';
import { Lugar, Zona } from '../catalogo.types';
import { HospedajeService } from '../hospedaje.service';
import { Guia, Hospedaje } from '../hospedaje.types';
import { TravesiaService } from '../travesia/travesia.service';
import { RespuestaProximos } from '../travesia/travesia.types';
import { YapaMapaComponent } from '../yapa-mapa/yapa-mapa.component';

@Component({
  imports: [DecimalPipe, RouterLink, YapaMapaComponent],
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.css',
  host: {
    '(window:scroll)': 'onScroll()',
    '(document:keydown.escape)': 'cerrarZona()',
  },
})
export class HomePage {
  private readonly catalogo = inject(CatalogoService);
  private readonly hospedajeService = inject(HospedajeService);
  private readonly travesiaService = inject(TravesiaService);

  protected readonly zonas = signal<Zona[]>([]);
  protected readonly lugares = signal<Lugar[]>([]);
  protected readonly hospedajes = signal<Hospedaje[]>([]);
  protected readonly guias = signal<Guia[]>([]);
  protected readonly proximos = signal<RespuestaProximos | null>(null);
  protected readonly lugarSeleccionado = signal<Lugar | null>(null);
  protected readonly zonaAbierta = signal<Zona | null>(null);
  protected readonly navFijada = signal(false);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly hospedajesLoading = signal(true);
  protected readonly hospedajesError = signal('');
  protected readonly guiasLoading = signal(true);
  protected readonly guiasError = signal('');
  protected readonly transporteLoading = signal(true);
  protected readonly transporteError = signal('');

  constructor() {
    this.cargarCatalogo();
    this.cargarDatosEditoriales();
  }

  protected cargarCatalogo(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    forkJoin({
      zonas: this.catalogo.getZonas(),
      lugares: this.catalogo.getLugares(),
    }).subscribe({
      next: ({ zonas, lugares }) => {
        this.zonas.set(zonas);
        this.lugares.set(lugares);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar el catálogo. Revisá tu conexión e intentá de nuevo.');
        this.loading.set(false);
      },
    });
  }

  protected cargarHospedajes(): void {
    this.hospedajesLoading.set(true);
    this.hospedajesError.set('');
    this.hospedajeService.getHospedajes('quebrada').subscribe({
      next: hospedajes => {
        this.hospedajes.set(hospedajes);
        this.hospedajesLoading.set(false);
      },
      error: () => {
        this.hospedajesError.set('No pudimos cargar los hospedajes. Revisá tu conexión e intentá de nuevo.');
        this.hospedajesLoading.set(false);
      },
    });
  }

  protected cargarGuias(): void {
    this.guiasLoading.set(true);
    this.guiasError.set('');
    this.hospedajeService.getGuias().subscribe({
      next: guias => {
        this.guias.set(guias);
        this.guiasLoading.set(false);
      },
      error: () => {
        this.guiasError.set('No pudimos consultar los registros de guías. Revisá tu conexión e intentá de nuevo.');
        this.guiasLoading.set(false);
      },
    });
  }

  protected cargarTransporte(): void {
    this.transporteLoading.set(true);
    this.transporteError.set('');
    this.travesiaService.getProximos('terminal-jjs', 'tilcara', this.horaActualJujuy()).subscribe({
      next: proximos => {
        this.proximos.set(proximos);
        this.transporteLoading.set(false);
      },
      error: () => {
        this.transporteError.set('No pudimos cargar los próximos servicios publicados. Revisá tu conexión e intentá de nuevo.');
        this.transporteLoading.set(false);
      },
    });
  }

  protected etiquetaHospedaje(tipo: Hospedaje['tipo']): string {
    return {
      hotel: 'Hotel',
      hosteria: 'Hostería',
      posada: 'Posada',
      refugio: 'Refugio',
      camping: 'Camping',
    }[tipo];
  }

  protected iniciales(nombre: string): string {
    return nombre.split(/\s+/).slice(0, 2).map(parte => parte[0]).join('');
  }

  /**
   * Devuelve la URL de la foto del lugar.
   * Si `foto` es NULL, usa una imagen representativa de la zona (nunca la foto de otra zona).
   * El parámetro zona_slug es opcional: sin él, el fallback es el placeholder de Quebrada.
   */
  protected fotoUrl(foto: string | null | undefined, zona_slug?: string): string {
    if (foto) return `/img/${foto}`;
    return `/img/${this.fallbackFotoZona(zona_slug)}`;
  }

  private fallbackFotoZona(zona_slug?: string): string {
    const mapa: Record<string, string> = {
      quebrada: 'purmamarca.jpg',
      puna: 'puna.jpg',
      yungas: 'calilegua.jpg',
      valles: 'salsaju.jpg',
    };
    return mapa[zona_slug ?? ''] ?? 'purmamarca.jpg';
  }

  /**
   * Sincronización Mapa -> Lista: al cliquear un pin o seleccionarlo en el mapa
   */
  protected onLugarSelectedDelMapa(lugar: Lugar): void {
    this.lugarSeleccionado.set(lugar);

    if (typeof document !== 'undefined') {
      const el = document.getElementById(`lugar-item-${lugar.slug}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  /**
   * Sincronización Lista -> Mapa: al pasar el cursor sobre un ítem de la lista
   */
  protected onHoverLugar(lugar: Lugar | null): void {
    this.lugarSeleccionado.set(lugar);
  }

  /**
   * Sincronización Lista -> Mapa: al cliquear un ítem de la lista
   */
  protected onClickLugarItem(lugar: Lugar): void {
    this.lugarSeleccionado.set(lugar);
  }

  /**
   * La píldora de navegación acompaña el scroll: cambia de estilo hero
   * (blanco sobre foto) a estilo papel (blur + tinta) al bajar.
   */
  protected onScroll(): void {
    const y = typeof window === 'undefined' ? 0 : window.scrollY;
    const fijada = y > 24;
    if (fijada !== this.navFijada()) this.navFijada.set(fijada);
  }

  /**
   * Abre el panel de zona en la misma página (sobre-ventana editorial).
   */
  protected abrirZona(zona: Zona): void {
    this.zonaAbierta.set(zona);
  }

  protected cerrarZona(): void {
    this.zonaAbierta.set(null);
  }

  protected lugaresDeZona(zona: Zona | null): Lugar[] {
    if (!zona) return [];
    return this.lugares().filter(lugar => lugar.zona_slug === zona.slug);
  }

  private cargarDatosEditoriales(): void {
    this.cargarHospedajes();
    this.cargarGuias();
    this.cargarTransporte();
  }

  private horaActualJujuy(): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Argentina/Jujuy',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date());
  }
}

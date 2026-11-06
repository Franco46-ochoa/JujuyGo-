import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';
import { Lugar } from '../catalogo.types';
import { computeClusters } from './yapa-mapa.clustering';
import { MapCluster } from './yapa-mapa.types';

@Component({
  selector: 'yapa-mapa',
  standalone: true,
  templateUrl: './yapa-mapa.component.html',
  styleUrl: './yapa-mapa.component.css',
})
export class YapaMapaComponent implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly mapCanvas = viewChild<ElementRef<HTMLDivElement>>('mapCanvas');

  // Inputs
  readonly lugares = input<Lugar[]>([]);
  readonly centro = input<[number, number] | null>(null);
  readonly zoom = input<number>(8);
  readonly lugarSeleccionado = input<Lugar | null>(null);
  readonly altura = input<string>('500px');
  readonly modoMini = input<boolean>(false);
  readonly interactive = input<boolean>(true);

  // Outputs
  readonly lugarSelected = output<Lugar>();

  // Estado interno
  readonly clustersActivos = signal<MapCluster[]>([]);
  readonly currentZoom = signal<number>(8);

  private map?: L.Map;
  private markersLayer?: L.LayerGroup;
  private markersMap = new Map<string, L.Marker>();
  private isBrowser = false;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Reaccionar ante cambios en lugares, zoom inicial o centro
    effect(() => {
      const places = this.lugares();
      const z = this.currentZoom();
      this.clustersActivos.set(computeClusters(places, z));
      this.renderMarkers();
    });

    // Reaccionar cuando cambia el lugar seleccionado desde la lista externa
    effect(() => {
      const selected = this.lugarSeleccionado();
      if (!selected || !this.map) return;

      this.focusLugar(selected);
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      this.clustersActivos.set(computeClusters(this.lugares(), this.zoom()));
      return;
    }

    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  /**
   * Inicializa la instancia del mapa Leaflet con tiles CARTO Positron
   * (con estilo tinteado hacia la paleta Yapa en CSS)
   */
  private initMap(): void {
    const canvas = this.mapCanvas()?.nativeElement;
    if (!canvas) return;

    try {
      const defaultCenter: [number, number] = this.centro() ?? [-23.6, -65.4];
      const initialZoom = this.zoom() ?? (this.modoMini() ? 12 : 8);
      this.currentZoom.set(initialZoom);

      this.map = L.map(canvas, {
        center: defaultCenter,
        zoom: initialZoom,
        minZoom: 6,
        maxZoom: 18,
        scrollWheelZoom: false, // Evita capturar el scroll de la página en móvil/desktop
        dragging: this.interactive(),
        touchZoom: this.interactive(),
        zoomControl: !this.modoMini(),
      });

      // Tiles raster de OpenStreetMap (CARTO Positron pasó a requerir API key);
      // el tinte hacia la paleta Yapa se aplica con filtro CSS sobre .leaflet-tile-pane
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(this.map);

      this.markersLayer = L.layerGroup().addTo(this.map);

      this.map.on('zoomend', () => {
        if (!this.map) return;
        const newZoom = this.map.getZoom();
        this.currentZoom.set(newZoom);
        this.clustersActivos.set(computeClusters(this.lugares(), newZoom));
        this.renderMarkers();
      });

      this.clustersActivos.set(computeClusters(this.lugares(), initialZoom));
      this.renderMarkers();

      // Si hay un centro o lugar seleccionado inicial, enfocarlo
      const selected = this.lugarSeleccionado();
      if (selected) {
        this.focusLugar(selected);
      } else if (!this.centro() && this.lugares().length > 1 && !this.modoMini()) {
        this.fitLugaresBounds();
      }
    } catch {
      // Fallback seguro en entornos sin soporte gráfico completo (ej. jsdom)
      this.clustersActivos.set(computeClusters(this.lugares(), this.zoom()));
    }
  }

  /**
   * Dibuja los pins y clusters en el mapa con iconos artesanales estilo Yapa
   */
  private renderMarkers(): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    this.markersMap.clear();

    const clusters = this.clustersActivos();
    const selectedSlug = this.lugarSeleccionado()?.slug;

    for (const cluster of clusters) {
      if (cluster.isCluster) {
        // Marcador tipo Cluster (patrón AllTrails/Airbnb: "Tilcara · 2")
        const clusterIcon = L.divIcon({
          className: 'yapa-div-icon',
          html: `
            <div class="yapa-cluster-pin" role="button" tabindex="0" title="${cluster.nombre}">
              <span class="yapa-cluster-dot"></span>
              <span class="yapa-cluster-label">${cluster.nombre}</span>
            </div>
          `,
          iconSize: [124, 44],
          iconAnchor: [62, 22],
        });

        const marker = L.marker([cluster.lat, cluster.lng], {
          icon: clusterIcon,
          keyboard: true,
          title: cluster.nombre,
        });

        marker.on('click', () => {
          this.onClusterClick(cluster);
        });

        marker.addTo(this.markersLayer);
      } else {
        // Marcador individual de atractivo
        const lugar = cluster.lugares[0];
        const isSelected = selectedSlug === lugar.slug;

        const pinIcon = L.divIcon({
          className: 'yapa-div-icon',
          html: `
            <div class="yapa-marker-pin ${isSelected ? 'yapa-pin-active' : ''}" role="button" tabindex="0" title="${lugar.nombre}">
              <span class="yapa-pin-dot"></span>
              <span class="yapa-pin-label">${lugar.nombre}</span>
            </div>
          `,
          iconSize: [128, 44],
          iconAnchor: [64, 22],
        });

        const marker = L.marker([lugar.lat, lugar.lng], {
          icon: pinIcon,
          keyboard: true,
          title: lugar.nombre,
        });

        // Popup con datos de catálogo (nombre, zona, altitud, descripción, link a detalle)
        const altitudHtml = lugar.altitud_m
          ? `<span class="yapa-popup-alt">${lugar.altitud_m} msnm</span>`
          : '';
        const popupContent = `
          <div class="yapa-popup-content">
            <span class="yapa-popup-kicker">${lugar.zona} · ${lugar.datos_json?.localidad || 'Jujuy'}</span>
            <h3 class="yapa-popup-title">${lugar.nombre}</h3>
            ${altitudHtml}
            <p class="yapa-popup-desc">${lugar.descripcion}</p>
            <a class="yapa-popup-link" href="/lugares/${lugar.slug}">Ver detalle →</a>
          </div>
        `;

        marker.bindPopup(popupContent, {
          closeButton: true,
          offset: [0, -12],
          className: 'yapa-custom-popup',
        });

        marker.on('click', () => {
          this.seleccionarLugar(lugar);
        });

        marker.addTo(this.markersLayer);
        this.markersMap.set(lugar.slug, marker);

        if (isSelected) {
          marker.openPopup();
        }
      }
    }
  }

  /**
   * Al hacer clic en un cluster, hace zoom suave hacia el grupo para disgregarlo
   */
  onClusterClick(cluster: MapCluster): void {
    if (!this.map) return;

    if (cluster.lugares.length === 1) {
      this.seleccionarLugar(cluster.lugares[0]);
      return;
    }

    try {
      const bounds = L.latLngBounds(
        cluster.lugares.map(l => [l.lat, l.lng] as [number, number]),
      );
      this.map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: Math.max(this.currentZoom() + 3, 13),
      });
    } catch {
      // Si fitBounds falla o las coordenadas son idénticas, zoom centrado
      this.map.setView([cluster.lat, cluster.lng], Math.min(this.currentZoom() + 3, 14));
    }
  }

  /**
   * Emite el evento de selección y notifica a los observadores
   */
  seleccionarLugar(lugar: Lugar): void {
    this.lugarSelected.emit(lugar);
    this.focusLugar(lugar);
  }

  /**
   * Centra el mapa en el lugar indicado y abre su popup correspondiente
   */
  private focusLugar(lugar: Lugar): void {
    if (!this.map) return;

    const marker = this.markersMap.get(lugar.slug);
    if (marker) {
      this.map.panTo([lugar.lat, lugar.lng]);
      marker.openPopup();
    } else {
      // El lugar podría estar dentro de un cluster; hacer zoom hacia él para revelarlo
      this.map.setView([lugar.lat, lugar.lng], Math.max(this.currentZoom(), 13));
    }
  }

  /**
   * Ajusta los límites del mapa para abarcar todos los lugares cargados
   */
  private fitLugaresBounds(): void {
    if (!this.map || this.lugares().length < 2) return;

    try {
      const size = this.map.getSize();
      if (!size || size.x <= 0 || size.y <= 0) return;

      const bounds = L.latLngBounds(
        this.lugares().map(l => [l.lat, l.lng] as [number, number]),
      );
      this.map.fitBounds(bounds, { padding: [40, 40] });
    } catch {
      // Continuar con centro predeterminado si falla el cálculo
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { CatalogoService } from '../catalogo.service';
import { Lugar, Zona } from '../catalogo.types';
import { YapaMapaComponent } from '../yapa-mapa/yapa-mapa.component';

@Component({
  imports: [DecimalPipe, RouterLink, YapaMapaComponent],
  selector: 'app-home',
  templateUrl: './home.html',
})
export class HomePage {
  private readonly catalogo = inject(CatalogoService);

  protected readonly zonas = signal<Zona[]>([]);
  protected readonly lugares = signal<Lugar[]>([]);
  protected readonly lugarSeleccionado = signal<Lugar | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  constructor() {
    this.cargarCatalogo();
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

  protected fotoUrl(foto: string | null | undefined): string {
    return foto ? `/img/${foto}` : '/img/purmamarca.jpg';
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
}

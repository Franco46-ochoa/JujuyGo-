import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { CatalogoService } from '../catalogo.service';
import { Lugar, Zona } from '../catalogo.types';

@Component({
  imports: [DecimalPipe, RouterLink],
  selector: 'app-home',
  templateUrl: './home.html',
})
export class HomePage {
  private readonly catalogo = inject(CatalogoService);

  protected readonly zonas = signal<Zona[]>([]);
  protected readonly lugares = signal<Lugar[]>([]);
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
}

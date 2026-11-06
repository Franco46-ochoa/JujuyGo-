import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { CatalogoService } from '../catalogo.service';
import { Lugar } from '../catalogo.types';

@Component({
  imports: [DecimalPipe, RouterLink],
  selector: 'app-lugar-detalle',
  styleUrl: './lugar-detalle.css',
  templateUrl: './lugar-detalle.html',
})
export class LugarDetallePage {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogo = inject(CatalogoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly lugar = signal<Lugar | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  private readonly slug = signal('');

  constructor() {
    this.route.paramMap.pipe(
      map(params => params.get('slug') ?? ''),
      switchMap(slug => {
        this.slug.set(slug);
        return this.cargar(slug);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(lugar => {
      this.lugar.set(lugar);
      this.loading.set(false);
    });
  }

  protected reintentar(): void {
    this.cargar(this.slug()).subscribe(lugar => {
      this.lugar.set(lugar);
      this.loading.set(false);
    });
  }

  protected fotoUrl(foto: string | null): string {
    return foto ? `/img/${foto}` : '/img/purmamarca.jpg';
  }

  private cargar(slug: string): Observable<Lugar | null> {
    this.loading.set(true);
    this.errorMessage.set('');
    if (!slug) {
      this.errorMessage.set('No encontramos este lugar.');
      return of(null);
    }

    return this.catalogo.getLugar(slug).pipe(
      catchError((error: HttpErrorResponse) => {
        this.errorMessage.set(error.status === 404
          ? 'No encontramos este lugar en el catálogo.'
          : 'No pudimos cargar el lugar. Revisá tu conexión e intentá de nuevo.');
        return of(null);
      }),
    );
  }
}

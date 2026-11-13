import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Lugar, Zona } from './catalogo.types';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getZonas(): Observable<Zona[]> {
    return this.http.get<Zona[]>(`${this.apiUrl}/zonas`);
  }

  getLugares(zona?: string): Observable<Lugar[]> {
    const url = zona
      ? `${this.apiUrl}/lugares?zona=${encodeURIComponent(zona)}`
      : `${this.apiUrl}/lugares`;
    return this.http.get<Lugar[]>(url);
  }

  getLugar(slug: string): Observable<Lugar> {
    return this.http.get<Lugar>(`${this.apiUrl}/lugares/${encodeURIComponent(slug)}`);
  }
}

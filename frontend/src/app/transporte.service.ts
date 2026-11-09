import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { RespuestaComoLlegar, PuntoTransporte } from './como-llegar/como-llegar.types';

@Injectable({ providedIn: 'root' })
export class TransporteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getParadasRN9(): Observable<PuntoTransporte[]> {
    return this.http.get<PuntoTransporte[]>(`${this.apiUrl}/transporte/paradas`);
  }

  getComoLlegar(origen: string, destino: string): Observable<RespuestaComoLlegar> {
    const params = new HttpParams().set('origen', origen).set('destino', destino);
    return this.http.get<RespuestaComoLlegar>(`${this.apiUrl}/transporte/como-llegar`, { params });
  }
}

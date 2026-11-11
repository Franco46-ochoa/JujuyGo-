import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PlanTravesia,
  ContextoTravesia,
  RespuestaProximos,
  ResultadoValidacion,
} from './travesia.types';

@Injectable({ providedIn: 'root' })
export class TravesiaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  validar(plan: PlanTravesia): Observable<ResultadoValidacion> {
    return this.http.post<ResultadoValidacion>(`${this.apiUrl}/travesia/validar`, plan);
  }

  getContexto(): Observable<ContextoTravesia> {
    return this.http.get<ContextoTravesia>(`${this.apiUrl}/travesia/contexto`);
  }

  getProximos(origen: string, destino: string, hora: string): Observable<RespuestaProximos> {
    const params = new HttpParams()
      .set('origen', origen)
      .set('destino', destino)
      .set('hora', hora);
    return this.http.get<RespuestaProximos>(`${this.apiUrl}/transporte/proximos`, { params });
  }

  redactarYapas(yapas: { tipo: string; lugar: string; mensaje: string; contexto?: string }[]): Observable<{ mensajes: { mensaje: string; fuente: string }[] }> {
    return this.http.post<{ mensajes: { mensaje: string; fuente: string }[] }>(`${this.apiUrl}/yapa/redactar`, { yapas });
  }
}

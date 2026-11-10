import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../environments/environment';
import {
  UrbanoDetalleLinea,
  UrbanoFlota,
  UrbanoLineas,
  UrbanoParadasCercanas,
  UrbanoRed,
} from './urbano.types';

@Injectable({ providedIn: 'root' })
export class UrbanoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private redRequest?: Observable<UrbanoRed>;

  getLineas(): Observable<UrbanoLineas> {
    return this.http.get<UrbanoLineas>(`${this.apiUrl}/urbano/lineas`);
  }

  getRed(): Observable<UrbanoRed> {
    this.redRequest ??= this.http.get<UrbanoRed>(`${this.apiUrl}/urbano/red`).pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.redRequest;
  }

  getLinea(id: string): Observable<UrbanoDetalleLinea> {
    return this.http.get<UrbanoDetalleLinea>(
      `${this.apiUrl}/urbano/linea/${encodeURIComponent(id)}`,
    );
  }

  getFlota(): Observable<UrbanoFlota> {
    return this.http.get<UrbanoFlota>(`${this.apiUrl}/urbano/flota`);
  }

  getParadasCercanas(lat: number, lng: number, radioM = 600): Observable<UrbanoParadasCercanas> {
    const params = new HttpParams()
      .set('lat', lat)
      .set('lng', lng)
      .set('radio_m', radioM);
    return this.http.get<UrbanoParadasCercanas>(
      `${this.apiUrl}/urbano/paradas-cercanas`,
      { params },
    );
  }
}

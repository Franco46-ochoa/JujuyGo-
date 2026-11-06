import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Guia, Hospedaje } from './hospedaje.types';

@Injectable({ providedIn: 'root' })
export class HospedajeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getHospedajes(zona?: string): Observable<Hospedaje[]> {
    const params = zona ? new HttpParams().set('zona', zona) : undefined;
    return this.http.get<Hospedaje[]>(`${this.apiUrl}/hospedajes`, { params });
  }

  getGuias(): Observable<Guia[]> {
    return this.http.get<Guia[]>(`${this.apiUrl}/guias`);
  }
}

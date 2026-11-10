import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../environments/environment';
import { UrbanoService } from './urbano.service';
import { UrbanoRed } from './urbano.types';

describe('UrbanoService', () => {
  let service: UrbanoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UrbanoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reuse la respuesta de /red durante la sesión de página', () => {
    let first: UrbanoRed | undefined;
    let second: UrbanoRed | undefined;
    service.getRed().subscribe(red => first = red);
    service.getRed().subscribe(red => second = red);

    const request = http.expectOne(`${environment.apiUrl}/urbano/red`);
    expect(request.request.method).toBe('GET');
    const response: UrbanoRed = {
      lines: [],
      fuente: 'colejuy.vercel.app',
      actualizado_en: '2026-11-10T00:00:00.000Z',
    };
    request.flush(response);

    expect(first).toEqual(response);
    expect(second).toBe(first);
  });
});

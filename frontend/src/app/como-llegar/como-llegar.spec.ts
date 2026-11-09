import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { CatalogoService } from '../catalogo.service';
import { Lugar } from '../catalogo.types';
import { TransporteService } from '../transporte.service';
import { ComoLlegarPage } from './como-llegar';
import { RespuestaComoLlegar } from './como-llegar.types';

const lugar: Lugar = {
  id: 1,
  nombre: 'Cerro de los Siete Colores',
  slug: 'cerro-siete-colores',
  lat: -23.7448,
  lng: -65.4995,
  altitud_m: 2324,
  descripcion: 'Formaciones de distintos tonos rodean Purmamarca.',
  como_llegar: 'Hay servicios regulares hasta Purmamarca.',
  mejor_epoca: 'Todo el año.',
  foto: 'purmamarca.jpg',
  zona: 'Quebrada',
  zona_slug: 'quebrada',
  datos_json: { localidad: 'Purmamarca' },
};

const respuesta: RespuestaComoLlegar = {
  origen: {
    slug: 'terminal-jjs',
    nombre: 'Terminal de Ómnibus SS.Jujuy',
    tipo: 'terminal',
    lat: -24.2128,
    lng: -65.2891,
  },
  destino: {
    slug: lugar.slug,
    nombre: lugar.nombre,
    tipo: 'lugar',
    lat: lugar.lat,
    lng: lugar.lng,
    localidad: 'Purmamarca',
  },
  paradaOrigen: {
    id: 1,
    linea_id: 'rn9',
    nombre: 'Terminal Jujuy',
    slug: 'terminal-jjs',
    orden_en_linea: 1,
    lat: -24.2128,
    lng: -65.2891,
    tipo: 'terminal',
  },
  paradaDestino: {
    id: 2,
    linea_id: 'rn9',
    nombre: 'Purmamarca Cruce',
    slug: 'purmamarca-cruce',
    orden_en_linea: 2,
    lat: -23.741,
    lng: -65.497,
    tipo: 'cruce',
  },
  direccion: 'ida',
  tiene_servicio_rn9: true,
  motivo_sin_servicio: null,
  alternativa_honesta: null,
  traslado_inicial: null,
  traslado_final: {
    titulo: 'Del cruce al pueblo',
    tipo: 'cruce-a-pueblo',
    distancia_km: 3,
    duracion_estimada: '5-10 min en vehículo / 35-40 min a pie',
    descripcion: 'Purmamarca Cruce queda sobre la RN9, a 3 km del pueblo.',
  },
  servicios: [{
    servicio_id: 'servicio-1',
    linea_id: 'rn9',
    linea_nombre: 'RN9',
    hora_salida: '07:20',
    hora_llegada: '09:10',
    hora_estimada_llegada: '09:10',
    duracion_minutos: 110,
    duracion_estimada: '1h 50m',
    duracion_aproximada: '1h 50m',
    confianza: 'publicado',
    fuente: 'horario oficial',
  }],
  paradas_tramo: [],
  polyline: [[-24.2128, -65.2891], [-23.741, -65.497], [-23.7448, -65.4995]],
  puntos: [
    { nombre: 'Terminal Jujuy', tipo: 'origen', lat: -24.2128, lng: -65.2891 },
    { nombre: 'Purmamarca Cruce', tipo: 'cruce', lat: -23.741, lng: -65.497 },
    { nombre: lugar.nombre, tipo: 'destino', lat: lugar.lat, lng: lugar.lng },
  ],
};

describe('ComoLlegarPage', () => {
  let fixture: ComponentFixture<ComoLlegarPage>;
  let respuestaActual: RespuestaComoLlegar;

  beforeEach(async () => {
    respuestaActual = respuesta;
    await TestBed.configureTestingModule({
      imports: [ComoLlegarPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slugLugar: lugar.slug })) },
        },
        {
          provide: CatalogoService,
          useValue: { getLugares: () => of([lugar]) },
        },
        {
          provide: TransporteService,
          useValue: {
            getParadasRN9: () => of([]),
            getComoLlegar: vi.fn(() => of(respuestaActual)),
          },
        },
      ],
    }).compileComponents();
  });

  it('renderiza el relato con el horario, la fuente y el traslado desde el cruce', () => {
    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain(lugar.nombre);
    expect(texto).toContain('Tomá el colectivo en Terminal Jujuy');
    expect(texto).toContain('07:20');
    expect(texto).toContain('Horario publicado');
    expect(texto).toContain('Fuente: horario oficial');
    expect(texto).toContain('Purmamarca Cruce');
    expect(texto).toContain('3 km');
    expect(fixture.nativeElement.querySelector('yapa-mapa')).toBeTruthy();
  });

  it('explica el destino sin servicio directo y conserva la alternativa de la API', () => {
    respuestaActual = {
      ...respuesta,
      tiene_servicio_rn9: false,
      motivo_sin_servicio: 'El destino queda fuera del corredor RN9.',
      alternativa_honesta: 'Desde Abra Pampa, contratá un remise local.',
      traslado_final: null,
      servicios: [],
    };

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();
    const aviso = fixture.nativeElement.querySelector('.aviso-sin-servicio') as HTMLElement;

    expect(aviso.textContent).toContain('El destino queda fuera del corredor RN9.');
    expect(aviso.textContent).toContain('Desde Abra Pampa, contratá un remise local.');
  });
});

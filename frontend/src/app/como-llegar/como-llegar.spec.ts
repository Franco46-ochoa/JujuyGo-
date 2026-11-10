import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { CatalogoService } from '../catalogo.service';
import { Lugar } from '../catalogo.types';
import { TransporteService } from '../transporte.service';
import { UrbanoService } from '../urbano.service';
import { UrbanoDetalleLinea, UrbanoFlota, UrbanoRed } from '../urbano.types';
import { YapaMapaComponent } from '../yapa-mapa/yapa-mapa.component';
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

const respuestaUrbana: RespuestaComoLlegar = {
  ...respuesta,
  destino: { ...respuesta.destino, lat: -24.19, lng: -65.27 },
  polyline: [[-24.2128, -65.2891], [-24.19, -65.27]],
  puntos: [
    { nombre: 'Terminal Jujuy', tipo: 'origen', lat: -24.2128, lng: -65.2891 },
    { nombre: 'Destino urbano', tipo: 'destino', lat: -24.19, lng: -65.27 },
  ],
};

const redVacia: UrbanoRed = {
  lines: [],
  fuente: 'colejuy.vercel.app',
  actualizado_en: '2026-11-10T00:00:00.000Z',
};

const redConLinea: UrbanoRed = {
  ...redVacia,
  lines: [{
    id: '36',
    name: 'Línea 36',
    number: '36',
    company: 'Empresa local',
    stops: [
      { id: 'subida', name: 'Parada de origen', lat: -24.2128, lng: -65.2891, direction: 'ida', order: 1 },
      { id: 'bajada', name: 'Parada de destino', lat: -24.19, lng: -65.27, direction: 'ida', order: 2 },
    ],
  }],
};

const redSinMetadatos: UrbanoRed = {
  ...redVacia,
  lines: [{
    id: '36',
    stops: [
      { ...redConLinea.lines[0].stops![0], lng: -65.2865 },
      { ...redConLinea.lines[0].stops![1], lat: -24.193 },
    ],
  }],
};

const detalleLinea: UrbanoDetalleLinea = {
  line: { id: '36', name: 'Línea 36' },
  paths: [{ direction: 'ida', coordinates: [[-65.2891, -24.2128], [-65.27, -24.19]] }],
  fuente: 'colejuy.vercel.app',
  actualizado_en: '2026-11-10T00:00:00.000Z',
};

const flota: UrbanoFlota = {
  buses: [
    { id: 'bus-live', line: '36', number: '101', lat: -24.2, lng: -65.28, fresh: true, age: 95 },
    { id: 'bus-stale', line: '36', number: '102', lat: -24.2, lng: -65.28, fresh: false, age: 600 },
  ],
  stale: false,
  fuente: 'colejuy.vercel.app',
  actualizado_en: '2026-11-10T00:00:00.000Z',
};

describe('ComoLlegarPage', () => {
  let fixture: ComponentFixture<ComoLlegarPage>;
  let respuestaActual: RespuestaComoLlegar;
  let urbanoApi: {
    getRed: ReturnType<typeof vi.fn>;
    getLineas: ReturnType<typeof vi.fn>;
    getLinea: ReturnType<typeof vi.fn>;
    getFlota: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    respuestaActual = respuesta;
    urbanoApi = {
      getRed: vi.fn(() => of(redVacia)),
      getLineas: vi.fn(() => of({ ...redVacia, lines: [] })),
      getLinea: vi.fn(() => of(detalleLinea)),
      getFlota: vi.fn(() => of(flota)),
    };
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
        { provide: UrbanoService, useValue: urbanoApi },
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

  it('encuentra una línea con paradas cercanas, muestra la flota fresca y su fuente', () => {
    respuestaActual = respuestaUrbana;
    urbanoApi.getRed.mockReturnValue(of(redSinMetadatos));
    urbanoApi.getLineas.mockReturnValue(of({
      ...redVacia,
      lines: [{ id: '36', name: 'Línea 36', number: '36', company: 'Empresa local' }],
    }));

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Colectivo urbano');
    expect(texto).toContain('Línea 36');
    expect(texto).toContain('Empresa local');
    expect(texto).toContain('Parada de origen');
    expect(texto).toContain('Parada de destino');
    expect(texto).toContain('Sentido ida');
    expect(texto).toContain('Colectivos ahora');
    expect(texto).toContain('Interno 101');
    expect(texto).toContain('hace 1 min');
    expect(texto).not.toContain('Interno 102');
    expect(texto).toContain('Fuente: colejuy.vercel.app');

    const mapa = fixture.debugElement.query(By.directive(YapaMapaComponent)).componentInstance as YapaMapaComponent;
    expect(mapa.rutaPolyline()).toEqual(detalleLinea.paths[0].coordinates.map(
      ([lng, lat]) => [lat, lng],
    ));
    expect(mapa.rutaPuntos().some(punto => punto.nombre === 'Colectivo interno 101')).toBe(true);
  });

  it('avisa cuando no hay línea directa y ofrece las paradas cercanas al origen', () => {
    respuestaActual = respuestaUrbana;
    urbanoApi.getRed.mockReturnValue(of({
      ...redConLinea,
      lines: [{
        ...redConLinea.lines[0],
        stops: [redConLinea.lines[0].stops![0]],
      }],
    }));

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('No encontramos colectivo urbano directo entre estos puntos.');
    expect(texto).toContain('Paradas más cercanas al origen');
    expect(texto).toContain('Parada de origen');
    expect(fixture.nativeElement.querySelector('.urbano-linea')).toBeNull();
    expect(urbanoApi.getLinea).not.toHaveBeenCalled();
    expect(urbanoApi.getFlota).not.toHaveBeenCalled();
  });

  it('usa la línea recta entre origen y destino cuando falta la geometría urbana', () => {
    respuestaActual = respuestaUrbana;
    urbanoApi.getRed.mockReturnValue(of(redConLinea));
    urbanoApi.getLinea.mockReturnValue(of({ ...detalleLinea, paths: [] }));

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();
    const mapa = fixture.debugElement.query(By.directive(YapaMapaComponent)).componentInstance as YapaMapaComponent;

    expect(mapa.rutaPolyline()).toEqual([
      [-24.2128, -65.2891],
      [-24.19, -65.27],
    ]);
    expect(fixture.nativeElement.textContent).toContain(
      'Geometría no disponible; se muestra un tramo directo.',
    );
  });

  it('no muestra la flota si la respuesta está desactualizada o no hay buses frescos', () => {
    respuestaActual = respuestaUrbana;
    urbanoApi.getRed.mockReturnValue(of(redConLinea));
    urbanoApi.getFlota.mockReturnValue(of({ ...flota, stale: true }));

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Colectivos ahora');
    expect(fixture.nativeElement.textContent).not.toContain('Interno 101');
  });

  it('mantiene el relato RN9 y no renderiza la sección urbana si falla su API', () => {
    respuestaActual = respuestaUrbana;
    urbanoApi.getRed.mockReturnValue(throwError(() => new Error('sin conexión')));

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tomá el colectivo en Terminal Jujuy');
    expect(fixture.nativeElement.querySelector('.urbano-section')).toBeNull();
  });
});

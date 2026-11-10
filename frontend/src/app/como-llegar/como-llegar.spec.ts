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

const respuestaAccesoRn9: RespuestaComoLlegar = {
  ...respuesta,
  origen: { ...respuesta.origen, tipo: 'punto', lat: -24.2128, lng: -65.32 },
  paradaOrigen: { ...respuesta.paradaOrigen!, lat: -24.2128, lng: -65.2891 },
  polyline: [[-24.2128, -65.32], [-24.2128, -65.2891], [-23.741, -65.497], [-23.7448, -65.4995]],
  puntos: [
    { nombre: 'Tu ubicación', tipo: 'origen', lat: -24.2128, lng: -65.32 },
    { nombre: 'Terminal Jujuy', tipo: 'terminal', lat: -24.2128, lng: -65.2891 },
    { nombre: 'Purmamarca Cruce', tipo: 'cruce', lat: -23.741, lng: -65.497 },
    { nombre: lugar.nombre, tipo: 'destino', lat: lugar.lat, lng: lugar.lng },
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

const redConTransbordo: UrbanoRed = {
  ...redVacia,
  lines: [
    {
      id: 'A',
      name: 'Línea A',
      number: 'A',
      stops: [
        { id: 'A1', name: 'Parada de origen A', lat: -24.2128, lng: -65.2891, direction: 'ida', order: 1 },
        { id: 'A2', name: 'Parada de transbordo A', lat: -24.2, lng: -65.28, direction: 'ida', order: 2 },
      ],
    },
    {
      id: 'B',
      name: 'Línea B',
      number: 'B',
      stops: [
        { id: 'B1', name: 'Parada de transbordo B', lat: -24.199, lng: -65.28, direction: 'vuelta', order: 4 },
        { id: 'B2', name: 'Parada de destino B', lat: -24.19, lng: -65.27, direction: 'vuelta', order: 5 },
      ],
    },
  ],
};

const redAccesoRn9ConTransbordo: UrbanoRed = {
  ...redVacia,
  lines: [
    {
      id: 'A',
      name: 'Línea A',
      stops: [
        { id: 'A1', name: 'Parada oeste A', lat: -24.2128, lng: -65.32, direction: 'ida', order: 1 },
        { id: 'A2', name: 'Parada transbordo A', lat: -24.2128, lng: -65.305, direction: 'ida', order: 2 },
      ],
    },
    {
      id: 'B',
      name: 'Línea B',
      stops: [
        { id: 'B1', name: 'Parada transbordo B', lat: -24.2128, lng: -65.304, direction: 'vuelta', order: 3 },
        { id: 'B2', name: 'Parada Terminal B', lat: -24.2128, lng: -65.2891, direction: 'vuelta', order: 4 },
      ],
    },
  ],
};

const redAccesoRn9: UrbanoRed = {
  ...redConLinea,
  lines: [{
    ...redConLinea.lines[0],
    stops: [
      { id: 'subida', name: 'Parada de origen', lat: -24.2128, lng: -65.32, direction: 'ida', order: 1 },
      { id: 'bajada', name: 'Parada Terminal', lat: -24.2128, lng: -65.2891, direction: 'ida', order: 2 },
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
    { id: 'bus-other-line', line: '99', number: '103', lat: -24.2, lng: -65.28, fresh: true, age: 20 },
  ],
  stale: false,
  fuente: 'colejuy.vercel.app',
  actualizado_en: '2026-11-10T00:00:00.000Z',
};

describe('ComoLlegarPage', () => {
  let fixture: ComponentFixture<ComoLlegarPage>;
  let respuestaActual: RespuestaComoLlegar;
  let transporteApi: {
    getParadasRN9: ReturnType<typeof vi.fn>;
    getComoLlegar: ReturnType<typeof vi.fn>;
  };
  let urbanoApi: {
    getRed: ReturnType<typeof vi.fn>;
    getLineas: ReturnType<typeof vi.fn>;
    getLinea: ReturnType<typeof vi.fn>;
    getFlota: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    respuestaActual = respuesta;
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    transporteApi = {
      getParadasRN9: vi.fn(() => of([])),
      getComoLlegar: vi.fn(() => of(respuestaActual)),
    };
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
          useValue: transporteApi,
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
    expect(texto).not.toContain('Interno 103');
    expect(texto).toContain('Fuente: colejuy.vercel.app');

    const mapa = fixture.debugElement.query(By.directive(YapaMapaComponent)).componentInstance as YapaMapaComponent;
    expect(mapa.rutaPolyline()).toEqual(detalleLinea.paths[0].coordinates.map(
      ([lng, lat]) => [lat, lng],
    ));
    expect(mapa.rutaPuntos().some(punto => punto.nombre === 'Colectivo interno 101')).toBe(true);
  });

  it('muestra líneas urbanas hasta la parada RN9 y conserva la polilínea del viaje', () => {
    respuestaActual = respuestaAccesoRn9;
    urbanoApi.getRed.mockReturnValue(of(redAccesoRn9));

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;
    const mapa = fixture.debugElement.query(By.directive(YapaMapaComponent)).componentInstance as YapaMapaComponent;

    expect(texto).toContain('Colectivo urbano hacia la salida RN9');
    expect(texto).toContain('Línea 36');
    expect(texto).toContain('Parada de origen');
    expect(texto).toContain('Parada Terminal');
    expect(texto).toContain('m de la parada de salida RN9');
    expect(texto).toContain('Fuente: colejuy.vercel.app');
    expect(urbanoApi.getRed).toHaveBeenCalledOnce();
    expect(mapa.rutaPolyline()).toEqual(respuestaAccesoRn9.polyline);
    expect(mapa.rutaPuntos().some(punto => punto.nombre === 'Parada Terminal')).toBe(false);
    expect(texto).not.toContain('Recorrido publicado por sentido');
  });

  it('prioriza las candidatas origen-destino para un viaje intraurbano', () => {
    respuestaActual = respuestaUrbana;
    urbanoApi.getRed.mockReturnValue(of(redConLinea));

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;
    const mapa = fixture.debugElement.query(By.directive(YapaMapaComponent)).componentInstance as YapaMapaComponent;

    expect(texto).toContain('Colectivo urbano');
    expect(texto).not.toContain('salida RN9');
    expect(texto).toContain('Aprox. 0 m del destino');
    expect(mapa.rutaPolyline()).toEqual(detalleLinea.paths[0].coordinates.map(
      ([lng, lat]) => [lat, lng],
    ));
  });

  it('muestra combinaciones estimadas para un viaje intraurbano cuando no hay línea directa', () => {
    respuestaActual = respuestaUrbana;
    urbanoApi.getRed.mockReturnValue(of(redConTransbordo));

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Con transbordo');
    expect(texto).toContain('Tomá la Línea A sentido ida');
    expect(texto).toContain('Parada de transbordo A');
    expect(texto).toContain('Línea B sentido vuelta');
    expect(texto).toContain('Parada de destino B');
    expect(texto).toContain('Combinación estimada con datos de paradas publicados');
    expect(texto).toContain('los cruces pueden variar — confirmá en la parada');
    expect(texto).toContain('Fuente: colejuy.vercel.app');
    expect(fixture.nativeElement.querySelector('.urbano-sin-linea')).toBeNull();
  });

  it('muestra combinaciones para llegar a la parada de salida RN9', () => {
    respuestaActual = respuestaAccesoRn9;
    urbanoApi.getRed.mockReturnValue(of(redAccesoRn9ConTransbordo));

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;
    const mapa = fixture.debugElement.query(By.directive(YapaMapaComponent)).componentInstance as YapaMapaComponent;

    expect(texto).toContain('Colectivo urbano hacia la salida RN9');
    expect(texto).toContain('Con transbordo');
    expect(texto).toContain('Parada Terminal B');
    expect(texto).toContain('punto de salida RN9');
    expect(texto).toContain('Fuente: colejuy.vercel.app');
    expect(mapa.rutaPolyline()).toEqual(respuestaAccesoRn9.polyline);
  });

  it('muestra las candidatas directas antes que las combinaciones', () => {
    respuestaActual = respuestaUrbana;
    urbanoApi.getRed.mockReturnValue(of({
      ...redConLinea,
      lines: [...redConLinea.lines, ...redConTransbordo.lines],
    }));

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto.indexOf('Línea 36')).toBeLessThan(texto.indexOf('Con transbordo'));
  });

  it('no inventa el bloque de acceso si falta paradaOrigen', () => {
    respuestaActual = { ...respuestaAccesoRn9, paradaOrigen: null };

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.urbano-section')).toBeNull();
    expect(urbanoApi.getRed).not.toHaveBeenCalled();
  });

  it('no inventa el bloque de acceso si paradaOrigen no tiene coordenadas válidas', () => {
    respuestaActual = {
      ...respuestaAccesoRn9,
      paradaOrigen: { ...respuestaAccesoRn9.paradaOrigen!, lat: null, lng: null },
    };

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.urbano-section')).toBeNull();
    expect(urbanoApi.getRed).not.toHaveBeenCalled();
  });

  it('no carga la red urbana si el origen está fuera del área SSJ', () => {
    respuestaActual = {
      ...respuesta,
      origen: { ...respuesta.origen, lat: -24.4, lng: -65.32 },
    };

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tomá el colectivo en Terminal Jujuy');
    expect(fixture.nativeElement.querySelector('.urbano-section')).toBeNull();
    expect(urbanoApi.getRed).not.toHaveBeenCalled();
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
    expect(fixture.nativeElement.querySelector('.urbano-combinaciones')).toBeNull();
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

  it('pide geolocalización y consulta el servicio con coordenadas y precisión', () => {
    const gpsResponse: RespuestaComoLlegar = {
      ...respuestaUrbana,
      origen: {
        slug: 'mi-ubicacion',
        nombre: 'Tu ubicación',
        tipo: 'punto',
        lat: -24.212,
        lng: -65.288,
        precision_m: 18,
      },
      puntos: [
        { nombre: 'Tu ubicación', tipo: 'origen', lat: -24.212, lng: -65.288 },
        ...respuestaUrbana.puntos.slice(1),
      ],
    };
    respuestaActual = gpsResponse;
    transporteApi.getComoLlegar.mockReturnValue(of(gpsResponse));
    const getCurrentPosition = vi.fn(success => success({
      coords: { latitude: -24.212, longitude: -65.288, accuracy: 18 },
    }));
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();
    transporteApi.getComoLlegar.mockClear();
    (fixture.nativeElement.querySelector('.boton-ubicacion') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
    expect(transporteApi.getComoLlegar).toHaveBeenCalledWith('mi-ubicacion', lugar.slug, {
      lat: -24.212,
      lng: -65.288,
      precision: 18,
    });
    expect(fixture.nativeElement.textContent).toContain('Tu ubicación · GPS');
    expect((fixture.nativeElement.querySelector('#origen') as HTMLSelectElement).value).toBe('mi-ubicacion');
    expect(fixture.nativeElement.textContent).toContain('Punto de partida obtenido con el GPS');
    const mapa = fixture.debugElement.query(By.directive(YapaMapaComponent)).componentInstance as YapaMapaComponent;
    expect(mapa.rutaPuntos().some(punto => punto.nombre === 'Tu ubicación')).toBe(true);
  });

  it('muestra la denegación de ubicación sin perder la guía previa', () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) =>
          error({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }),
      },
    });

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.boton-ubicacion') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Necesitamos permiso de ubicación');
    expect(fixture.nativeElement.textContent).toContain('Tomá el colectivo en Terminal Jujuy');
    expect(fixture.nativeElement.querySelector('#origen')).toBeTruthy();
  });

  it('oculta el botón cuando el navegador no ofrece geolocalización', () => {
    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.boton-ubicacion')).toBeNull();
    expect(fixture.nativeElement.querySelector('#origen')).toBeTruthy();
  });

  it('renderiza una respuesta de punto GPS en el relato y conserva su ubicación en el mapa', () => {
    respuestaActual = {
      ...respuestaUrbana,
      origen: { slug: 'mi-ubicacion', nombre: 'Tu ubicación', tipo: 'punto', lat: -24.2128, lng: -65.2891 },
      puntos: [
        { nombre: 'Tu ubicación', tipo: 'origen', lat: -24.2128, lng: -65.2891 },
        ...respuestaUrbana.puntos.slice(1),
      ],
    };

    fixture = TestBed.createComponent(ComoLlegarPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tu ubicación');
    const mapa = fixture.debugElement.query(By.directive(YapaMapaComponent)).componentInstance as YapaMapaComponent;
    expect(mapa.rutaPuntos().some(punto => punto.nombre === 'Tu ubicación')).toBe(true);
  });
});

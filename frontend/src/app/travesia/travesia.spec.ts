import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../auth.service';
import { CatalogoService } from '../catalogo.service';
import { Lugar } from '../catalogo.types';
import { TravesiaService } from './travesia.service';
import { TravesiaPage } from './travesia';
import { PlanTravesia } from './travesia.types';
import { TravesiaGuardada, TravesiasGuardadasService } from './travesias-guardadas.service';

const lugares: Lugar[] = [
  {
    id: 1, nombre: 'Pucará de Tilcara', slug: 'pucara', lat: 0, lng: 0,
    altitud_m: 2500, descripcion: 'Sitio arqueológico prehispánico.', como_llegar: '',
    mejor_epoca: '', foto: null, zona: 'Quebrada', zona_slug: 'quebrada',
    datos_json: { localidad: 'Tilcara' },
  },
  {
    id: 2, nombre: 'Garganta del Diablo', slug: 'garganta', lat: 0, lng: 0,
    altitud_m: 2900, descripcion: 'Cañón y sendero de montaña.', como_llegar: '',
    mejor_epoca: '', foto: null, zona: 'Quebrada', zona_slug: 'quebrada',
    datos_json: { localidad: 'Tilcara' },
  },
];

describe('TravesiaPage', () => {
  it('creates a dated plan and revalidates edits with inline conflicts', async () => {
    let validations = 0;
    const validate = vi.fn((plan: PlanTravesia) => {
      validations++;
      return of({
        plan,
        validado: validations === 1,
        tramos: validations === 1 ? [{
          dia: 1,
          evento_indice: 0,
          origen: 'terminal-jjs',
          destino: 'tilcara',
          etiqueta: 'visita',
          servicio_id: 'ida-temprano',
          hora_salida: '07:45',
          hora_llegada: '08:50',
          confianza: 'publicado',
          fuente: 'seed',
        }] : [],
        conflictos: validations === 1 ? [] : [{
          dia: 2,
          tipo: 'regreso-no-llega-a-tiempo',
          mensaje: 'No llega el regreso.',
          propuesta: 'Mové la visita a la mañana.',
        }],
      });
    });

    await TestBed.configureTestingModule({
      imports: [TravesiaPage],
      providers: [
        provideRouter([]),
        { provide: CatalogoService, useValue: { getLugares: () => of(lugares) } },
        {
          provide: TravesiaService,
          useValue: {
            validar: validate,
            getContexto: () => of({ paradas: [], horarios: [] }),
            getProximos: () => of({
              origen: { slug: 'terminal-jjs', nombre: 'Terminal' },
              destino: { slug: 'tilcara', nombre: 'Tilcara' },
              direccion: 'ida',
              servicios: [],
            }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TravesiaPage);
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('.wizard .boton-principal') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.wizard')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Elegí la fecha de llegada.');

    const fechas = fixture.nativeElement.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
    fechas[0].value = '2026-11-07';
    fechas[0].dispatchEvent(new Event('input', { bubbles: true }));
    fechas[1].value = '2026-11-08';
    fechas[1].dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button.boton-principal') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button.boton-principal') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button.boton-principal') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.boton-sugerir') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.dia')).toHaveLength(2);
    expect(validate).toHaveBeenCalledTimes(1);
    const primerTramo = fixture.nativeElement.querySelector('.dia .tramo') as HTMLElement;
    const primerEvento = fixture.nativeElement.querySelector('.dia .evento') as HTMLElement;
    expect(primerTramo.compareDocumentPosition(primerEvento) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const mover = fixture.nativeElement.querySelector('.evento select') as HTMLSelectElement;
    mover.value = '1';
    mover.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(validate).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Mové la visita a la mañana.');
  });

  it('shows at most two yapa suggestions per day, including those dismissed', async () => {
    const catalogo = [
      lugares[0],
      { ...lugares[1], id: 3, slug: 'garganta-diablo', nombre: 'Garganta del Diablo' },
      { ...lugares[1], id: 4, slug: 'pucara-tilcara', nombre: 'Pucará de Tilcara' },
      { ...lugares[1], id: 5, slug: 'mirador-tilcara', nombre: 'Mirador de Tilcara' },
    ];

    await TestBed.configureTestingModule({
      imports: [TravesiaPage],
      providers: [
        provideRouter([]),
        { provide: CatalogoService, useValue: { getLugares: () => of(catalogo) } },
        {
          provide: TravesiaService,
          useValue: {
            validar: (plan: PlanTravesia) => of({
              plan,
              validado: true,
              tramos: [],
              conflictos: [],
            }),
            getContexto: () => of({ paradas: [], horarios: [] }),
            getProximos: () => of({
              origen: { slug: 'terminal-jjs', nombre: 'Terminal' },
              destino: { slug: 'tilcara', nombre: 'Tilcara' },
              direccion: 'ida',
              servicios: [],
            }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TravesiaPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const fechas = fixture.nativeElement.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
    fechas[0].value = '2026-11-07';
    fechas[0].dispatchEvent(new Event('input', { bubbles: true }));
    fechas[1].value = '2026-11-07';
    fechas[1].dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.wizard .boton-principal') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.wizard .boton-principal') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.wizard .boton-principal') as HTMLButtonElement).click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.lugar-eleccion') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.acciones-lugares .boton-principal') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const pasar = (): void => {
      (fixture.nativeElement.querySelector('.boton-yapa-pasar') as HTMLButtonElement).click();
      fixture.detectChanges();
    };
    expect(fixture.nativeElement.querySelector('.yapa-card')).toBeTruthy();
    pasar();
    expect(fixture.nativeElement.querySelector('.yapa-card')).toBeTruthy();
    pasar();
    expect(fixture.nativeElement.querySelector('.yapa-card')).toBeNull();
  });

  it('fotoUrl returns zone-coherent fallback for NULL photos, never a photo from another zone', async () => {
    await TestBed.configureTestingModule({
      imports: [TravesiaPage],
      providers: [
        provideRouter([]),
        { provide: CatalogoService, useValue: { getLugares: () => of(lugares) } },
        {
          provide: TravesiaService,
          useValue: {
            validar: vi.fn(),
            getContexto: () => of({ paradas: [], horarios: [] }),
            getProximos: () => of({
              origen: { slug: 'terminal-jjs', nombre: 'Terminal' },
              destino: { slug: 'tilcara', nombre: 'Tilcara' },
              direccion: 'ida',
              servicios: [],
            }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TravesiaPage);
    const component = fixture.componentInstance as unknown as {
      fotoUrl: (foto: string | null, zona_slug?: string) => string;
    };
    fixture.detectChanges();

    expect(component.fotoUrl('purmamarca.jpg', 'quebrada')).toBe('/img/purmamarca.jpg');
    expect(component.fotoUrl(null, 'quebrada')).toBe('/img/purmamarca.jpg');

    const puna = component.fotoUrl(null, 'puna');
    expect(puna).toBe('/img/puna.jpg');
    expect(puna).not.toBe('/img/purmamarca.jpg');

    const yungas = component.fotoUrl(null, 'yungas');
    expect(yungas).toBe('/img/calilegua.jpg');
    expect(yungas).not.toBe('/img/purmamarca.jpg');

    const valles = component.fotoUrl(null, 'valles');
    expect(valles).toBe('/img/salsaju.jpg');
    expect(valles).not.toBe('/img/purmamarca.jpg');
  });

  it('disables the Google login and save actions when Supabase is not configured', async () => {
    const auth = {
      configurado: false,
      inicializado: signal(true),
      sesion: signal(null),
      error: signal(''),
      entrarConGoogle: vi.fn(),
      salir: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TravesiaPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: CatalogoService, useValue: { getLugares: () => of(lugares) } },
        {
          provide: TravesiaService,
          useValue: {
            validar: (plan: PlanTravesia) => of({ plan, validado: true, tramos: [], conflictos: [] }),
            getContexto: () => of({ paradas: [], horarios: [] }),
            getProximos: () => of({ origen: {}, destino: {}, direccion: 'ida', servicios: [] }),
          },
        },
        { provide: TravesiasGuardadasService, useValue: { listar: vi.fn(), guardar: vi.fn(), borrar: vi.fn() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TravesiaPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const login = fixture.nativeElement.querySelector('.auth-entrar') as HTMLButtonElement;
    expect(login.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('login no configurado');

    const fechas = fixture.nativeElement.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
    fechas[0].value = '2026-11-07';
    fechas[0].dispatchEvent(new Event('input', { bubbles: true }));
    fechas[1].value = '2026-11-07';
    fechas[1].dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    for (let paso = 0; paso < 3; paso++) {
      (fixture.nativeElement.querySelector('.wizard-actions .boton-principal') as HTMLButtonElement).click();
      fixture.detectChanges();
    }
    (fixture.nativeElement.querySelector('.boton-sugerir') as HTMLButtonElement).click();
    fixture.detectChanges();

    const guardar = fixture.nativeElement.querySelector('.guardar-travesia button') as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);
    expect(guardar.textContent).toContain('login no configurado');
  });

  it('loads, saves, and deletes the signed-in traveler’s saved plans', async () => {
    const planGuardado: PlanTravesia = {
      llegada: 'terminal',
      intereses: ['paisaje'],
      dias: [{
        fecha: '2026-11-12',
        origen: 'terminal-jjs',
        cierre: 'terminal-jjs',
        hora_inicio: '05:30',
        hora_cierre: '22:00',
        eventos: [{
          id: '2026-11-12-pucara',
          lugar: 'pucara',
          nombre: 'Pucará de Tilcara',
          hora: '09:00',
          duracion_minutos: 120,
        }],
      }],
    };
    const guardada: TravesiaGuardada = {
      id: 'trav-1',
      titulo: 'Travesía 1 día · 12 nov',
      datos: { plan: planGuardado, lugaresElegidos: ['pucara'] },
      created_at: '2026-11-01T10:00:00Z',
      updated_at: '2026-11-02T10:00:00Z',
    };
    const auth = {
      configurado: true,
      inicializado: signal(true),
      sesion: signal({ id: 'user-2', email: 'viajera@example.com' }),
      error: signal(''),
      entrarConGoogle: vi.fn(),
      salir: vi.fn(),
    };
    const persistencia = {
      listar: vi.fn().mockResolvedValue([guardada]),
      guardar: vi.fn().mockResolvedValue(undefined),
      borrar: vi.fn().mockResolvedValue(undefined),
    };
    const validar = vi.fn((plan: PlanTravesia) => of({
      plan,
      validado: true,
      tramos: [],
      conflictos: [],
    }));

    await TestBed.configureTestingModule({
      imports: [TravesiaPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: CatalogoService, useValue: { getLugares: () => of(lugares) } },
        {
          provide: TravesiaService,
          useValue: {
            validar,
            getContexto: () => of({ paradas: [], horarios: [] }),
            getProximos: () => of({ origen: {}, destino: {}, direccion: 'ida', servicios: [] }),
          },
        },
        { provide: TravesiasGuardadasService, useValue: persistencia },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TravesiaPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.auth-sesion')?.textContent).toContain('viajera@example.com');
    expect(fixture.nativeElement.querySelector('#mis-travesias-title')?.textContent).toContain('Mis travesías');
    expect(fixture.nativeElement.textContent).toContain(guardada.titulo);
    expect(persistencia.listar).toHaveBeenCalledWith('user-2');

    const botones = Array.from(fixture.nativeElement.querySelectorAll('.travesia-guardada-acciones button')) as HTMLButtonElement[];
    botones.find(boton => boton.textContent?.includes('Cargar'))?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(validar).toHaveBeenCalledWith(planGuardado);
    expect(fixture.nativeElement.querySelector('.dias')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.guardar-travesia button')?.textContent).toContain('Guardar travesía');

    (fixture.nativeElement.querySelector('.guardar-travesia button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(persistencia.guardar).toHaveBeenCalledWith('user-2', planGuardado, ['pucara']);
    expect(fixture.nativeElement.textContent).toContain('Travesía guardada en tu cuenta.');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const botonesActualizados = Array.from(fixture.nativeElement.querySelectorAll('.travesia-guardada-acciones button')) as HTMLButtonElement[];
    botonesActualizados.find(boton => boton.textContent?.includes('Borrar'))?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(persistencia.borrar).toHaveBeenCalledWith('trav-1');
  });
});

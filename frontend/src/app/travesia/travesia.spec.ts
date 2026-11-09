import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CatalogoService } from '../catalogo.service';
import { Lugar } from '../catalogo.types';
import { TravesiaService } from './travesia.service';
import { TravesiaPage } from './travesia';
import { PlanTravesia } from './travesia.types';

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
});

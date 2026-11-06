import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CatalogoService } from '../catalogo.service';
import { Lugar } from '../catalogo.types';
import { LugarDetallePage } from './lugar-detalle';
import { ActivatedRoute } from '@angular/router';

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
  datos_json: { localidad: 'Purmamarca', nota: 'Altitud aproximada.' },
};

describe('LugarDetallePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LugarDetallePage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug: lugar.slug })) } },
        { provide: CatalogoService, useValue: { getLugar: () => of(lugar) } },
      ],
    }).compileComponents();
  });

  it('renders the complete travel information from the catalog', () => {
    const fixture = TestBed.createComponent(LugarDetallePage);
    fixture.detectChanges();
    const content = fixture.nativeElement.textContent as string;

    expect(content).toContain(lugar.nombre);
    expect(content).toContain(lugar.descripcion);
    expect(content).toContain(lugar.como_llegar);
    expect(content).toContain(lugar.mejor_epoca);
    expect(content).toContain('2,324 m');
    expect(content).toContain('23.7448');
    expect(content).toContain(lugar.datos_json.nota);
  });
});

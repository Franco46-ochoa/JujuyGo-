import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CatalogoService } from '../catalogo.service';
import { Lugar, Zona } from '../catalogo.types';
import { HomePage } from './home';

const zonas: Zona[] = ['quebrada', 'puna', 'yungas', 'valles'].map((slug, index) => ({
  id: index + 1,
  nombre: slug,
  slug,
  descripcion: `Descripción de ${slug}`,
  orden: index + 1,
  lugar_destacado: {
    nombre: `Lugar de ${slug}`,
    slug: `lugar-${slug}`,
    altitud_m: 2000 + index,
    foto: 'purmamarca.jpg',
    como_llegar: 'Consultá los horarios vigentes.',
  },
}));

const lugares: Lugar[] = [{
  id: 1,
  nombre: 'Cerro de prueba',
  slug: 'cerro-de-prueba',
  lat: -23.7,
  lng: -65.4,
  altitud_m: 2324,
  descripcion: 'Descripción breve.',
  como_llegar: 'Desde el pueblo.',
  mejor_epoca: 'Todo el año.',
  foto: 'purmamarca.jpg',
  zona: 'Quebrada',
  zona_slug: 'quebrada',
  datos_json: { localidad: 'Purmamarca' },
}];

describe('HomePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        {
          provide: CatalogoService,
          useValue: {
            getZonas: () => of(zonas),
            getLugares: () => of(lugares),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders the four catalog zones and links to a real featured place', async () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.zone-card') as NodeListOf<HTMLAnchorElement>;

    expect(cards.length).toBe(4);
    expect(cards[0].textContent).toContain('quebrada');
    expect(cards[0].textContent).toContain('Consultá los horarios vigentes.');
    expect(cards[0].getAttribute('href')).toBe('/lugares/lugar-quebrada');
  });

  it('renders a place detail link in the highlights list', async () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.place-row') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/lugares/cerro-de-prueba');
    expect(link.textContent).toContain('Cerro de prueba');
  });
});

import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CatalogoService } from '../catalogo.service';
import { Lugar, Zona } from '../catalogo.types';
import { HospedajeService } from '../hospedaje.service';
import { TravesiaService } from '../travesia/travesia.service';
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

const hospedajes = [{
  id: 1,
  nombre: 'Hotel de prueba',
  slug: 'hotel-de-prueba',
  tipo: 'hotel' as const,
  localidad: 'Tilcara',
  zona_slug: 'quebrada',
  descripcion: null,
  contacto_url: null,
  fuente: 'por verificar',
  verificado: false,
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
        {
          provide: HospedajeService,
          useValue: {
            getHospedajes: () => of(hospedajes),
            getGuias: () => of([]),
          },
        },
        {
          provide: TravesiaService,
          useValue: {
            getProximos: () => of({
              origen: { slug: 'terminal-jjs', nombre: 'Terminal' },
              destino: { slug: 'tilcara', nombre: 'Tilcara' },
              direccion: 'ida',
              servicios: [{
                servicio_id: 'servicio-1',
                linea_nombre: 'RN9',
                hora_salida: '08:00',
                hora_llegada: '09:35',
                confianza: 'publicado',
                fuente: 'horario de prueba',
                duracion_minutos: 95,
              }],
            }),
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
    const cards = fixture.nativeElement.querySelectorAll('.zone-card') as NodeListOf<HTMLButtonElement>;

    expect(cards.length).toBe(4);
    expect(cards[0].textContent).toContain('quebrada');
    expect(cards[0].textContent).toContain('Consultá los horarios vigentes.');
    expect(cards[0].getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('opens the zone panel in place when a zone card is clicked', async () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.zone-card') as HTMLButtonElement;
    card.click();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.zona-panel') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.textContent).toContain('quebrada');
    expect(panel.textContent).toContain('Cerro de prueba');

    const cerrar = panel.querySelector('.zona-cerrar') as HTMLButtonElement;
    cerrar.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.zona-panel')).toBeNull();
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

  it('renders the interactive map section with the catalog places and syncs cross-selection', async () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const mapSection = fixture.nativeElement.querySelector('#mapa');
    expect(mapSection).toBeTruthy();
    expect(mapSection.textContent).toContain('El mapa de nuestras cuatro regiones');

    const mapa = fixture.nativeElement.querySelector('yapa-mapa');
    expect(mapa).toBeTruthy();

    const placeCard = fixture.nativeElement.querySelector('.map-place-card') as HTMLElement;
    expect(placeCard).toBeTruthy();
    expect(placeCard.textContent).toContain('Cerro de prueba');

    // Hover sincroniza selección Lista -> Mapa
    placeCard.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(placeCard.classList.contains('active')).toBe(true);

    const imperdibleRow = fixture.nativeElement.querySelector('.place-row') as HTMLElement;
    expect(imperdibleRow.classList.contains('place-row-active')).toBe(true);
  });

  it('renders editorial moments and keeps lodging, guide and transit data honest', async () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Un viaje en cuatro movimientos');
    expect(fixture.nativeElement.textContent).toContain('Un viaje no es una sucesión de visitas, es la historia que se cuenta después.');
    expect(fixture.nativeElement.textContent).toContain('Hotel de prueba');
    expect(fixture.nativeElement.textContent).toContain('Pendiente de verificar · Fuente: por verificar');
    expect(fixture.nativeElement.textContent).toContain('No mostramos nombres sin una fuente confiable.');
    expect(fixture.nativeElement.querySelector('.guides-empty a')?.getAttribute('href')).toBe('https://turismo.jujuy.gob.ar/');
    expect(fixture.nativeElement.textContent).toContain('08:00');
    expect(fixture.nativeElement.textContent).toContain('horario de prueba');
  });
});

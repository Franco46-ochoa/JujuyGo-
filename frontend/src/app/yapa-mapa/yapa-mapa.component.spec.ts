import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Lugar } from '../catalogo.types';
import {
  clusterRadiusKmForZoom,
  computeClusters,
  haversineDistanceKm,
} from './yapa-mapa.clustering';
import { YapaMapaComponent } from './yapa-mapa.component';

const mockLugar1: Lugar = {
  id: 1,
  nombre: 'Pucará de Tilcara',
  slug: 'pucara-de-tilcara',
  lat: -23.5895,
  lng: -65.4024,
  altitud_m: 2500,
  descripcion: 'Sitio arqueológico prehispánico.',
  como_llegar: 'A pie desde Tilcara.',
  mejor_epoca: 'Todo el año.',
  foto: 'tilcara.jpg',
  zona: 'Quebrada',
  zona_slug: 'quebrada',
  datos_json: { localidad: 'Tilcara' },
};

const mockLugar2: Lugar = {
  id: 2,
  nombre: 'Garganta del Diablo',
  slug: 'garganta-del-diablo-tilcara',
  lat: -23.5797,
  lng: -65.3782,
  altitud_m: 2900,
  descripcion: 'Cañón y cascada en las afueras de Tilcara.',
  como_llegar: 'Sendero desde Tilcara.',
  mejor_epoca: 'Abril a noviembre.',
  foto: 'garganta.jpg',
  zona: 'Quebrada',
  zona_slug: 'quebrada',
  datos_json: { localidad: 'Tilcara' },
};

const mockLugarDistant: Lugar = {
  id: 3,
  nombre: 'La Quiaca',
  slug: 'la-quiaca',
  lat: -22.1045,
  lng: -65.5967,
  altitud_m: 3442,
  descripcion: 'Ciudad fronteriza de altura en el extremo norte.',
  como_llegar: 'En ómnibus por RN9.',
  mejor_epoca: 'Todo el año.',
  foto: 'puna.jpg',
  zona: 'Puna',
  zona_slug: 'puna',
  datos_json: { localidad: 'La Quiaca' },
};

describe('Clustering de YapaMapa (yapa-mapa.clustering)', () => {
  it('calcula distancia ortodrómica razonable entre atractivos de Tilcara (~2.7 km)', () => {
    const dist = haversineDistanceKm(
      mockLugar1.lat,
      mockLugar1.lng,
      mockLugar2.lat,
      mockLugar2.lng,
    );
    expect(dist).toBeGreaterThan(2);
    expect(dist).toBeLessThan(4);
  });

  it('determina radio de agrupamiento inversamente proporcional al zoom', () => {
    expect(clusterRadiusKmForZoom(8)).toBeGreaterThan(clusterRadiusKmForZoom(10));
    expect(clusterRadiusKmForZoom(10)).toBeGreaterThan(clusterRadiusKmForZoom(12));
    expect(clusterRadiusKmForZoom(13)).toBeLessThanOrEqual(1.5);
  });

  it('agrupa atractivos cercanos en el mismo pueblo ("Tilcara · 2") en zoom provincial (z=9)', () => {
    const clusters = computeClusters([mockLugar1, mockLugar2], 9);
    expect(clusters.length).toBe(1);
    expect(clusters[0].isCluster).toBe(true);
    expect(clusters[0].count).toBe(2);
    expect(clusters[0].nombre).toBe('Tilcara · 2');
    expect(clusters[0].localidad).toBe('Tilcara');
  });

  it('mantiene separados atractivos distantes (Tilcara vs La Quiaca > 150 km)', () => {
    const clusters = computeClusters([mockLugar1, mockLugarDistant], 9);
    expect(clusters.length).toBe(2);
    expect(clusters.every(c => !c.isCluster)).toBe(true);
    expect(clusters[0].nombre).toBe('Pucará de Tilcara');
    expect(clusters[1].nombre).toBe('La Quiaca');
  });

  it('disgrega el cluster en pins individuales al aumentar el zoom (z=13)', () => {
    const clusters = computeClusters([mockLugar1, mockLugar2], 13);
    expect(clusters.length).toBe(2);
    expect(clusters.every(c => !c.isCluster)).toBe(true);
    expect(clusters.map(c => c.nombre)).toContain('Pucará de Tilcara');
    expect(clusters.map(c => c.nombre)).toContain('Garganta del Diablo');
  });
});

describe('YapaMapaComponent', () => {
  let fixture: ComponentFixture<YapaMapaComponent>;
  let component: YapaMapaComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YapaMapaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(YapaMapaComponent);
    component = fixture.componentInstance;
  });

  it('se crea correctamente con valores iniciales y contenedor accesible', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();

    const canvas = fixture.nativeElement.querySelector('.yapa-mapa-canvas');
    expect(canvas).toBeTruthy();
    expect(canvas.getAttribute('role')).toBe('region');
    expect(canvas.getAttribute('aria-label')).toContain('Mapa interactivo');
  });

  it('calcula y actualiza los clusters cuando cambia el input de lugares', () => {
    fixture.componentRef.setInput('lugares', [mockLugar1, mockLugar2]);
    fixture.detectChanges();

    const clusters = component.clustersActivos();
    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters[0].count).toBe(2);
    expect(clusters[0].nombre).toBe('Tilcara · 2');
  });

  it('emite el evento lugarSelected al invocar seleccionarLugar', () => {
    let emitted: Lugar | null = null;
    component.lugarSelected.subscribe(l => {
      emitted = l;
    });

    component.seleccionarLugar(mockLugar1);
    expect(emitted).toEqual(mockLugar1);
  });

  it('en modoMini ajusta clase css y label aria', () => {
    fixture.componentRef.setInput('modoMini', true);
    fixture.componentRef.setInput('altura', '300px');
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.yapa-mapa-container');
    expect(container.classList.contains('yapa-mapa-mini')).toBe(true);
    expect(container.style.height).toBe('300px');

    const canvas = fixture.nativeElement.querySelector('.yapa-mapa-canvas');
    expect(canvas.getAttribute('aria-label')).toContain('Mini-mapa');
  });
});

import { Lugar } from '../catalogo.types';
import { crearPlan } from './travesia.model';

const lugares: Lugar[] = [
  {
    id: 1, nombre: 'Serranía del Hornocal', slug: 'hornocal', lat: 0, lng: 0,
    altitud_m: 4350, descripcion: 'Mirador de cerros de colores.', como_llegar: '',
    mejor_epoca: '', foto: null, zona: 'Quebrada', zona_slug: 'quebrada',
    datos_json: { localidad: 'Humahuaca' },
  },
  {
    id: 2, nombre: 'Pucará de Tilcara', slug: 'pucara', lat: 0, lng: 0,
    altitud_m: 2500, descripcion: 'Sitio arqueológico prehispánico.', como_llegar: '',
    mejor_epoca: '', foto: null, zona: 'Quebrada', zona_slug: 'quebrada',
    datos_json: { localidad: 'Tilcara' },
  },
  {
    id: 3, nombre: 'Garganta del Diablo', slug: 'garganta', lat: 0, lng: 0,
    altitud_m: 2900, descripcion: 'Cañón con caminatas de montaña.', como_llegar: '',
    mejor_epoca: '', foto: null, zona: 'Quebrada', zona_slug: 'quebrada',
    datos_json: { localidad: 'Tilcara' },
  },
];

describe('crearPlan', () => {
  it('creates a multi-day proposal from the date range and prioritizes selected interests', () => {
    const plan = crearPlan('2026-11-07', '2026-11-09', 'terminal', ['cultura'], lugares);

    expect(plan?.dias).toHaveLength(3);
    expect(plan?.dias.map(dia => dia.fecha)).toEqual(['2026-11-07', '2026-11-08', '2026-11-09']);
    expect(plan?.dias[0].eventos[0].lugar).toBe('pucara');
    expect(plan?.intereses).toEqual(['cultura']);
  });

  it('rejects a reversed date range', () => {
    expect(crearPlan('2026-11-09', '2026-11-07', 'terminal', ['paisaje'], lugares)).toBeNull();
  });
});

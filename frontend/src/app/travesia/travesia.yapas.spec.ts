import { Lugar } from '../catalogo.types';
import { ContextoTravesia } from './travesia.types';
import { generarYapas } from './travesia.yapas';

const volcan: Lugar = {
  id: 1, nombre: 'Tren Solar — estación Volcán', slug: 'tren-volcan', lat: 0, lng: 0,
  altitud_m: 2080, descripcion: 'Estación del Tren Solar.', como_llegar: '',
  mejor_epoca: '', foto: null, zona: 'Quebrada', zona_slug: 'quebrada',
  datos_json: { localidad: 'Volcán' },
};

const cerro: Lugar = {
  id: 2, nombre: 'Cerro de los Siete Colores', slug: 'cerro-siete-colores', lat: 0, lng: 0,
  altitud_m: 2324, descripcion: 'Formaciones de distintos tonos.', como_llegar: '',
  mejor_epoca: '', foto: null, zona: 'Quebrada', zona_slug: 'quebrada',
  datos_json: { localidad: 'Purmamarca' },
};

const contexto: ContextoTravesia = {
  paradas: [
    { slug: 'volcan', nombre: 'Volcán', orden_en_linea: 2 },
    { slug: 'purmamarca-cruce', nombre: 'Purmamarca Cruce', orden_en_linea: 3 },
  ],
  margenes: { base_minutos: 15, acceso_local_minutos: 30, accesos_locales: ['purmamarca-cruce', 'serrania-del-hornocal'] },
  horarios: [{
    servicio_id: 'rn9-ida',
    direccion: 'ida',
    paradas: [
      { slug: 'volcan', orden_en_linea: 2, hora: '11:15', confianza: 'estimado', fuente: 'horario RN9' },
      { slug: 'purmamarca-cruce', orden_en_linea: 3, hora: '11:35', confianza: 'estimado', fuente: 'horario RN9' },
    ],
  }],
};

describe('generarYapas', () => {
  it('uses RN9 details only when a service connects Volcán and Purmamarca', () => {
    const sugerencias = generarYapas([volcan], [cerro], contexto, 11 * 60);

    expect(sugerencias[0]).toMatchObject({
      tipo: 'rn9',
      lugar_sugerido_slug: 'cerro-siete-colores',
      accion: 'agregar-al-dia',
      hora_sugerida: '12:20',
    });
    expect(sugerencias[0].mensaje).toContain('Purmamarca Cruce');
    expect(sugerencias[0].mensaje).toContain('3 km');
    const sinServicio = generarYapas([volcan], [cerro], { ...contexto, horarios: [] }, 11 * 60);
    expect(sinServicio[0].tipo).toBe('zona');
    expect(sinServicio[0].mensaje).not.toContain('servicio RN9');
  });

  it('builds a locality suggestion from catalog data without requiring transit between stops', () => {
    const tilcara: Lugar = {
      ...cerro,
      slug: 'pucara-tilcara',
      nombre: 'Pucará de Tilcara',
      datos_json: { localidad: 'Tilcara' },
    };
    const gargante: Lugar = {
      ...tilcara,
      slug: 'garganta-tilcara',
      nombre: 'Garganta del Diablo',
    };

    expect(generarYapas([tilcara], [gargante], null)[0].mensaje).toContain('Tilcara');
    expect(generarYapas([tilcara], [gargante], null)[0].mensaje).toContain('Garganta del Diablo');
  });

  it('suggests a different locality in the same zone without requiring an RN9 service', () => {
    const tilcara: Lugar = {
      ...volcan,
      nombre: 'Pucará de Tilcara',
      datos_json: { localidad: 'Tilcara' },
    };

    const sugerencias = generarYapas([tilcara], [cerro], null);

    expect(sugerencias[0]).toMatchObject({
      tipo: 'zona',
      lugar_sugerido_slug: 'cerro-siete-colores',
    });
    expect(sugerencias[0].mensaje).toContain('Quebrada');
    expect(sugerencias[0].mensaje).toContain('Purmamarca');
  });
});

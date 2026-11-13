import { Lugar } from '../catalogo.types';
import { crearPlan, margenDeLugar } from './travesia.model';
import { ContextoTravesia } from './travesia.types';

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

const margenes = { base_minutos: 15, acceso_local_minutos: 30, accesos_locales: ['purmamarca-cruce', 'serrania-del-hornocal'] };

const contexto: ContextoTravesia = {
  paradas: [
    { slug: 'terminal-jjs', nombre: 'Terminal de San Salvador', orden_en_linea: 1 },
    { slug: 'volcan', nombre: 'Volcán', orden_en_linea: 2 },
    { slug: 'purmamarca-cruce', nombre: 'Purmamarca Cruce', orden_en_linea: 3 },
    { slug: 'tilcara', nombre: 'Tilcara', orden_en_linea: 5 },
    { slug: 'humahuaca', nombre: 'Humahuaca', orden_en_linea: 8 },
    { slug: 'abra-pampa', nombre: 'Abra Pampa', orden_en_linea: 9 },
  ],
  horarios: [],
  margenes,
};

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

  it('keeps only the places the traveler explicitly selected', () => {
    const plan = crearPlan('2026-11-07', '2026-11-07', 'terminal', ['paisaje'], lugares, ['garganta']);

    expect(plan?.dias.flatMap(dia => dia.eventos.map(evento => evento.lugar))).toEqual(['garganta']);
  });

  it('orders selected Quebrada places by the RN9 corridor and separates distant zones by day', () => {
    const lugaresMixtos = [
      ...lugares,
      {
        id: 4, nombre: 'Abra Pampa', slug: 'abra', lat: 0, lng: 0,
        altitud_m: 3484, descripcion: 'Puna jujeña.', como_llegar: '',
        mejor_epoca: '', foto: null, zona: 'Puna', zona_slug: 'puna',
        datos_json: { localidad: 'Abra Pampa' },
      },
    ];
    const plan = crearPlan(
      '2026-11-07',
      '2026-11-09',
      'terminal',
      ['paisaje'],
      lugaresMixtos,
      ['abra', 'hornocal', 'pucara'],
      contexto,
    );

    expect(plan?.dias[0].eventos.map(evento => evento.lugar)).toEqual(['pucara', 'hornocal']);
    expect(plan?.dias[1].eventos.map(evento => evento.lugar)).toEqual(['abra']);
    expect(plan?.dias.every(dia => new Set(dia.eventos.map(evento =>
      lugaresMixtos.find(lugar => lugar.slug === evento.lugar)?.zona_slug,
    )).size <= 1)).toBe(true);
  });

  it('does not combine geographically separate selected groups when there are too few days', () => {
    const lugaresMixtos = [
      lugares[0],
      {
        id: 4, nombre: 'Abra Pampa', slug: 'abra', lat: 0, lng: 0,
        altitud_m: 3484, descripcion: 'Puna jujeña.', como_llegar: '',
        mejor_epoca: '', foto: null, zona: 'Puna', zona_slug: 'puna',
        datos_json: { localidad: 'Abra Pampa' },
      },
    ];

    expect(crearPlan('2026-11-07', '2026-11-07', 'terminal', ['paisaje'], lugaresMixtos, ['hornocal', 'abra'], contexto)).toBeNull();
  });
});

describe('margenDeLugar', () => {
  const cerro: Lugar = {
    id: 4, nombre: 'Cerro de los Siete Colores', slug: 'cerro-siete-colores', lat: 0, lng: 0,
    altitud_m: 2324, descripcion: 'Paleta de colores.', como_llegar: '',
    mejor_epoca: '', foto: null, zona: 'Quebrada', zona_slug: 'quebrada',
    datos_json: { localidad: 'Purmamarca' },
  };
  const hornocal: Lugar = {
    ...cerro,
    slug: 'serrania-del-hornocal',
    nombre: 'Serranía del Hornocal',
    datos_json: { localidad: 'Humahuaca' },
  };

  it('returns the base margin for a place without local access', () => {
    expect(margenDeLugar(lugares[1], margenes)).toBe(15);
  });

  it('adds the local-access margin when the stop requires a transfer', () => {
    expect(margenDeLugar(cerro, margenes)).toBe(45);
  });

  it('adds the local-access margin when the place slug itself is listed', () => {
    expect(margenDeLugar(hornocal, margenes)).toBe(45);
  });
});

describe('crearPlan con horarios', () => {
  const cerro: Lugar = {
    id: 4, nombre: 'Cerro de los Siete Colores', slug: 'cerro-siete-colores', lat: 0, lng: 0,
    altitud_m: 2324, descripcion: 'Paleta de colores.', como_llegar: '',
    mejor_epoca: '', foto: null, zona: 'Quebrada', zona_slug: 'quebrada',
    datos_json: { localidad: 'Purmamarca' },
  };

  const contextoConHorarios = (paradaDestino: string, ordenDestino: number, llegada: string): ContextoTravesia => ({
    ...contexto,
    horarios: [{
      servicio_id: 'rn9-ida',
      direccion: 'ida',
      paradas: [
        { slug: 'terminal-jjs', orden_en_linea: 1, hora: '07:30', confianza: 'publicado', fuente: 'seed' },
        { slug: paradaDestino, orden_en_linea: ordenDestino, hora: llegada, confianza: 'publicado', fuente: 'seed' },
      ],
    }],
  });

  it('leaves the local-access margin between the bus arrival and the visit', () => {
    const plan = crearPlan(
      '2026-11-07',
      '2026-11-07',
      'terminal',
      ['paisaje'],
      [cerro],
      ['cerro-siete-colores'],
      contextoConHorarios('purmamarca-cruce', 3, '08:50'),
    );

    expect(plan?.dias[0].eventos[0].hora).toBe('09:35');
  });

  it('leaves only the base margin for a stop without local access', () => {
    const plan = crearPlan(
      '2026-11-07',
      '2026-11-07',
      'terminal',
      ['cultura'],
      [lugares[1]],
      ['pucara'],
      contextoConHorarios('tilcara', 5, '08:50'),
    );

    expect(plan?.dias[0].eventos[0].hora).toBe('09:05');
  });
});

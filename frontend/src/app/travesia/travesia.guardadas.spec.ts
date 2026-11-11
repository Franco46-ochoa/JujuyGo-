import { SupabaseClient } from '@supabase/supabase-js';
import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../supabase.client';
import { TravesiasGuardadasService } from './travesias-guardadas.service';
import { deserializarPlan, serializarPlan, tituloTravesia } from './travesia.guardadas';
import { PlanTravesia } from './travesia.types';

const plan: PlanTravesia = {
  llegada: 'terminal',
  intereses: ['paisaje'],
  dias: [{
    fecha: '2026-11-12',
    origen: 'terminal-jjs',
    cierre: 'terminal-jjs',
    hora_inicio: '05:30',
    hora_cierre: '22:00',
    eventos: [{
      id: '2026-11-12-hornocal',
      lugar: 'hornocal',
      nombre: 'Serranía del Hornocal',
      hora: '09:00',
      duracion_minutos: 120,
    }],
  }, {
    fecha: '2026-11-13',
    origen: 'terminal-jjs',
    cierre: 'terminal-jjs',
    hora_inicio: '07:00',
    hora_cierre: '22:00',
    eventos: [],
  }, {
    fecha: '2026-11-14',
    origen: 'terminal-jjs',
    cierre: 'terminal-jjs',
    hora_inicio: '07:00',
    hora_cierre: '22:00',
    eventos: [],
  }, {
    fecha: '2026-11-15',
    origen: 'terminal-jjs',
    cierre: 'terminal-jjs',
    hora_inicio: '07:00',
    hora_cierre: '22:00',
    eventos: [],
  }],
};

describe('travesías guardadas', () => {
  it('serializes and restores the plan and chosen places', () => {
    const datos = serializarPlan(plan, ['hornocal']);

    expect(deserializarPlan(JSON.parse(JSON.stringify(datos)))).toEqual({
      plan,
      lugaresElegidos: ['hornocal'],
    });
    expect(deserializarPlan({ plan: { llegada: 'unknown' }, lugaresElegidos: [] })).toBeNull();
    expect(tituloTravesia(plan)).toBe('Travesía 4 días · 12-15 nov');
  });

  it('saves, lists in database order, and deletes through the Supabase client', async () => {
    const rows = [{
      id: 'saved-1',
      titulo: 'Travesía 4 días · 12-15 nov',
      datos: serializarPlan(plan, ['hornocal']),
      created_at: '2026-11-01T10:00:00Z',
      updated_at: '2026-11-02T10:00:00Z',
    }];
    const chain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
      delete: vi.fn().mockReturnThis(),
      then: (resolve: (value: { error: null }) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve({ error: null }).then(resolve, reject),
    };
    const from = vi.fn(() => chain);
    const client = { from } as unknown as SupabaseClient;

    TestBed.configureTestingModule({
      providers: [
        TravesiasGuardadasService,
        { provide: SUPABASE_CLIENT, useValue: client },
      ],
    });
    const service = TestBed.inject(TravesiasGuardadasService);

    await service.guardar('user-1', plan, ['hornocal']);
    expect(from).toHaveBeenCalledWith('travesias');
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      titulo: 'Travesía 4 días · 12-15 nov',
      datos: { plan, lugaresElegidos: ['hornocal'] },
    }));

    const guardadas = await service.listar('user-1');
    expect(guardadas).toEqual(rows);
    expect(chain.order).toHaveBeenCalledWith('updated_at', { ascending: false });

    await service.borrar('saved-1');
    expect(chain.delete).toHaveBeenCalledOnce();
    expect(chain.eq).toHaveBeenLastCalledWith('id', 'saved-1');
  });

  it('reports database errors instead of hiding them', async () => {
    const chain = {
      insert: vi.fn().mockResolvedValue({ error: new Error('denegado') }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: new Error('denegado') }),
      delete: vi.fn().mockReturnThis(),
    };
    const client = { from: vi.fn(() => chain) } as unknown as SupabaseClient;
    TestBed.configureTestingModule({
      providers: [
        TravesiasGuardadasService,
        { provide: SUPABASE_CLIENT, useValue: client },
      ],
    });
    const service = TestBed.inject(TravesiasGuardadasService);

    await expect(service.guardar('user-1', plan, [])).rejects.toThrow('denegado');
    await expect(service.listar('user-1')).rejects.toThrow('denegado');
  });
});

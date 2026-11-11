import { Injectable, inject } from '@angular/core';
import { SUPABASE_CLIENT } from '../supabase.client';
import { PlanTravesia } from './travesia.types';
import { serializarPlan, tituloTravesia } from './travesia.guardadas';

export interface TravesiaGuardada {
  id: string;
  titulo: string;
  datos: unknown;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class TravesiasGuardadasService {
  private readonly client = inject(SUPABASE_CLIENT);

  async guardar(userId: string, plan: PlanTravesia, lugaresElegidos: string[]): Promise<void> {
    const client = this.clienteConfigurado();
    const { error } = await client.from('travesias').insert({
      user_id: userId,
      titulo: tituloTravesia(plan),
      datos: serializarPlan(plan, lugaresElegidos),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`No pudimos guardar la travesía: ${error.message}`);
  }

  async listar(userId: string): Promise<TravesiaGuardada[]> {
    const client = this.clienteConfigurado();
    const { data, error } = await client
      .from('travesias')
      .select('id, titulo, datos, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(`No pudimos cargar tus travesías: ${error.message}`);
    return data ?? [];
  }

  async borrar(id: string): Promise<void> {
    const client = this.clienteConfigurado();
    const { error } = await client.from('travesias').delete().eq('id', id);
    if (error) throw new Error(`No pudimos borrar la travesía: ${error.message}`);
  }

  private clienteConfigurado() {
    if (!this.client) throw new Error('El guardado de travesías no está configurado.');
    return this.client;
  }
}

import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly client = inject(SUPABASE_CLIENT);
  private subscription: { unsubscribe: () => void } | null = null;

  readonly configurado = this.client !== null;
  readonly sesion = signal<User | null>(null);
  readonly inicializado = signal(!this.client);
  readonly error = signal('');

  constructor() {
    if (!this.client) return;

    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      this.sesion.set(session?.user ?? null);
      this.inicializado.set(true);
    });
    this.subscription = data.subscription;

    void this.client.auth.getSession()
      .then(({ data: sessionData, error }) => {
        if (error) {
          this.error.set(`No pudimos comprobar tu sesión: ${error.message}`);
        } else {
          this.sesion.set(sessionData.session?.user ?? null);
        }
        this.inicializado.set(true);
      })
      .catch(error => {
        this.error.set(`No pudimos comprobar tu sesión: ${this.mensajeError(error)}`);
        this.inicializado.set(true);
      });
  }

  async entrarConGoogle(): Promise<void> {
    if (!this.client) {
      this.error.set('El login no está configurado.');
      return;
    }

    this.error.set('');
    try {
      const { error } = await this.client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/travesia` },
      });
      if (error) this.error.set(`No pudimos iniciar sesión con Google: ${error.message}`);
    } catch (error) {
      this.error.set(`No pudimos iniciar sesión con Google: ${this.mensajeError(error)}`);
    }
  }

  async salir(): Promise<void> {
    if (!this.client) {
      this.error.set('El login no está configurado.');
      return;
    }

    this.error.set('');
    try {
      const { error } = await this.client.auth.signOut();
      if (error) {
        this.error.set(`No pudimos cerrar sesión: ${error.message}`);
        return;
      }
      this.sesion.set(null);
    } catch (error) {
      this.error.set(`No pudimos cerrar sesión: ${this.mensajeError(error)}`);
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private mensajeError(error: unknown): string {
    return error instanceof Error ? error.message : 'Intentá de nuevo en unos minutos.';
  }
}

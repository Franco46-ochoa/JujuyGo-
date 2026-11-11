import { TestBed } from '@angular/core/testing';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import { SUPABASE_CLIENT } from './supabase.client';

describe('AuthService', () => {
  let onAuthStateChange: (event: string, session: { user: User } | null) => void;
  let signInWithOAuth: ReturnType<typeof vi.fn>;
  let signOut: ReturnType<typeof vi.fn>;
  let unsubscribe: ReturnType<typeof vi.fn>;
  let client: SupabaseClient;

  beforeEach(() => {
    signInWithOAuth = vi.fn().mockResolvedValue({ error: null });
    signOut = vi.fn().mockResolvedValue({ error: null });
    unsubscribe = vi.fn();
    const user = { id: 'user-1', email: 'viajera@example.com' } as User;
    const session = { user };
    const auth = {
      onAuthStateChange: vi.fn((callback: typeof onAuthStateChange) => {
        onAuthStateChange = callback;
        return { data: { subscription: { unsubscribe } } };
      }),
      getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      signInWithOAuth,
      signOut,
    };
    client = { auth } as unknown as SupabaseClient;
  });

  function crearServicio(cliente: SupabaseClient | null = client): AuthService {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: SUPABASE_CLIENT, useValue: cliente },
      ],
    });
    return TestBed.inject(AuthService);
  }

  it('initializes the session and follows auth state changes', async () => {
    const service = crearServicio();
    await Promise.resolve();

    expect(service.inicializado()).toBe(true);
    expect(service.sesion()?.email).toBe('viajera@example.com');

    onAuthStateChange('SIGNED_OUT', null);
    expect(service.sesion()).toBeNull();
    service.ngOnDestroy();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('starts Google OAuth with a travesía redirect', async () => {
    const service = crearServicio();
    await service.entrarConGoogle();

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/travesia` },
    });
    expect(service.error()).toBe('');
  });

  it('signs out and clears the active session', async () => {
    const service = crearServicio();
    await service.salir();

    expect(signOut).toHaveBeenCalledOnce();
    expect(service.sesion()).toBeNull();
  });

  it('surfaces sign-in and sign-out errors', async () => {
    signInWithOAuth.mockResolvedValueOnce({ error: new Error('OAuth no disponible') });
    signOut.mockResolvedValueOnce({ error: new Error('No se pudo cerrar') });
    const service = crearServicio();

    await service.entrarConGoogle();
    expect(service.error()).toContain('OAuth no disponible');

    await service.salir();
    expect(service.error()).toContain('No se pudo cerrar');
  });

  it('reports an unconfigured login without throwing', async () => {
    const service = crearServicio(null);
    await service.entrarConGoogle();

    expect(service.configurado).toBe(false);
    expect(service.inicializado()).toBe(true);
    expect(service.error()).toContain('no está configurado');
  });
});

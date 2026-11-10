# Slice 21 — Login Google (Supabase) y guardar travesías

**Depende de:** master actual (`246dfa9`). El proyecto Supabase ya existe:
URL `https://uaydgrcdpnjtcabrcmfd.supabase.co` y anon key
`sb_publishable_...` ya están en `backend/.env` (NO commitear `.env`; la anon
key es pública por diseño pero vive solo en `.env` y en `environment.ts` —
aceptable porque es la publishable key).

**Alcance:** `frontend/` (nuevo `auth.service.ts`, `travesia/` para guardar/
cargar, `app.config.ts`, environments, package.json para `@supabase/supabase-js`)
y `supabase/migrations/001_travesias.sql` (nuevo). NO tocar backend, specs,
docs, ni el resto del catálogo.

## Contexto

- Hoy la travesía se arma en memoria (`PlanTravesia` en `travesia.model.ts`,
  serializable: llegada, intereses, dias[]). No hay persistencia ni auth.
- Supabase Auth con Google provider: el usuario ya creó el proyecto; el alta
  del provider Google OAuth en el dashboard es manual del usuario (pendiente
  pero el código debe quedar listo igual).
- Patrón elegido: **frontend-only con `@supabase/supabase-js`** — la tabla
  `travesias` con RLS permite al cliente autenticado leer/escribir solo sus
  filas con la anon key + JWT del usuario. El backend no participa.
- Tests: Vitest con mocks; NUNCA pegarle a Supabase real en tests.

## Qué tiene que pasar

1. **Setup Supabase client**: `npm i @supabase/supabase-js` (versión estable,
   publicada hace >7 días). `environment.ts` suma `supabaseUrl` y
   `supabaseAnonKey` (valores reales del `.env` ya dado). Un
   `SupabaseClient` singleton en `frontend/src/app/supabase.client.ts` (o
   dentro del auth service — lo que sea más limpio).
2. **`auth.service.ts`**: signal `sesion` (usuario o null), `inicializado`,
   `entrarConGoogle()` → `signInWithOAuth({ provider: 'google', options: {
   redirectTo: window.location.origin + '/travesia' } })`, `salir()`,
   `onAuthStateChange` para mantener la sesión. Manejo honesto de errores
   (mostrar mensaje, no crashear). Si las env vars faltan/vacías, la UI debe
   degradar con gracia (botón deshabilitado + texto "login no configurado").
3. **SQL `supabase/migrations/001_travesias.sql`**: tabla `travesias`
   (`id uuid pk default gen_random_uuid()`, `user_id uuid not null references
   auth.users(id) on delete cascade`, `titulo text not null`, `datos jsonb
   not null`, `created_at timestamptz default now()`, `updated_at`), índices
   por `user_id`, y políticas RLS: `select/insert/update/delete` solo donde
   `auth.uid() = user_id`. RLS habilitada. Comentarios en español.
4. **Guardar**: en `/travesia`, si hay sesión, botón "Guardar travesía" que
   hace `upsert`/`insert` en `travesias` con `titulo` auto-generado
   (ej. "Travesía 3 días · 12-15 nov") y `datos` = el `PlanTravesia`
   serializado + metadatos mínimos (lugares elegidos). Sin sesión → el botón
   invita a entrar con Google (no guardar en localStorage como fallback
   silencioso — honesto: "iniciá sesión para guardar").
5. **Mis travesías**: sección/lista "Mis travesías" visible solo con sesión:
   `select` de las filas del usuario ordenadas por `updated_at desc`, con
   título y fecha; "Cargar" restaura el `PlanTravesia` en la página (reusa la
   lógica de creación del plan); "Borrar" con confirmación simple.
6. **UI de auth**: indicador de sesión en la página de travesía (avatar/email
   + "Salir"), botón "Entrar con Google" prominente pero no invasivo. Mantener
   el tono editorial cálido del proyecto (mirar estilos existentes, reusar
   clases).
7. **Manejo del redirect OAuth**: tras volver de Google, supabase-js detecta
   el hash/session solo; verificar que `inicializado` no rompa la carga.
8. **Tests**: auth service con cliente mockeado (sesión, entrar, salir,
   error), serialización/deserialización del plan guardado, guardado/carga/
   borrado contra un cliente Supabase mockeado (no real). Componente: botón
   guardar según estado de sesión, lista de mis travesías con datos mock.

## Criterios

- [ ] `cd frontend && npm test -- --watch=false` verde
- [ ] `cd frontend && npm run build` OK
- [ ] `git diff --check` limpio
- [ ] El SQL abre con `create table` + `alter table ... enable row level
      security` + políticas `auth.uid()`
- [ ] Nada de secrets hardcodeados fuera de environment.ts; `.env` intacto
- [ ] Kero-audit del flujo si el worker tiene browser disponible; si no,
      declararlo en gaps
- [ ] Recibo con archivos tocados, comandos corridos y gaps (incluye: Google
      OAuth provider pendiente de configurar en dashboard por el usuario)

## Fuera de alcance

- Backend endpoints de auth (no hacen falta con este patrón).
- Login con email/password, magic links, recuperación de contraseña.
- Compartir travesías por link público.
- Cambios visuales más allá de lo necesario para auth/guardar.

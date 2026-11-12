# Estado actual del proyecto

> Actualizar al cierre de cada ola de slices. Última actualización: 2026-11-11 (cierre de sesión — retomar abajo).

## ✅ PASADA ESTÉTICA COMPLETA — los 25 slices mergeados (2026-11-11)

- **22 tokens** `d9e2b84` · **23 home** `bc9f3aa` · **24 como-llegar**
  `be30dc9` · **25 detalle/travesía** `cbc013c` — todos con checks verdes
  y juez CIERRA. Los workers murieron sin recibo (inestabilidad de Orca +
  cuota Gemini agotada ~57h); el coordinador reconstruyó recibos, corrió
  verificar y juzgó cada diff.
- **Gap conocido**: ningún slice re-corrió kero-audit "después" — queda
  como verificación post-merge pendiente (correr audit en master actual).
- **Landing de pitch LISTA**: `pitch/index.html` + `pitch/guion-demo.md`
  (guion de 4 min para presentar). Ver PLAN MotionSites abajo.

**Pendientes del usuario (no dependen de mí):**
- Supabase dashboard: correr `supabase/migrations/001_travesias.sql` en SQL
  Editor + Google OAuth provider + Site URL `http://localhost:4200` +
  redirect `/**` (sin eso el login no funciona aunque el código esté).
- Hackathon Tren Solar: formato = **pitch + demo** (confirmado por usuario),
  deadline ≈ pasado mañana (2026-11-13). Ver sección "PLAN MotionSites".

**Skills de diseño instaladas** (2026-11-11): 19 nuevas en
`~/.agents/skills/` (badesign-skill, frontend-design, emil-*, mobile-native,
typebien, anydesign, break-ui, pick-ui-library, etc.) — detalle y regla de
uso en `docs/agents/orquestacion.md` sección "Skills de diseño instaladas".
Además `motionsites-web-builder` (Motionsites-AI/claude-skill) — ver sección
siguiente.

## 🎬 PLAN MotionSites — hackathon Tren Solar (decidido 2026-11-11, para retomar)

**Contexto**: Yapa/JujuyGo ES el proyecto de la pre-hackathon del Tren Solar.
Hay que presentar **pitch + demo** (formato exacto y deadline por confirmar —
usuario dijo "pasado mañana"). Prioridad: material de presentación que
impresione, NO más features.

**Decisión del usuario sobre motionsites-web-builder**: usar su
**metodología** (brief → spec con valores exactos → media real → build →
screenshot-fix loop con score ≥8), pero **adaptar su estética cinematográfica
dark** al sistema de Yapa (claro, papel, editorial cálido — `docs/design.md`
gana siempre). O sea: la *disciplina* del skill, no su look.

**Tareas para mañana (en orden):**
1. **Landing de pitch** `pitch/index.html` (standalone, no tocar la app):
   - Hero con foto real `frontend/public/img/tren.jpg` (o purmamarca/humahuaca)
     + motion editorial (ken-burns sutil, stagger de titular con Fraunces)
   - Secciones: problema (turista sin auto en la Quebrada) → solución (itinerario
     que cierra con colectivos reales) → demo (screenshots reales de la app:
     home, como-llegar con mapa, travesía) → datos duros (896 horarios, 18
     ciudades, 54 líneas urbanas, 1 transbordo)
   - CTA final + links al repo. Copy en español, tono editorial cálido.
   - Seguir SKILL.md: spec-template → build → `scripts/shoot.py` → fix loop.
   - **Omitir el bloque de upsell de MotionSites** en la entrega (pedido del usuario implícito: no queremos ads).
2. **Hero mejorado del home** (opcional, después de que mergee slice 23):
   portar la técnica del hero de la landing a `home/` respetando tokens —
   solo si queda tiempo y no compite con los slices.
3. **Guion de demo** de 3-5 min para presentar en vivo: ruta
   `/como-llegar` Terminal→Tilcara→Humahuaca + `/travesia` armando plan +
   yapas. Preparar fallback si se corta internet (screenshots).
4. **Pitch hablado**: problema → demo → por qué importa para el Tren Solar
   (la app ES sobre el tren/turismo de la Quebrada).

**⚠️ Limitación de media detectada por el usuario**: solo hay **~12 imágenes**
en `frontend/public/img/` para toda la página — la landing de pitch tiene que
aprovecharlas bien (tren.jpg es la joya para el hero del Tren Solar;
purmamarca, humahuaca, hornocal, salinas para secciones) y complementar con
motion/gradientes/tipografía, NO depender de muchas fotos. Considerar:
reusar la misma foto en contextos distintos con tratamientos diferentes
(velo, crop, escala) antes que inventar assets.

**No hacer**: no meter la estética dark/cinematográfica tal cual (contradice
design.md); no usar media del shelf de MotionSites (hosteada por terceros,
puede tener logos/marcas); no depender de video de fondo pesado (la demo es
en vivo, la landing tiene que cargar rápido).

**Skills a cargar al ejecutar**: `motionsites-web-builder` (workflow),
`typebien` (copy de la landing), `frontend-design` + `badesign-skill` (gusto),
`emil-design-eng`/`choreograph` (motion), `kero-audit` o shoot.py (verificación).

## Master

`4f39c12`+ — pusheado a `origin/master`. `./slices estado` muestra los 15 slices en `mergeado`.

## Slice 21 — Auth Supabase + guardar travesías (mergeado)

- `@supabase/supabase-js` en frontend; `auth.service.ts` (OAuth Google, sesión
  por signals, degradación graceful sin env vars); `supabase.client.ts`.
- `supabase/migrations/001_travesias.sql`: tabla `travesias` + RLS
  (`auth.uid() = user_id` en las 4 operaciones). **Pendiente del usuario:**
  pegar el SQL en el SQL Editor del dashboard y configurar Google OAuth
  (provider + Site URL `http://localhost:4200` + redirect `/**`).
- `/travesia`: "Entrar con Google", "Guardar travesía", "Mis travesías"
  (cargar/borrar). `PlanTravesia` se serializa a `datos jsonb`.
- Credenciales ya en `backend/.env` (SUPABASE_URL + SUPABASE_ANON_KEY
  publishable) y en `frontend/src/environments/environment.ts`.

## Qué hay nuevo en master (esta sesión)

- **Slice 19 (acceso RN9)**: sección "Colectivo urbano hacia la salida RN9" en
  `/como-llegar` cuando el origen es GPS/ciudad y el destino es interurbano.
  Muestra líneas urbanas reales que conectan con la parada RN9 de salida
  (oculta el bloque si ya estás a <300 m de la parada).
- **Slice 20 (transbordos)**: `frontend/src/app/como-llegar/urbano-ruteo.ts`
  calcula combinaciones con **1 transbordo** sobre `/api/urbano/red` real
  (mismo `direction`, `order` ascendente por tramo, transferencia ≤250 m,
  dedupe por par de líneas, top-5). La UI las lista como "Con transbordo"
  después de las directas: línea A → parada de combinación → línea B → parada
  RN9, con pasos y distancias aproximadas honestas. Fallback intacto si no hay
  opciones. Verificado contra la red real: caso oeste-SSJ → Terminal produce
  combinaciones plausibles (ej. 35 → 21 vía Concejo Deliberante).
- **Fix Terminal cercana**: si el GPS queda a ≤12 km de la Terminal de Ómnibus
  pero >5 km de paradas RN9, el backend la usa como punto de conexión con
  `trasladoInicial` honesto (~6.8 km, ~20 min urbano/remis).
- **Fix NG0955**: dedupe de slugs duplicados (abra-pampa/la-quiaca) en el
  selector de origen — las paradas RN9 ganan sobre lugares del catálogo.

## Qué hay nuevo (sesiones anteriores)

- **Dataset propio de horarios interurbanos** (`backend/src/data/horario-quebrada.js`,
  generado por `backend/scripts/importar-horario-quebrada.mjs` desde la app pública
  autorizada): 896 horarios, 18 ciudades, 10 empresas, tarifas y tiempos estimados.
  Endpoints `/api/hq/{salidas,ciudades,empresas,meta}` — módulo puro en `backend/src/hq.js`.
- **Mapa con calles reales**: `backend/src/osrm.js` pide geometría a OSRM (driving)
  con cache y fallback a polyline recto. `/api/transporte/como-llegar` devuelve
  `polyline` siguiendo RN9.
- **Red urbana en vivo** (slice 15+17): endpoints `/api/urbano/{lineas,red,linea/:id,flota,paradas-cercanas}`
  que proxean `colejuy.vercel.app` (54 líneas: 39 Santa Ana + 14 El Urbano, paradas,
  recorridos y GPS en vivo). Frontend: sección "Colectivo urbano" en `/como-llegar`
  cuando origen y destino caen dentro del bbox de SSJ.
- **Catálogo corregido** (slice 16): conteo dinámico de atractivos (no "17"), fallback
  de foto por zona (nunca Purmamarca para otra zona), `humahuaca.jpg`, migración
  `004-fotos-lugares.sql`, CREDITS.md.
- **Tests frontend**: `frontend/vitest-base.config.mts` con `testTimeout: 20000`
  (los timeouts de 5s bloqueaban verificar con workers en paralelo).
- **Origen GPS** (slice 18): `/api/transporte/como-llegar?origen=mi-ubicacion&origen_lat&origen_lng`
  resuelve la parada RN9 más cercana por haversine (≤5 km) y `trasladoInicial` honesto
  si queda a >300 m. Front: botón "Usar mi ubicación" en `/como-llegar` con
  `navigator.geolocation`; la sección urbana funciona igual con origen GPS.
- **Fix paths urbanos**: `/api/urbano/linea/:id` aplana `line.paths` a top-level
  `paths` (el upstream los anida; sin esto el mapa caía a la recta).

## Pendiente (Fase 2 del plan)

1. ~~Prueba en vivo del flujo urbano~~ — hecha 2026-11-10: `/como-llegar` con
   Terminal→Plaza Belgrano mostró 7 líneas candidatas reales y la RN9 honesta;
   detectó y fixeó el bug de `paths` anidados. Pendiente solo: flota en vivo
   cuando el feed de colejuy no esté stale.
2. **Conectar `/api/hq` al frontend** para la ruta piloto Terminal→Maimará→Tilcara→
   Humahuaca (el dataset no tiene coordenadas de ciudades; geocodificar las 18 una vez).
3. ~~AUTH Google (Supabase)~~ — código mergeado (slice 21); falta config del dashboard: provider Google OAuth, Site URL, y correr `supabase/migrations/001_travesias.sql`.
4. **Curaduría editorial de fotos**: Puna comparte `puna.jpg` (3 lugares), varios NULL
   usan foto de otro destino de su zona (permitido pero provisional).
5. `/como-llegar` multi-servicio (hoy muestra solo la primera opción por destino).

## Workers y modelos (verificado 2026-11-10)

- **Copilot CLI**: el plan solo permite `auto`/`fusion` — todo `--model <explícito>`
  da "not available" (probados claude-*, gpt-*, gemini-*, grok-*, kimi-k3). Fusion
  elige `gpt-6-luna`. `defaultPermissionMode` quedó en `assisted` (~/.copilot).
- **Antigravity** (`agy models`): `gemini-3.8-flash-{low,medium,high}`,
  `claude-sonnet-4-6`, `claude-opus-4-6-thinking`, `gpt-oss-120b-medium`.
  **Pool Claude/GPT-OSS agotado hasta ~2026-11-17**; pool Gemini separado y sano.
- **Grok**: Orca soporta `--agent grok` pero no hay CLI de xAI instalado.
- **Prompt a workers Copilot en terminal**: `--spec` no llega; `slices` lo manda por
  buzón pero Copilot no lo lee solo — hay que mandarlo por `orca terminal send`
  (ver docs/agents/orquestacion.md). Aprobaciones de comandos: Enter en el prompt,
  o `shift+tab` en Antigravity para accept-edits.

## Reanudar

```bash
cd C:/Users/Elect/orca/projects/JujuyGo
git log --oneline -10        # qué mergeó
./slices estado              # estado de slices
cat docs/estado.md           # este archivo
```

## 2026-11-11 (noche) — tracción + LLM + deploy prep

- **Waitlist + analytics en `pitch/index.html`**: form con consentimiento + honeypot, beacon `eventos` (page_view/cta_app/waitlist_signup) via Supabase REST anon; excluye localhost. Requiere `supabase/migrations/002_waitlist_eventos.sql` corrida en dashboard.
- **Capa LLM de yapas**: `backend/src/llm.js` (Gemini AI Studio, timeout 3s, cache, nunca lanza) + `POST /api/yapa/redactar` (max 6 yapas). Frontend las usa solo si vuelven; si no, texto de reglas. `GEMINI_API_KEY` solo en backend/Vercel env. Verificado: sin key devuelve `fuente:"reglas"`.
- **Deploy prep ya commiteado** (`c7875bd`): environment.prod.ts, vercel.json ambos, backend serverless catch-all, pool max 2 + ssl Supabase + CORS_ORIGIN.
- **Pendiente usuario (dashboard)**: importar repo en Vercel (backend primero → URL → environment.prod.ts → frontend), correr migraciones 001-004 backend + 001-002 supabase en SQL Editor, DATABASE_URL pooler :6543, CORS_ORIGIN, Site URL/redirects Supabase, Google OAuth provider, GEMINI_API_KEY opcional.
- **Nota**: el commit f5d1075 barrió artefactos de audit (borró audit-salida/, commiteó frontend/audit-fase0/*.png) — limpieza parcial de higiene; pitch/ PNGs grandes siguen commiteados, pendiente de limpiar.
- Tests: backend 63/63 OK, frontend build OK (warnings de budget).

## 2026-11-12 — DEPLOY PRODUCCION COMPLETO

- **Backend**: https://jujuy-go.vercel.app — Express serverless en Vercel (proyecto `jujuy-go`, root `backend/`). Catch-all real via `api/index.js` + rewrite `/api/:path*` (los brackets `[...slug]` NO funcionan en api/ plano, son feature de Next.js). `/api/health` ok, `/api/lugares` y `/api/travesia/contexto` devuelven datos reales.
- **Frontend**: https://jujuygo-web.vercel.app — Angular prod, apiUrl -> jujuy-go.vercel.app/api.
- **Pitch**: https://yapa-pitch.vercel.app — landing estatica con waitlist + analytics.
- **DB**: Supabase Postgres produccion — migraciones 001-004 backend + seed RN9 corridos; supabase/migrations 001-002 corridas por usuario.
- **Env vars backend**: DATABASE_URL (pooler :6543), SUPABASE_URL, SUPABASE_ANON_KEY, CORS_ORIGIN=https://jujuygo-web.vercel.app — todas production+preview.
- **Gotchas Vercel**: SSO protection viene ON por defecto en teams -> hay que desactivarla por proyecto; env vars sensitive no se pueden renombrar; changes de env requieren redeploy; rootDirectory solo aplica al crear proyecto.
- **Pendiente**: Supabase dashboard Site URL/redirects + Google OAuth provider; resetear password DB (quedo en chat); GEMINI_API_KEY; probar flujo completo desde celu.

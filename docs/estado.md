# Estado actual del proyecto

> Actualizar al cierre de cada ola de slices. Última actualización: 2026-11-11 (cierre de sesión — retomar abajo).

## ⚠️ RETOMAR ACÁ — sesión dormida con 4 slices estéticos EN VUELO

Al guardar, los 4 workers de la pasada estética estaban corriendo en Orca
(run `run_3ce49a5f5e5f`). **Puede que hayan quedado frenados en prompts de
aprobación de Copilot** — al volver: `orca orchestration check --run
run_3ce49a5f5e5f`, aprobar con `orca terminal send --terminal <handle>
--enter` (y `--text $'\x1b[B'` antes para "don't ask again"/"remember path").

| Slice | Dispatch | Terminal | Agente | Estado al dormir |
|---|---|---|---|---|
| 22-estetica-tokens | ctx_54d67f5226c3 | term_8342d777-b4b7-4160-9b3e-8ddae58ede81 | Copilot | chequeos finales |
| 23-estetica-home | ctx_242673c730f7 | term_726076ac-be7f-499e-b727-8f2f80ab09c8 | Copilot | analizando baseline + mock |
| 24-estetica-como-llegar | ctx_4359e8362a6c | term_a54c3529-dba9-44ee-ad4f-814b010b1067 | Antigravity gemini-3.8-flash-high | corriendo tests |
| 25-estetica-detalle-travesia | ctx_43db3d15925f | term_3aaa05f8-01ac-4762-a652-e63c5778988f | Copilot | leyendo archivos |

**Al retomar, por cada worker_done:** `./slices verificar <id>` → subagente
juez escribe `juez.txt` (CIERRA/NO CIERRA) → `verificar` otra vez →
`./slices mergear <id>` → `git push`. Los 4 tocan archivos disjoint
(styles.css global solo en 22; home/, como-llegar/+yapa-mapa/, lugar-detalle/
+travesia/ separados) — mergear en orden 22→23→24→25.

**Audit Fase 0 commiteado** en `frontend/audit-fase0/report.json` — cada
SPEC exige re-correr kero-audit y guardar el "después" en su recibo.

**Pendientes del usuario (no dependen de mí):**
- Supabase dashboard: correr `supabase/migrations/001_travesias.sql` en SQL
  Editor + Google OAuth provider + Site URL `http://localhost:4200` +
  redirect `/**` (sin eso el login no funciona aunque el código esté).
- Hackathon Tren Solar: usuario debe decir formato exacto (pitch/deck/demo/
  video) y deadline; ofrecí preparar demo guiada y pitch.

**Skills de diseño instaladas** (2026-11-11): 19 nuevas en
`~/.agents/skills/` (badesign-skill, frontend-design, emil-*, mobile-native,
typebien, anydesign, break-ui, pick-ui-library, etc.) — detalle y regla de
uso en `docs/agents/orquestacion.md` sección "Skills de diseño instaladas".

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

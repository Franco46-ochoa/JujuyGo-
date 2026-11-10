# Orquestación de JujuyGo

Con cada pedido: **`start`**. Decide la ruta (solo lectura, directo u orquestar) y si hace falta grill. Si es orquestar, sigue `orquestar-slices`.

## Roles

| Rol | Quién | Notas |
|---|---|---|
| Coordinador | **Devin** | Arma el DAG, verifica recibos (`./slices verificar`), decide merges, reporta qué cerró y qué no |
| Worker | **Devin** | Toma **un slice por ola** en paralelo con los workers; al terminar el suyo, verifica los ajenos |
| Workers | **Copilot vía Orca** | `LANZADOR=orca`, `AGENTE_ORCA=copilot` — verificado E2E (smoke test 002) |
| Tareas mínimas | **Kimi** | `EJECUTOR=cmd` + `EJECUTOR_CMD` en `slices.conf`. Pausado: suscripción sin Kimi Code |
| Juez | **Devin con subagente** (`JUEZ="devin"`) | Tras checks verdes, un subagente de solo lectura con contexto fresco juzga SPEC vs diff y escribe `recibos/<id>/juez.txt` (1ª línea `CIERRA`/`NO CIERRA` + un criterio no cubierto por línea); `verificar` lo exige antes de cerrar. Reserva de otro vendor: `JUEZ=claude` cuando `claude -p` vuelva a responder |
| Reserva | `MAX_PARALELO=2` | Un solo plan Copilot. Si se agota: bajar a 1 o pausar workers |

## Checks (slices.conf)

- `tests-front::test ! -d frontend || (cd frontend && npm test -- --watch=false)`
- `tests-back::test ! -d backend || (cd backend && npm test)`

Las carpetas que aún no existen se saltan; cuando aparezcan, `npm test` es obligatorio para cerrar un slice.

## Base de datos por worktree

Postgres 18 local corre en la máquina. Supabase cloud es una sola DB compartida — **sin DB por worktree** mientras el backend no exista.

Regla del repo (cuando haya tests que toquen DB):

- El backend testeable habla Postgres por `DATABASE_URL` (driver `pg`); lo específico de Supabase (Auth, Storage, RLS) se mockea en tests.
- Todo test que escriba a la DB usa prefijo `test_<slice>_` en sus datos y borra lo que crea.
- Los workers solo corren tests unitarios/mockeados; los de integración contra DB real los corre `verificar` (secuencial, nunca en paralelo).

Cuando exista `backend/`: activar en `orca.yaml → scripts.setup` y `PREPARAR` el `createdb "jujuygo_test_<worktree>"` + migraciones (hay bloques comentados listos en ambos archivos). Credenciales Postgres: en `.env` (gitignored, se copia a cada worktree por `.worktreeinclude`).

## Qué skill usar en cada momento

Reconocé el momento y cargá la skill sin esperar a que la nombren.

| Momento | Señal | Skill |
|---|---|---|
| **Al recibir el pedido** | todavía no se eligió la ruta | `start` (solo lectura, directo u orquestar; grill o no) |
| **Antes de partir** | el pedido es difuso, hay decisiones abiertas | `grilling` (o `grill-with-docs` si aparecen términos del dominio) |
| | los términos del dominio se confunden o cambian de nombre | `domain-modeling` |
| | el trabajo no entra en una sesión | `wayfinder` |
| | hay que investigar una API o una doc | `research` (con el modelo chico) |
| | hay una duda de diseño que se resuelve probando | `prototype` |
| | proyecto desde cero / producto | `kero-research` → `kero-scope` → `kero-method` |
| **Partir (el DAG)** | el plan está claro y hay que cortarlo | `to-tickets` → cada ticket se vuelve un `./slices nuevo` |
| | hay que pasar la charla a un SPEC | `to-spec` |
| | llegan issues sin clasificar | `triage` |
| | ¿conviene partir o no? | `kero-orchestrate` |
| **Dentro del slice** (va al SPEC del worker) | comportamiento nuevo con tests | "trabajá con `tdd`" |
| | bug difícil o lentitud | "seguí `diagnosing-bugs`"; el SPEC lleva el repro |
| | cambia la interfaz de un módulo | `codebase-design` |
| | UI | `impeccable` para diseñar; `kero-audit` antes de decir que está listo |
| **Verificar** | llegó un `worker_done` | `./slices verificar` (checks) → subagente-juez escribe `juez.txt` → `verificar` otra vez |
| | dos versiones para elegir | `kero-blind` (que juzgue la persona, sin saber cuál es cuál) |
| **Cerrar** | todo integrado | `code-review-en-loop` → `qa-con-video` si hay UI → `pr` |
| | terminó la sesión | `retro` si algo salió mal dos veces |
| **Cambio de manos** | la sesión se llena o pasa a otro agente | `handoff` |
| | hay pasos que solo puede hacer la persona (credenciales, dashboards) | `wizard` |
| **Orca** | workers, terminales, worktrees | `orchestration` / `orca-cli` |
| **No sé cuál** | | `ask-matt` (router de las de mattpocock) |

El worker no carga skills por su cuenta: si un slice necesita `tdd` o `diagnosing-bugs`, decilo en el SPEC.

## Limitaciones conocidas (verificadas en el setup)

- **Windows / `LANZADOR=local`:** `slices` desacopla con `setsid`, que no existe en Git Bash → `lanzar` queda "cortado a medias" con un `pid` huérfano. Local se corre en primer plano: `./slices _trabajar <id>`. El modo `orca` no lo necesita.
- **`claude` logueado pero `-p` mudo:** auth OK (OAuth firstParty, verificado 2026-11-09) pero `claude -p` se cuelga sin responder → no sirve de juez ni worker hasta que print mode conteste.
- **`worker-start` en modo terminal no entrega el `--spec` como tarea** (verificado 2026-11-09): el agente abre en chat interactivo vacío y termina su turno sin `worker_done`. `lanzar_en_orca` ya manda el puntero a `prompt.txt` por el buzón (`orchestration send`) después del start; si un worker dice "no me dieron tarea", ese send es la cura, no relanzar.
- **`gemini` CLI no sirve de worker:** Google cerró el OAuth individual (migra a Antigravity) y la API key da 403 sin billing.
- **`agy`/Antigravity sí funciona como `--agent antigravity`** (verificado 2026 generador de slices): modelos vía `agy models` → `gemini-3.8-flash-{low,medium,high}`, `claude-sonnet-4-6`, `claude-opus-4-6-thinking`, `gpt-oss-120b-medium`. `worker-start --model <id>` los acepta. Ojo: **cuotas separadas por familia** (Gemini vs Claude/GPT-OSS) y el pool Claude se agota con resets de ~7 días.
- **Copilot CLI solo corre `auto`/`fusion` en este plan:** todo `--model <id>` explícito (claude-*, gpt-*, gemini-*, grok-*, kimi-k3) devuelve "not available". Fusion elige `gpt-6-luna`. `defaultPermissionMode` quedó en `assisted` en `~/.copilot` para reducir aprobaciones.
- **Workers Copilot en terminal necesitan el prompt a mano:** además del buzón, mandar el texto por `orca terminal send --terminal <handle> --text "Leé recibos/<id>/prompt.txt ..." --enter`. Las aprobaciones de comandos se resuelven con `--enter` (Enter = "Yes"); en Antigravity `shift+tab` ($'\x1b[Z') activa accept-edits.
- **`agy`/Antigravity:** cuenta nativa guardada en Orca (`46323573@…`), pero `worker-start --agent agy` da `agent_unconfigured` hasta crear el alias en Settings → Agents.
- **`kimi` sin acceso a Kimi Code:** logueado pero la suscripción no lo cubre; `kimi -p` da auth_error. Pausado salvo upgrade u otro provider en `kimi provider`.
- **Workers de Copilot en Orca piden aprobaciones interactivas** por cada tipo de comando la primera vez (crear archivos, `npm test`, `git`, …): la persona responde "Yes, and don't ask again … in this repo" en la terminal del worker y queda registrado para futuros workers. La primera corrida además carga la "managed account policy" una vez (ya quedó en caché). Alternativa sin prompts: `LANZADOR=local` + `EJECUTOR_CMD='copilot -p "$SLICES_PROMPT" --allow-all-tools'` (headless verificado).

## Cómo se ajusta después

- Roles, modelos, juez, checks: `slices.conf`.
- Setup por worktree (deps, DB): `orca.yaml → scripts.setup` y `PREPARAR`.
- Este archivo documenta las decisiones; editarlo cambia lo que los agentes respetan.

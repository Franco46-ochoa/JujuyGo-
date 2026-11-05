# Orquestación de JujuyGo

Con cada pedido: **`start`**. Decide la ruta (solo lectura, directo u orquestar) y si hace falta grill. Si es orquestar, sigue `orquestar-slices`.

## Roles

| Rol | Quién | Notas |
|---|---|---|
| Coordinador | **Devin** | Arma el DAG, verifica recibos (`./slices verificar`), decide merges, reporta qué cerró y qué no |
| Worker | **Devin** | Toma **un slice por ola** en paralelo con los workers; al terminar el suyo, verifica los ajenos |
| Workers | **Gemini vía Orca** | `LANZADOR=orca`, `AGENTE_ORCA=gemini`. Antigravity como segundo agente si Orca lo acepta |
| Tareas mínimas | **Kimi** | `EJECUTOR=cmd` + `EJECUTOR_CMD` en `slices.conf` (con `SLICES_LANZADOR=local`) |
| Juez | checks + `code-review-en-loop` de Devin | `JUEZ=""`: `claude` no conecta a la API (verificado 2026-11-05). Si aparece un LLM → `JUEZ=claude` (MODELO_JUEZ=haiku) o `JUEZ=jev` |
| Reserva | `MAX_PARALELO=2` | Una sola cuota Google. Si se agota: bajar a 1 o pausar workers |

Copilot queda fuera del loop de workers (el kit no lo soporta como agente); lee `AGENTS.md` desde el IDE.

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
| **Verificar** | llegó un `worker_done` | `./slices verificar` (checks + juez): siempre |
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
- **`claude` sin API** (sin suscripción): no sirve de juez ni de worker hasta que conecte.
- **`kimi` sin login:** `kimi -p` falla con "No model configured" hasta `kimi` → `/login`. Probar `-y` tras el login.
- **Orca `--agent`:** requiere alias de agente configurado en la app (Settings → Agents); `agent_unconfigured` si falta. Workers `gemini`/`agy` además necesitan su CLI instalado y logueado.

## Cómo se ajusta después

- Roles, modelos, juez, checks: `slices.conf`.
- Setup por worktree (deps, DB): `orca.yaml → scripts.setup` y `PREPARAR`.
- Este archivo documenta las decisiones; editarlo cambia lo que los agentes respetan.

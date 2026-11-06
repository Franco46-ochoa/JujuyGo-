# Slice 01 — Andamio monorepo (issue #1)

**Depende de:** nada — es la raíz del DAG.
**Fuente:** GitHub issue #1 (`gh issue view 1`)
**Alcance de archivos:** `frontend/`, `backend/`, `docker-compose.yml`, `slices.conf`, `.env.example` (en cada paquete), `README.md`, `package.json` (raíz, solo si hace falta orquestar scripts)

## Por qué

Sin andamio no hay nada que verificar: los otros 11 issues están bloqueados por este.
Es infraestructura — la hace quien conoce las convenciones, no un worker ciego.

## Qué tiene que pasar

1. `frontend/` — Angular standalone (última estable), TypeScript strict.
   - Página mínima "Yapa" que use los tokens del design system: fondo `--papel #F4EDE3`, texto `--tinta #241610`, Fraunces cargada vía Google Fonts (o fallback serif si offline), nav píldora + footer con wordmark — versión mínima del shell de `docs/design.md`.
   - `npm start` levanta dev server en :4200.
   - `npm test` corre los tests unitarios (al menos uno que verifique que el componente raíz renderiza).
2. `backend/` — Node + Express + TypeScript o JS (lo más simple que el repo tolere; preferir JS con JSDoc si no hay convención).
   - `GET /health` → `{"status":"ok"}` en :3000.
   - `npm test` corre tests del endpoint (supertest o fetch contra servidor levantado en puerto efímero).
   - `npm run migrate` preparado para cuando llegue Postgres (no-op documentado o script real si `docker-compose.yml` ya levanta la DB).
3. `docker-compose.yml` — Postgres 16 con `POSTGRES_DB=jujuygo`, puerto 5432, credenciales dev en `.env.example` (nunca secrets reales).
4. `slices.conf` — actualizar `PREPARAR` y `CHECKS` para que en cada worktree:
   - `frontend/`: `npm ci` + `npm test` (+ `npm run build` si es rápido)
   - `backend/`: `npm ci` + `npm test`
   - `docker-compose` NO se levanta por defecto en checks (los tests no deben requerir DB viva todavía); documentar cómo levantarla.
5. `.env.example` en `frontend/` y `backend/` con las variables necesarias (API URL, DATABASE_URL dev).
6. `README.md` — cómo correr todo local: `docker compose up -d`, `npm start` en cada paquete, URLs.

## Criterios de aceptación

- [ ] `docker compose config` válido (aunque no se levante en checks)
- [ ] `cd frontend && npm test` pasa
- [ ] `cd backend && npm test` pasa
- [ ] `cd backend && npm start` + `curl localhost:3000/health` → ok
- [ ] `./slices verificar` (o el comando de checks equivalente) pasa verde en un worktree limpio
- [ ] `.env.example` sin secrets reales
- [ ] README con instrucciones funcionales

## Fuera de alcance

- Cualquier feature de producto (eso es issues #2+)
- CI en GitHub Actions (se decide después)
- Auth, Supabase cloud real (el docker-compose es dev local; Supabase entra en #12)
- Dockerización del backend/frontend para deploy (eso es #12)

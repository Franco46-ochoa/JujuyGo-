# Yapa — Jujuy como se vive

App de turismo de Jujuy: zonas, lugares, cómo llegar con transporte real,
travesías por fechas e IA que sugiere ("yapas"). Monorepo Angular + Express + Postgres.

## Correr local

```bash
# 1. Backend (Express, :3000)
cd backend && npm install && cp .env.example .env && npm start

# 2. Frontend (Angular, :4200)
cd frontend && npm install && cp .env.example .env && npm start
```

Verificar: `curl http://localhost:3000/health` → `{"status":"ok"}`

## Base de datos (Postgres)

**Opción A — Docker:** `docker compose up -d` (levanta Postgres 16 en :5432)

**Opción B — Postgres nativo** (esta máquina tiene PG 18 corriendo):

```bash
psql -U postgres -f db-setup.sql   # una sola vez, crea rol+db 'jujuygo'
```

`DATABASE_URL=postgres://jujuygo:jujuygo@localhost:5432/jujuygo` (dev only,
ver `backend/.env.example`).

## Tests

```bash
cd backend && npm test      # node --test
cd frontend && npm test     # ng test (vitest, un solo run)
```

## Docs

- `docs/design.md` — sistema de diseño Yapa (fuente de verdad visual)
- `docs/scope.md` — qué hace y qué no hace el producto
- `docs/research.md` — tesis y fuentes
- `AGENTS.md` — convenciones del repo y flujo de slices

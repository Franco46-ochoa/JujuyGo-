# Slice 15 — Red urbana Jujuy: proxy de la API pública de colejuy

**Depende de:** master actual (`f209fff` o posterior — incluye dataset HQ y fix OSRM).
**Alcance:** `backend/src/colejuy.js` (nuevo), `backend/src/routes/urbano.js` (nuevo), `backend/src/index.js` (solo montar el router), `backend/test/urbano.test.js` (nuevo). NO tocar frontend, migraciones, `hq.js`, `transporte.js`, specs, docs.

## Contexto

- `https://colejuy.vercel.app` (proyecto de Franco Durán, jujuy.dev) expone una API JSON
  pública con la red de colectivos urbanos de San Salvador de Jujuy. Es la única fuente
  conocida de líneas urbanas con posiciones en vivo.
- Endpoints verificados (2026-11-10):
  - `GET /api/lines` → `{lines:[{id,number,name,color,operator,live}]}` — 54 líneas
    (39 Santa Ana, 14 El Urbano, 1 sin operador).
  - `GET /api/lines/{id}` → `{line:{...,paths:[{direction,coordinates:[[lng,lat]...]}]}}`
    geometría del recorrido siguiendo calles, por dirección.
  - `GET /api/network` → `{lines:[{id,stops:[{id,name,lat,lng,direction,order}]}]}`
    todas las paradas de todas las líneas (payload grande).
  - `GET /api/fleet` → `{updatedAt,buses:[{id,line,number,lat,lng,speed,course,moving,fresh,age}],stale}`
    posiciones GPS en vivo (snapshot).
  - `GET /api/fleet/live` → SSE. **NO usar en este slice.**
  - `GET /api/geocode?q=` y `GET /api/walk?` existen; fuera de alcance por ahora.
- Es una API de terceros: puede caer, tardar o cambiar. La app nunca debe romperse por ella.

## Qué tiene que pasar

1. `backend/src/colejuy.js`: cliente fino con `fetch` inyectable para tests.
   - Timeout ~5s por request (`AbortSignal.timeout`).
   - Cache en memoria con TTL por endpoint: `lines`/`network` 10 min, `linea/:id` 1 h,
     `fleet` 30 s. No cachear errores ni respuestas no-200.
   - Errores de red/HTTP/timeot → lanzar error tipado o devolver `null` según contrato
     que definás; el router decide el status.
2. `backend/src/routes/urbano.js` montado en `/api/urbano`:
   - `GET /api/urbano/lineas` → proxy de `/api/lines`.
   - `GET /api/urbano/red` → proxy de `/api/network`.
   - `GET /api/urbano/linea/:id` → proxy de `/api/lines/:id`; 404 si la línea no existe.
   - `GET /api/urbano/flota` → proxy de `/api/fleet`.
   - Cada respuesta JSON incluye `fuente: 'colejuy.vercel.app'` y `actualizado_en`
     (ISO del upstream cuando exista, si no el momento de respuesta).
   - Upstream caído/timeout → `502` con `{error: '...'}` claro en español. Nunca 500
     por culpa del upstream.
   - `GET /api/urbano/paradas-cercanas?lat=&lng=&radio_m=` (opcional pero deseable):
     dado un punto, devuelve las paradas de `/api/network` dentro del radio
     (haversine, radio default 500 m, tope 50 resultados, ordenadas por distancia).
     Valida lat/lng numéricos y rango.
3. `backend/src/index.js`: `app.use('/api/urbano', urbanoRouter)` antes del router
   de transporte (mismo patrón que `/api/hq`).
4. Tests en `backend/test/urbano.test.js` con `fetch` mockeado (sin red real):
   - shape de cada endpoint, campo `fuente` presente;
   - cache: segunda llamada no re-fetchea dentro del TTL;
   - upstream 500/timeout → 502;
   - `paradas-cercanas` filtra por distancia y valida params;
   - línea inexistente → 404.

## Criterios

- [ ] `cd backend && npm test` verde (tests nuevos + existentes)
- [ ] `node --check` / sintaxis OK en archivos nuevos
- [ ] Ningún test hace requests reales a colejuy.vercel.app
- [ ] Respuestas siempre incluyen `fuente` (trazabilidad del dato de terceros)
- [ ] Recibo con gaps honestos

## Fuera de alcance

- Frontend (la UI viene en un slice posterior)
- SSE `/api/fleet/live`, auth, favorites, push de colejuy
- Cómo-llegar urbano (matching línea↔paradas↔destino) — slice posterior
- Scraping o recolección propia de posiciones GPS
- NO commitear.

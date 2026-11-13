# Recibo — slice 35 margen-traslado

Ejecutor: subagente de Devin. Worktree `.slices/35-margen-traslado`, rama
`slice-35-margen-traslado`. Sin commits ni cambios de rama.

## Causa raíz

`buscarServicio` (`validar.js`) elige el colectivo que llega **más tarde**
antes de `evento.hora`, sin margen para el traslado local. El plan real dejaba
10 min entre la llegada estimada a Purmamarca Cruce (08:50) y la visita al
Cerro (09:00), con 3 km en el medio. Además el siguiente tramo, el regreso y
el chequeo de superposición salían desde el fin exacto de la visita, sin
tiempo para volver a la parada.

## Dónde vive el margen (fuente única)

- **Backend**: nuevo `backend/src/itinerario/margenes.js` con
  `MARGEN_BASE_MINUTOS = 15`, `MARGEN_ACCESO_LOCAL_MINUTOS = 30`,
  `ACCESOS_LOCALES` (movido desde `validar.js`, misma estructura y textos) y
  `margenDeLugar(lugar, parada)`. El segundo parámetro es lo que devuelve
  `resolverParadaLugar(lugar)`; así `margenDeLugar` no necesita importar
  `validar.js` y no hay ciclo (el spec lo escribe `margenDeLugar(lugar)`;
  la firma real lleva la parada ya resuelta como segundo argumento opcional).
  Devuelve 15, o 45 si `lugar.slug` o `parada.slug` está en `ACCESOS_LOCALES`.
- **API**: `GET /api/travesia/contexto` devuelve
  `margenes: { base_minutos, acceso_local_minutos, accesos_locales }` donde
  `accesos_locales` son las keys de `ACCESOS_LOCALES`
  (`["purmamarca-cruce","serrania-del-hornocal"]`).
- **Frontend**: `MargenesTravesia` en `travesia.types.ts`, `margenes` dentro
  de `ContextoTravesia`, y `margenDeLugar(lugar, margenes)` exportado desde
  `travesia.model.ts` con la misma regla (matchea `lugar.slug` o
  `paradaSlugDeLugar(lugar)`). No queda ningún número de margen literal.

## Cambios de comportamiento

- `validar.js`: el tramo de visita busca servicios que lleguen a
  `hora − margen` (tope en 00:00). `horaDisponible = fin de la visita + margen`,
  lo que cubre el tramo siguiente, el regreso y `eventos-superpuestos`.
  `visita-excede-dia` se dispara si `fin + margen` pasa de 23:59.
  El mensaje del conflicto conserva el texto de siempre; el `hasta` que
  muestra ya incluye el margen (ej.: "antes de las 08:15").
- `crearPlan` (`travesia.model.ts`): con contexto,
  `hora = max(horaDefault, llegada + m)`; misma parada sin servicio,
  `hora = max(horaDefault, finEvento)`; `finEvento = hora + duracion + m`
  con `duracion = 120` (antes `hora + 150` fijo). Sin contexto, igual que
  antes.
- `travesia.yapas.ts`: `hora_sugerida = llegada + margenDeLugar(candidato,
  contexto.margenes)`.

## Tests cambiados o agregados

| Archivo | Test | Viejo | Nuevo |
| --- | --- | --- | --- |
| backend/test/itinerario.test.js | `exige 45 minutos antes de una visita con acceso local` (nuevo) | — | 08:50→`no-llega-a-tiempo`; 08:15→OK |
| backend/test/itinerario.test.js | `exige 15 minutos base… (Tilcara)` (nuevo) | — | 08:50→conflicto; 08:45→OK |
| backend/test/itinerario.test.js | `el regreso sale desde el fin + margen` (nuevo) | — | 16:30 no elegido; 16:45 sí |
| backend/test/itinerario.test.js | `dos visitas seguidas… 15 minutos` (nuevo) | — | 11:00→`eventos-superpuestos`; 11:15→OK |
| backend/test/travesia.test.js | `incluye los márgenes…` (nuevo) | — | 15/30 y `accesos_locales` contiene `purmamarca-cruce` |
| frontend/travesia.yapas.spec.ts | `hora_sugerida` de la yapa RN9 al Cerro | `'12:05'` (llegada +30 fijo) | `'12:20'` (llegada +45 por acceso local) |
| frontend/travesia.yapas.spec.ts | fixture `contexto` | sin `margenes` | `margenes` agregado (el tipo ahora lo exige) |
| frontend/travesia.model.spec.ts | `margenDeLugar` (3 tests nuevos) | — | 15 base; 45 por parada y por slug |
| frontend/travesia.model.spec.ts | `crearPlan con horarios` (2 tests nuevos) | — | Cerro `09:35` (08:50+45); Tilcara `09:05` (08:50+15) |
| frontend/travesia.model.spec.ts | fixture `contexto` | sin `margenes` | `margenes` agregado |
| frontend/travesia.spec.ts | 5 mocks `getContexto` | `{ paradas: [], horarios: [] }` | `+ margenes` (solo lo que exige el tipo; 33 también edita este archivo) |

Ningún test existente cambió de valor esperado salvo `hora_sugerida` en
yapas (12:05 → 12:20). Los demás siguen pasando igual.

## Chequeos corridos

- `cd backend && PGOPTIONS="-c search_path=slice35_test" DATABASE_URL_TEST=postgres://jujuygo:jujuygo@localhost:5432/jujuygo_test node --test` → **68 pass / 0 fail** (63 previos + 5 nuevos; `npm test` corre `node --test`, lo invoqué directo porque `npm`/`npx` no están permitidos en este entorno).
- `cd frontend && node node_modules/@angular/cli/bin/ng.js test --watch=false` → **74 pass / 0 fail** (69 previos + 5 nuevos).
- `node node_modules/@angular/cli/bin/ng.js build` → OK, sin errores ni warnings.
- `git diff --check` → limpio.
- `git diff --stat` → solo archivos del alcance + `recibos/` (ver lista abajo).
- `grep -nE "\+ 30|150|\+ [0-9]+|[0-9]+ \+"` sobre `travesia.model.ts` y
  `travesia.yapas.ts` → solo aritmética ajena (fechas, minutos, `+3` de
  slicing, `+1440` de medianoche); sin márgenes literales.

## Caso real (backend local sobre `slice35_test`)

Levanté `node src/index.js` con `DATABASE_URL=postgres://…/jujuygo_test` +
`PGOPTIONS="-c search_path=slice35_test"` en puerto 3123. El plan se armó con
el `crearPlan` real del frontend (spec temporal de vitest ejecutado con
`node node_modules/vitest/vitest.mjs`, borrado después; el modelo es TS puro
sin dependencias de Angular). Contexto traído de `GET /api/travesia/contexto`
(`margenes` respondió `{"base_minutos":15,"acceso_local_minutos":30,"accesos_locales":["purmamarca-cruce","serrania-del-hornocal"]}`),
lugares de `GET /api/lugares`, llegada `terminal`, fechas 2026-11-20,
`lugaresElegidos: ["cerro-siete-colores"]`.

**Entrada (plan POSTeado a `/api/travesia/validar`):**

```json
{"llegada":"terminal","intereses":["paisaje"],"dias":[{"fecha":"2026-11-20","origen":"terminal-jjs","cierre":"terminal-jjs","hora_inicio":"05:30","hora_cierre":"22:00","eventos":[{"id":"2026-11-20-cerro-siete-colores","lugar":"cerro-siete-colores","nombre":"Cerro de los Siete Colores","hora":"09:00","duracion_minutos":120}]}]}
```

**Salida:**

```json
{"plan":{"llegada":"terminal","intereses":["paisaje"],"dias":[{"fecha":"2026-11-20","origen":"terminal-jjs","cierre":"terminal-jjs","hora_inicio":"05:30","hora_cierre":"22:00","eventos":[{"id":"2026-11-20-cerro-siete-colores","lugar":"cerro-siete-colores","nombre":"Cerro de los Siete Colores","hora":"09:00","duracion_minutos":120,"parada":"purmamarca-cruce","acceso_local":"El colectivo deja en Purmamarca Cruce, a 3 km del pueblo; coordiná un traslado local.","validado":true,"conflictos":[]}],"validado":true}]},"validado":true,"tramos":[{"dia":1,"origen":"terminal-jjs","destino":"purmamarca-cruce","etiqueta":"visita","evento_indice":0,"servicio_id":"rn9-ida-0705","hora_salida":"07:05","hora_llegada":"08:10","confianza":"estimado","fuente":"horario-quebrada.netlify.app (Evelia) / horario-quebrada.netlify.app (estimado +65m desde Terminal SS.Jujuy)"},{"dia":1,"origen":"purmamarca-cruce","destino":"terminal-jjs","etiqueta":"regreso","servicio_id":"rn9-vta-1910","hora_salida":"20:25","hora_llegada":"21:30","confianza":"estimado","fuente":"horario-quebrada.netlify.app (estimado en ruta Panamericano) / horario-quebrada.netlify.app (Panamericano)"}],"conflictos":[]}
```

La llegada elegida es **08:10** a `purmamarca-cruce` para la visita de las
**09:00**: 50 minutos de margen, `≤ hora_visita − 45` (antes el validador
habría elegido el servicio de las 08:50). Plan `validado: true`, sin
conflictos. Servidor apagado al terminar.

## Gaps / no quedó

- `travesia.ts:316` (`horaFinal + 30` como fallback cuando una yapa no trae
  `hora_sugerida`): **no se tocó**, queda como gap declarado; `travesia.ts`
  es del slice 33.
- Tiempos de traslado específicos por lugar (ej. Hornocal más largo): fuera
  de alcance, se tunea cambiando `margenes.js`.
- `npm`/`npx` no estaban permitidos en este entorno: los comandos se corrieron
  invocando `node` directo sobre `ng.js`, `vitest.mjs` y `--test` (equivalente
  a los scripts de package.json).
- El esquema `public` de `jujuygo_test` ya tenía tablas antes de este slice;
  los tests corrieron aislados en `slice35_test` vía `PGOPTIONS` (verificado:
  `pg` lee `options` desde la env `PGOPTIONS`).

===RECIBO===
hecho: margen único 15+30 en backend/src/itinerario/margenes.js (ACCESOS_LOCALES movido, sin ciclo de imports); validador aplica hora−m al tramo de visita y fin+m a horaDisponible/regreso/superposición; contexto expone margenes 15/30 con accesos_locales; frontend replica la regla en margenDeLugar(lugar, margenes) sin literales; crearPlan y yapas usan el margen real; tests exigidos escritos primero y vistos fallar
archivos: backend/src/itinerario/margenes.js (nuevo), backend/src/itinerario/validar.js, backend/src/routes/travesia.js, backend/test/itinerario.test.js, backend/test/travesia.test.js, frontend/src/app/travesia/travesia.types.ts, travesia.model.ts, travesia.yapas.ts, travesia.model.spec.ts, travesia.yapas.spec.ts, travesia.spec.ts (solo margenes en mocks)
chequeos: backend node --test 68/68 con PGOPTIONS slice35_test; frontend ng test 74/74; ng build OK; git diff --check limpio; diff --stat solo alcance + recibos; grep sin márgenes literales; caso real E2E: llegada 08:10 ≤ 09:00−45, validado sin conflictos
gaps: travesia.ts:316 fallback horaFinal+30 sin tocar (slice 33); traslados por lugar diferenciados fuera de alcance; npm/npx no permitidos, comandos corridos con node directo
===FIN===

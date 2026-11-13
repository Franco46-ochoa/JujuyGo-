# Recibo — Slice 31: limpieza de código muerto y refactors menores

**Ejecutor:** Devin (Kimi CLI rechazado por suscripción: "does not have access to Kimi Code" — autorizado por el usuario que Devin tome 31 y 32).

## 1. Código muerto eliminado (con evidencia de 0 usos)

| Símbolo | Archivo | Evidencia |
|---|---|---|
| `CatalogoService.getZona()` | catalogo.service.ts | `grep -rn "getZona(" src/` → solo la definición; la única coincidencia `getZonas` (plural, viva) en home.ts y specs. El tipo `ZonaDetalle` quedó huérfano en catalogo.types.ts (fuera de alcance: types no estaba en la lista). |
| `UrbanoService.getParadasCercanas()` | urbano.service.ts | `grep` → 0 llamadas; el endpoint backend `/api/urbano/paradas-cercanas` sigue existiendo pero el frontend no lo consume (la lógica vive en `paradasCercanas` de urbano-ruteo). Imports `HttpParams` y `UrbanoParadasCercanas` eliminados (este último quedó huérfano en urbano.types.ts, fuera de alcance). |
| `horaFuente()` (wrapper trivial) | como-llegar.ts/html | **No era código muerto**: el spec lo listó por error — se usaba en `como-llegar.html:118`. Como era un wrapper sin lógica (`return servicio.fuente`), se inlineó en el template (`{{ servicio.fuente }}`) y se eliminó el método. Comportamiento idéntico. |

## 2. Funciones puras extraídas a `urbano-ruteo.ts`

Movidas verbatim desde `como-llegar.ts` (614 → ~495 líneas):
- `distanciaMetros` — **deduplicada**: ya existía idéntica en urbano-ruteo.ts; ahora es `export` y el componente la importa.
- `coordenadasValidas` — mismo caso: existía privada en ruteo; exportada, copia del componente eliminada.
- `nombreLinea`, `buscarLineasCandidatas`, `paradasCercanas` — movidas tal cual.
- Interfaces `ParadaConDistancia`/`LineaCandidata`/`ParadaCercana` → consolidadas en `UrbanoParadaConDistancia` (ya existía, idéntica), `UrbanoLineaCandidata`, `UrbanoParadaCercana` exportadas.
- `RADIO_PARADA_METROS`/`RADIO_TIERRA_METROS` del componente eliminadas (la primera vive ahora en ruteo; la segunda ya existía ahí).
- Quedan en el componente: `puntoValido`, `dentroDelAreaUrbana`, `BBOX_URBANO_SSJ` (usan estado/constantes propias).

`como-llegar.ts` pasó de 614 a ~495 líneas; `urbano-ruteo.ts` quedó como módulo puro testeable (ya tiene `urbano-ruteo.spec.ts`).

## 3. Suscripciones — revisión del ciclo de vida

Las solicitudes HTTP completan o fallan, pero pueden responder después de destruir el componente. En particular, la validación iniciaba solicitudes adicionales de transporte desde su callback. Se agregó `takeUntilDestroyed` a la validación y al `forkJoin` de transporte para cancelar esa cadena al salir. No se aplicó indiscriminadamente al resto.

- `travesia.ts:91` `catalogo.getLugares()` — HTTP GET one-shot → no.
- `travesia.ts:101` `travesia.getContexto()` — HTTP GET one-shot → no.
- `travesia.ts:291` `travesia.redactarYapas()` — HTTP POST one-shot → no.
- `travesia.ts` `travesia.validar()` — HTTP POST; su callback inicia más consultas → se cancela al destruir.
- `travesia.ts` `forkJoin(getProximos…)` — solicitudes hijas de validación → se cancelan al destruir.
- `travesia.ts:79` `effect()` — los effects se limpian solos con el ciclo de vida → no aplica.
- `home.ts:59,75,90,105` — los 4 son HTTP GET one-shot → no.
- `como-llegar.ts` — ya usaba `takeUntilDestroyed` en todos los subscribes (paramMap incluido) → sin cambios.

Las demás solicitudes son finitas, pero sus callbacks aún pueden ejecutarse después del destroy; se conserva ese comportamiento preexistente y queda como riesgo, no como garantía de que no emiten.

## 4. `window.confirm` en travesia.ts:476 — PENDIENTE (documentado)

El reemplazo por confirm inline requiere tocar `travesia/travesia.html` (botón en línea 42), que **no está en el alcance de archivos del spec** (lista: catalogo.service, urbano.service, como-llegar.ts/html, travesia.ts, home.ts). Un confirm inline mínimo viable sería un botón de dos pasos ("Borrar" → "¿Confirmar?") con signal `confirmandoBorrarId`, ~15 líneas de TS + ~8 de HTML + algo de CSS. **Queda como pendiente para un slice futuro** que incluya travesia.html; no se amplió el alcance en silencio.

## Archivos tocados

- `frontend/src/app/catalogo.service.ts` −6/+1
- `frontend/src/app/urbano.service.ts` −14/+2
- `frontend/src/app/como-llegar/urbano-ruteo.ts` +89 (funciones exportadas + interfaces)
- `frontend/src/app/como-llegar/como-llegar.ts` −122/+~15 (neto −107)
- `frontend/src/app/como-llegar/como-llegar.html` 1 línea
- `frontend/src/app/travesia/travesia.ts` cleanup de validación y transporte.

`home.ts` quedó sin tocar. `catalogo.types.ts`/`urbano.types.ts` tampoco (fuera de alcance; tipos huérfanos declarados arriba).

## Comandos y resultados

- `grep` de cada símbolo borrado en `src/` → 0 referencias (solo declaraciones de tipo huérfanas en .types, fuera de alcance)
- `npx tsc --noEmit -p tsconfig.app.json` → limpio
- `npm test -- --watch=false` → **69/69 tests, 12 archivos**, repetido después del cambio de ciclo de vida.
- `npm run build` → OK, repetido después del cambio de ciclo de vida.
- `git diff HEAD --check -- frontend` → limpio tras el cambio.
- `git diff HEAD --stat -- frontend` → 6 archivos, +107/−135.
- `./slices verificar 31-limpieza-codigo` tras la corrección: checks raíz y frontend OK (69/69), backend OK (63/63), pero NO CIERRA porque el dictamen anterior ya no aplica al diff actualizado.
- El backend corrió en el esquema aislado `slice31_20261113_test` de la base local de pruebas. El primer intento falló por una carrera de migración en el esquema recién creado; el segundo pasó. Ambos logs se conservan. El esquema no se eliminó.
- Falta un dictamen independiente sobre el diff actualizado; el dictamen anterior revisó únicamente la versión de cinco archivos.

## Gaps

- `window.confirm` pendiente (necesita travesia.html, fuera de alcance).
- Tipos huérfanos `ZonaDetalle` y `UrbanoParadasCercanas` en los .types (borrables en limpieza futura de types).
- Sin screenshots: slice sin cambios visuales (solo refactor + 1 interpolación de template idéntica).
- No se agregó un test de destroy: `travesia.spec.ts` no figura entre los archivos permitidos. Queda como brecha de regresión.

===RECIBO===
hecho: eliminados getZona, getParadasCercanas y wrapper horaFuente; extraídas funciones puras a urbano-ruteo; cancelada al destruir la cadena de validación y carga de transporte.
archivos: frontend/src/app/catalogo.service.ts, frontend/src/app/urbano.service.ts, frontend/src/app/como-llegar/urbano-ruteo.ts, frontend/src/app/como-llegar/como-llegar.ts, frontend/src/app/como-llegar/como-llegar.html, frontend/src/app/travesia/travesia.ts
chequeos: frontend 69/69, backend 63/63, build OK y diff HEAD --check -- frontend limpio tras la corrección; juez pendiente para el diff actualizado.
gaps: falta test de destroy fuera del alcance de archivos; callbacks de otras solicitudes finitas pueden ejecutarse tras destroy; window.confirm y tipos huérfanos pendientes.
===FIN===

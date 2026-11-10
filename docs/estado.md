# Estado actual del proyecto

> Actualizar al cierre de cada ola de slices. Última actualización: 2026-11-10.

## Master

`4a4f5b0`+ (slice 18 mergeado) — pusheado a `origin/master`. `./slices estado` muestra los 13 slices en `mergeado`.

## Qué hay nuevo en master (esta sesión)

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
3. **AUTH Google (Supabase)** + SAV: sin `SUPABASE_URL`/`SUPABASE_ANON_KEY` en `.env`.
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

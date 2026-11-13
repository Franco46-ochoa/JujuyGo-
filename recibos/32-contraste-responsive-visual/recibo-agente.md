# Recibo — slice 32 contraste-responsive-visual

Ejecutor: Devin. Worktree `.slices/32-contraste-responsive-visual`, base `33e0b66`. Master pasó a `a9ff60e` con el slice 31, que no modificó CSS (`git diff --stat 33e0b66 a9ff60e -- '*.css'` está vacío).

## Archivos (solo CSS del alcance)

- `frontend/src/app/travesia/travesia-plan.css`
- `frontend/src/app/home/home.css`: solo reglas `.zone-*`
- `frontend/src/app/yapa-mapa/yapa-mapa.component.css`: solo `.yapa-route-*`
- `travesia.css` no necesitó cambios.

## Reglas por archivo

**travesia-plan.css**
- `.dia-activo .yapa-kicker { color: #E8C98F }`: ocre claro local.
- `.dia:not(.dia-activo) .yapa-kicker { color: #7A5A1E }`: ocre oscuro local.
- Las dos reglas dependen del tipo de día y no de su posición, porque la yapa puede caer en cualquier `diaIndex`.
- `.agregar-lugar .boton-secundario`: habilitado en `var(--tinta)`, con subrayado y offset de 4px.
- `.agregar-lugar button:disabled`: `var(--t60)`, sin subrayado y con `cursor: not-allowed`. No usa opacidad.
- `.boton-principal:disabled`: fondo transparente, `box-shadow: inset 0 0 0 1px var(--t30)`, `var(--t60)` y `cursor: not-allowed`. Reemplaza la regla compartida `opacity: .5`.
- Reglas dentro de `.dia-activo`:
  - Separador: `rgba(papel, .55)`.
  - Label: `rgba(papel, .86)`.
  - Select: borde `rgba(papel, .6)` y texto `var(--papel)`.
  - Foco del select y del botón: `outline-color: var(--papel)`.
  - "Agregar" habilitado: `var(--papel)`.
  - "Agregar" deshabilitado: `rgba(papel, .8)`.
- `.agregar-lugar option { color: var(--tinta) }` quedó igual.
- Hover, tras la revisión del juez: `travesia-motion.css` (0-3-0) pisaba los estados deshabilitados y daba ~1.8:1 en "Agregar" sobre verde. Sin tocar ese archivo, agregué en `travesia-plan.css`:
  - `.travesia-shell .boton-principal:disabled:hover { background: transparent; transform: none }`
  - `.travesia-shell .agregar-lugar button:disabled:hover { color: var(--t60) }`
  - `.travesia-shell .dia-activo .agregar-lugar .boton-secundario:hover { color: var(--ocre) }`
  - `.travesia-shell .dia-activo .agregar-lugar button:disabled:hover { color: rgba(papel, .8) }`
- Resultados en hover, guardados en `hover.txt` (script ad hoc):
  - "Armar con mis lugares" deshabilitado: 5.31:1.
  - "Agregar" deshabilitado sobre verde: 6.02:1.
  - "Agregar" deshabilitado sobre papel: 5.31:1.
  - "Agregar" habilitado sobre verde: 4.87:1.
  - No medí "Agregar" habilitado sobre papel: mantiene el `--oxido` previo, unos 4.56:1 calculados.

**home.css (`.zone-*`)**
- `.zone-card`: pasó de `display:block` a una columna flex con `justify-content:flex-end`.
- `.zone-card:not(.zone-card-large)`: `aspect-ratio:1.618/1; min-height:0` pasó a `min-height:265px`.
  - Primero probé `aspect-ratio` con `min-height:min-content`, pero en los tres anchos la proporción seguía fijando la altura.
- `.zone-content`: dejó de estar en `position:absolute` y quedó en flujo, con `position:relative; padding:60px 24px 24px`.
  - El padding superior reserva el lugar de `.zone-arrow`.
  - En `@media (max-width:620px)` el padding es `56px 20px 20px`.
- El degradado `::after`, la imagen absoluta, la flecha y la grilla de desktop quedaron igual.
  - En desktop sigue la tarjeta grande a la izquierda y tres a la derecha.
  - Las tarjetas chicas de 1440 quedan algo más altas que antes porque ahora entra todo el texto.
- No usé `line-clamp`.

**yapa-mapa.component.css (`.yapa-route-*`)**
- `.yapa-route-div-icon`: `display:flex; align-items:center; justify-content:center; overflow:visible`.
- `.yapa-route-pin`:
  - Agregué `flex:none`, `max-width:min(260px, 70vw)`, `text-align:center` y `white-space:normal`.
  - Quité `max-width:152px`, `overflow:hidden`, `text-overflow:ellipsis` y `white-space:nowrap`.
- `.yapa-pin`, `.yapa-cluster-pin` y `.yapa-div-icon` quedaron igual.

## Decisión sobre `.boton-principal:disabled`

Se separó de la regla del botón "Agregar". Además se rediseñó con borde interior y `--t60` sobre papel, en lugar de conservar `opacity:.5`.

La versión anterior medía 3.76:1. La nueva mide 5.31:1, así que el botón sigue legible sin dejar de verse deshabilitado.

## Método de contraste

Script propio: `medir-32.mjs`, en esta carpeta.

1. Carga el build de producción de cada versión en Chrome con playwright-core.
2. Toma el color computado del texto, del borde o del outline.
3. Aplica el alfa y la opacidad acumulada del elemento y de sus ancestros.
4. Compone esa pila de `background-color` sobre un lienzo blanco.
5. Calcula la relación WCAG 2.x.
6. Marca los fondos con imagen y no los puntúa. En el planificador no hubo.

El script también mide:
- texto de las tarjetas que se sale de su borde;
- superposición de la flecha con el texto;
- pins recortados, fuera del mapa o descentrados;
- scroll horizontal;
- errores de consola.

Detalles de la medición:
- La API de producción solo permite el origen `jujuygo-web.vercel.app`. El script reenvía las respuestas reales agregando CORS para localhost; los datos llegan sin cambios.
- En esta corrida la yapa real cayó en el día activo. Para medir `.yapa-kicker` en los dos fondos, el script clona su tarjeta en un día sobre papel, con el atributo de encapsulación de Angular, y así se aplica el CSS real.
- El clon modifica solo el DOM de la página medida. Se ve en `travesia-dia-papel-*`.

## Tabla de contraste

Mínimo AA: 4.5:1. Resultados iguales en 1440 y 390.

| Elemento | Fondo | Antes | Después |
|---|---|---|---|
| Label "Sumar un lugar al día" | verde | 1.54:1 | 6.67:1 |
| Select "Elegí del catálogo" | verde | 1.81:1 | 8.35:1 |
| "Agregar" deshabilitado | verde | 1.26:1 | 6.02:1 |
| "Agregar" deshabilitado | papel | 2.06:1 | 5.31:1 |
| `.yapa-kicker` | verde (tarjeta #425644) | 3.97:1 | 4.97:1 |
| `.yapa-kicker` | papel (tarjeta #eee4d3) | 1.58:1 | 5.05:1 |

Filas adicionales:

| Elemento | Antes | Después | Mínimo |
|---|---|---|---|
| `.boton-principal:disabled` | 3.76 | 5.31 | 4.5 |
| Borde del select, activo | 1.25 | 4.15 | 3 |
| Separador, activo | 1.10 | 3.76 | 3 |
| Outline de foco del select, activo | 1.82 | 8.35 | 3 |
| "Agregar" habilitado, activo | 1.54 | ≥8 | 4.5 |
| "Agregar" habilitado, papel | 5.31 | ≥15 | 4.5 |

- Antes cumplían 6 de 28 mediciones.
- Después cumplen 28 de 28.
- Los datos completos están en `antes/medicion.json` y `despues/medicion.json`.

## Responsive y mapa

**Tarjetas de regiones**
- Antes fallaban:
  - En 390: Puna, porque el nombre quedaba fuera de la tarjeta y la flecha pisaba la descripción; Yungas, porque el nombre y la descripción quedaban fuera y la flecha pisaba texto.
  - En 768: Puna, Yungas y Valles.
- En 1440 ya estaban bien.
- Después: bien en 390, 768 y 1440.

**Pins del mapa**
- Antes, "Terminal de Ómnibus SS.Jujuy" medía 186/150 y "Cerro de los Siete Colores" 170/150: los dos nombres quedaban recortados.
- Después se ven completos, centrados y dentro del mapa en desktop y móvil.

**Scroll y consola**
- No hay scroll horizontal en ninguna pantalla medida: travesía, home en 1440, 768 y 390, y cómo llegar en desktop y móvil.
- No hay errores de consola.

## Capturas

Las capturas están en `antes/`, tomadas del build de la base, y en `despues/`, tomadas del build del worktree. Son locales; no son de producción.

Cada carpeta tiene:
- `travesia-dia-activo-{deshabilitado,habilitado}-{desktop,mobile}.png`
- `travesia-dia-papel-{deshabilitado,habilitado}-{desktop,mobile}.png`
- `home-regiones-{1440,768,390}.png`
- `como-llegar-mapa{,-zoom}-{desktop,mobile}.png`

La barra fija de navegación aparece encima en algunas capturas de elemento. Es un artefacto de captura y también pasa en `antes/`.

## Chequeos

- `cd frontend && npm test -- --watch=false`: 69/69. No modifiqué tests.
- `npm run build`: OK, sin aviso ni error de presupuesto.
- `git diff --check`: limpio.
- `git diff --stat`: solo los tres CSS del alcance, más evidencia en `recibos/`.
- Revisé cada línea agregada o quitada en `home.css` y `yapa-mapa.component.css`: todas pertenecen a `.zone-*` o `.yapa-route-*`.
- `kero-audit` sobre el build local: 5 de 6 pantallas OK. La salida está en `kero-audit/`.
  - `/` en 1440 dio FAIL por 9 avisos de bajo contraste de estado: 4.15 en hover de `.place-*`, en la barra lateral del mapa de home.
  - Está fuera de alcance y quedó registrado en `docs/pendientes-auditoria-visual.md`.

===RECIBO===
hecho: contraste del planificador (seis filas del spec ≥4.5, más bordes, separador y foco ≥3), disabled de "Agregar" y de .boton-principal sin opacidad y legibles, tarjetas de regiones con altura según contenido y flecha reservada en 390/768/1440, pins de recorrido con nombre completo y centrados
archivos: frontend/src/app/travesia/travesia-plan.css, frontend/src/app/home/home.css (.zone-*), frontend/src/app/yapa-mapa/yapa-mapa.component.css (.yapa-route-*)
chequeos: frontend npm test 69/69; npm run build OK sin presupuesto; git diff --check limpio; diff --stat solo CSS del alcance; medir-32.mjs 28/28 contraste, zonas OK, pins OK, sin scroll horizontal, 0 errores de consola; kero-audit 5/6 (el fallo es .place-* fuera de alcance)
gaps: capturas locales, no de producción (la verificación de producción se hace después del push); yapa sobre papel medida con un clon de DOM porque la yapa real cayó en el día activo; kero-audit marca hover .place-* 4.15:1, texto de 13.33px en la barra lateral, áreas táctiles de la atribución de Leaflet y movimiento con reduced-motion en home, todo fuera de alcance; el pin "Purmamarca Cruce" queda tapado por el de destino en desktop (requiere .ts, fuera de alcance); sin verificación en hardware móvil real
===FIN===

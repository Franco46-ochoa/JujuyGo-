# Slice 32 — Contraste del planificador, tarjetas de regiones y etiquetas del mapa

**Depende de:** 29 (lanzar recién después de que 29 esté mergeado; ver
"Solapamiento"). OJO: `./slices` solo reconoce ids de 3 dígitos en esta
línea (`\b[0-9]{3}\b`), así que con ids de 2 dígitos el orden NO se
aplica solo: lo tiene que respetar el coordinador a mano.

**Fuente:** Franco, 12-nov, tras la auditoría visual de Devin sobre
producción (`https://jujuygo-web.vercel.app`, build `main-YOSN5ICB.js`,
desktop 1440×900 y móvil 390×844): "Corregir los contrastes del
planificador, incluyendo controles deshabilitados, etiquetas y
selectores. Cumplir WCAG AA cuando corresponda. Corregir el diseño
responsive de las tarjetas de regiones en Home, especialmente Yungas y
Puna. Corregir el recorte de etiquetas del mapa en Cómo llegar."

**Alcance de archivos (solo CSS):**
`frontend/src/app/travesia/travesia.css`,
`frontend/src/app/travesia/travesia-plan.css`,
`frontend/src/app/home/home.css` (SOLO selectores `.zone-*`),
`frontend/src/app/yapa-mapa/yapa-mapa.component.css` (SOLO selectores
`.yapa-route-*`).
NO tocar: ningún `.html`, ningún `.ts`, `styles.css`, `angular.json`,
`index.html`, backend, datos.

## Solapamiento con slices en ejecución (revisado contra los specs)

| Slice | Qué toca | Choque con 32 |
|---|---|---|
| 27 yapas-copy | `travesia.html`, `travesia.ts`, `travesia.types.ts`, `home.html` | Ninguno: 32 no toca HTML/TS. La etiqueta "Tu yapa · …" cambia de texto en 27 y de color en 32. |
| 28 lazy-loading | `app.routes.ts`, `yapa-mapa.component.ts`, `index.html`, `angular.json` | Ninguno si 32 respeta "solo CSS". Por eso el punto 3 se resuelve SIN tocar `iconSize` en el `.ts`. |
| 29 navegación/a11y | `home.html`, `home.ts`, "CSS de componentes" (sin lista cerrada) | **Posible** en `home.css` y en CSS de travesía/mapa. Por eso 32 espera a 29. |
| 30 copy-home | `home.html`, `home.css` (solo tipografía del hero) | Bajo: selectores distintos. Si 30 corre en paralelo, 32 no toca `.hero*`. |

Si el coordinador confirma que 29 no modificó `home.css`,
`travesia*.css` ni `yapa-mapa.component.css`, 32 puede salir antes.

## Por qué

La app funciona, pero tres cosas se ven rotas o ilegibles en producción:

1. En el plan de travesía, el bloque "Sumar un lugar al día" usa colores
   oscuros pensados para fondo papel (`--t60`, `--tinta`) también dentro
   del día activo, que tiene fondo `--verde`. No hay override
   `.dia-activo .agregar-lugar …`. Además los botones deshabilitados
   bajan con `opacity: .5` (`travesia-plan.css:25`).
2. En home, `.zone-card:not(.zone-card-large)` fija
   `aspect-ratio: 1.618 / 1` y `.zone-content` va en `position: absolute`
   anclado abajo. Cuando el texto es más alto que la tarjeta se sale por
   arriba y `overflow: hidden` lo corta.
3. En el mapa de Cómo llegar, `.yapa-route-pin` tiene `max-width: 152px`,
   `overflow: hidden` y `justify-content: center`: el texto largo se
   corta de los dos lados y `text-overflow: ellipsis` no aplica.

## Evidencia medida (antes)

Contraste calculado sobre los colores renderizados (mínimo AA: 4.5:1
para texto normal):

| Elemento | Dónde | Hoy |
|---|---|---|
| "Sumar un lugar al día" (label) | día activo, fondo verde | 1.54:1 |
| "Elegí del catálogo" (select) | día activo, fondo verde | 1.81:1 |
| "Agregar" deshabilitado | día activo, fondo verde | 1.26:1 |
| "Agregar" deshabilitado | días sobre papel | 2.06:1 |
| "Tu yapa · …" (`.yapa-kicker`, `--ocre`) | día activo, fondo verde | 3.97:1 |
| "Tu yapa · …" (`.yapa-kicker`, `--ocre`) | día sobre papel | ~1.58:1 (calculado desde el CSS, no observado: verificar moviendo la yapa a un día no activo) |

Tarjetas de regiones: en móvil 390 px el título "Yungas" queda cortado
arriba y solo se ve desde "…distinta al resto de la provincia"; en
"Puna" la flecha ↗ pisa la descripción ("grandes distancias"). En
desktop 1440 px el título "Yungas" queda pegado al borde superior.

Mapa (`/como-llegar/cerro-siete-colores`): se lee "erro de los Siete
Colore" y "minal de Ómnibus SS.Ju" (el `span` mide 152 px y el texto
170 px y 186 px).

## Qué tiene que pasar

### 1. Contraste del planificador (prioridad alta)

1. Dentro de `.dia-activo`, el label, el select (texto y borde) y el
   botón "Agregar" de `.agregar-lugar` usan colores claros derivados de
   `--papel` y llegan a ≥ 4.5:1 sobre `--verde`. El borde del select y
   el separador superior llegan a ≥ 3:1. Seguir el patrón que ya existe
   en el archivo (`.dia-activo .evento-detalle p` → `rgba(244,237,227,.86)`,
   `.mover-evento select` → `currentColor`). Referencia: `--papel` sobre
   `--verde` da 8.3:1; al 86 % da 6.7:1.
2. El `<option>` desplegado sigue siendo legible (hoy
   `.agregar-lugar option { color: var(--tinta) }` sobre fondo nativo
   claro: mantenerlo).
3. Botón "Agregar" deshabilitado: el texto llega a ≥ 4.5:1 en los dos
   fondos (verde y papel). El estado deshabilitado se comunica sin
   bajar la opacidad del texto por debajo de ese mínimo: por ejemplo
   `cursor: not-allowed` + color apagado que igual cumpla, o sin
   subrayado/borde punteado. WCAG exime a los controles deshabilitados,
   pero el pedido explícito es que sigan siendo legibles.
4. `.boton-principal:disabled` comparte hoy la regla de `opacity: .5`:
   separarla para no cambiar su aspecto, o medirla y dejarla en ≥ 4.5:1
   también. Decir en el recibo qué se eligió.
5. `.yapa-kicker` llega a ≥ 4.5:1 en día activo (verde) y en día sobre
   papel. Caso borde: la yapa puede caer en cualquier día
   (`sugerencia.diaIndex`), no solo en el primero.
6. El foco visible (`outline: 2px solid var(--oxido)`) del select y del
   botón sigue viéndose sobre verde; si no llega a 3:1 contra el verde,
   usar `--papel` u `--ocre` para el outline solo dentro de `.dia-activo`.

### 2. Tarjetas de regiones en home (prioridad media)

1. En 390 px, 768 px y 1440 px las cuatro tarjetas muestran completo:
   nombre, descripción, datos (altitud + lugar) y "cómo llegar". Nada
   cortado por el borde superior.
2. La flecha `.zone-arrow` no se superpone con ningún texto en ninguno
   de los tres anchos.
3. La altura de la tarjeta se adapta al contenido (por ejemplo
   `min-height` en vez de proporción fija, o contenido en flujo con
   `justify-content: flex-end`, y `padding-right`/`padding-top` que
   reserve el lugar de la flecha). Elegir lo más simple.
4. Caso borde: tiene que aguantar el texto más largo del catálogo actual
   (Yungas, 4 líneas de "cómo llegar" en móvil) sin depender de truncar.
   No usar `line-clamp` para esconder información de transporte.
5. Se mantiene el degradado oscuro bajo el texto y el contraste del
   texto blanco sobre la foto.
6. En desktop se conserva la composición: tarjeta grande a la izquierda
   y tres a la derecha.

### 3. Etiquetas del mapa en Cómo llegar (prioridad media)

1. Los pins de recorrido (`.yapa-route-pin`) muestran el nombre
   completo: "Cerro de los Siete Colores" y "Terminal de Ómnibus
   SS.Jujuy" enteros, en desktop y móvil.
2. El pin queda centrado sobre su coordenada. Solución ya probada sobre
   producción inyectando CSS, sin tocar el `.ts`:
   `.yapa-route-div-icon { display: flex; justify-content: center; align-items: center; overflow: visible; }`
   y `.yapa-route-pin { max-width: none; flex: none; }`. Con eso los
   pins miden 193 px y 223 px y quedan centrados en el contenedor de
   152 px. Adaptarla con el `:host ::ng-deep` que ya usa el archivo.
3. Caso borde: un nombre muy largo no debe salirse del mapa en 390 px.
   Si hace falta, `max-width` relativo (por ejemplo `min(260px, 70vw)`)
   con `white-space: normal` y salto a dos líneas; nunca recortar por
   los dos lados.
4. No cambia el comportamiento de los pins del catálogo ni de los
   clusters (`.yapa-pin`, `.yapa-cluster-pin`) en home y detalle.

## Reglas

- Estilos locales en los CSS del alcance. No crear ni modificar tokens
  en `styles.css`. Si algún punto no se puede resolver sin un token
  nuevo, NO hacerlo: anotarlo como gap en el recibo.
- No modificar funcionalidad, datos, textos ni estructura HTML.
- Mantener lo que ya cumple: áreas táctiles ≥ 44 px, `:focus-visible`,
  `prefers-reduced-motion`, tamaño mínimo de texto 14 px.
- `home.css` está cerca del presupuesto `anyComponentStyle` (20 kB
  aviso, 22 kB error): no agregar CSS de más y no tocar `angular.json`.
- UI: cargar `impeccable` y `badesign-skill`; `kero-audit` antes de dar
  por listo; `mobile-native` para el caso táctil.

## Tests exigidos

No hay comportamiento nuevo, así que no se exigen tests unitarios
nuevos. Los existentes tienen que seguir pasando sin modificarse
(`travesia.spec.ts`, `home.spec.ts`, `yapa-mapa.component.spec.ts`).

## Criterios de aceptación

- [ ] Pasan los chequeos de `slices.conf`
      (`cd frontend && npm test -- --watch=false`).
- [ ] `npm run build` OK, sin error de presupuesto.
- [ ] `git diff --check` limpio.
- [ ] `git diff --stat` muestra solo archivos `.css` del alcance.
- [ ] Tabla de contraste antes/después en el recibo para las seis filas
      de "Evidencia medida", todas ≥ 4.5:1, con el método usado (axe,
      Lighthouse o cálculo sobre colores computados).
- [ ] Capturas antes/después en `recibos/32-contraste-responsive-visual/`
      (`antes/` desde master, `despues/` desde el worktree), en desktop
      1440×900 y móvil 390×844, de:
      plan de travesía con día activo y con un día sobre papel
      (incluyendo "Sumar un lugar al día" con el botón deshabilitado y
      habilitado); sección de regiones de home (más 768 px); mapa de
      `/como-llegar/cerro-siete-colores` con el recorrido dibujado.
- [ ] Sin scroll horizontal en ninguna de esas pantallas en 390 px.
- [ ] Recibo con: reglas agregadas por archivo, decisión sobre
      `.boton-principal:disabled`, y gaps.

## Fuera de alcance

- Contrastes menores registrados aparte: flechas `.place-arrow` de home
  (2.01:1) y botón "Ver recorrido" deshabilitado (4.2:1). Ver
  `docs/pendientes-auditoria-visual.md`.
- Pin "Purmamarca Cruce" tapado por el pin de destino en el mapa
  (requiere lógica en el `.ts`).
- Peso de las fotos, `srcset`, WebP/AVIF (se coordina con el slice 28).
- Marca JujuyGo / Yapas (tarea de branding separada).
- Presentación de alojamientos y guías "Pendiente de verificar".
- Redirección silenciosa de rutas inexistentes (slice 29).
- Rediseño general, cambios de tokens, copy.

# Recibo — Slice 33: Deuda a11y mapa (hover, pin cruce, borrado inline, tipos)

===RECIBO===

## Hecho

### 1. Contraste en hover de pins y clusters (`yapa-mapa.component.css`)

- En el bloque `@media (hover: hover) and (pointer: fine)` (líneas ~63-79) el
  `color` del texto en hover pasó de `var(--oxido)` (#B5492A, 4.15:1 sobre
  `--arena` #EDE2D0) a `#8F3A21` (óxido oscuro definido localmente, sin token
  nuevo). Aplica a `.leaflet-bar a:hover`, `.yapa-cluster-pin:hover`,
  `.yapa-marker-pin:hover` y `.yapa-popup-link:hover`, igual que antes.
- El borde del pin en hover sigue en `--oxido` (regla separada, sin tocar).
- Cálculo WCAG 2.x a mano: #8F3A21 sobre #EDE2D0 = **5.87:1** (antes
  #B5492A = 4.15:1, coincide con el valor del kero-audit). Pendiente medición
  en navegador real (ver GAPS).
- No se tocaron los estados no-hover, `.yapa-pin-active` ni el `:focus-visible`
  del zoom (fuera del rango indicado por el spec).

### 2. Pin "Purmamarca Cruce" debajo de su coordenada (`yapa-mapa.component.ts` + `.css`)

- En `renderRoute()` (creación de `divIcon` de `rutaPuntos`), los puntos con
  `tipo === 'cruce'` usan `iconAnchor: [76, -26]` → la etiqueta (152×44) queda
  ~26px debajo de la coordenada y despeja el alto del pin del destino
  (Purmamarca, 3 km al oeste, casi misma latitud). Origen/destino/paradas
  siguen centrados (`[76, 22]`).
- **Extensión del coordinador tras medir**: el script detectó intersección
  real `["Tilcara","Pucará de Tilcara"]` en `/como-llegar/pucara-de-tilcara`
  (1440 y 390) — la parada intermedia tipo `parada` sufría el mismo solape
  que el cruce. El anclaje se generalizó: todo punto que no sea `origen` ni
  `destino` (`cruce` y `parada` → `.yapa-route-stop`) ancla debajo con
  `[76, -26]`; origen y destino siguen centrados (`[76, 22]`).
- `.yapa-route-crossing` y `.yapa-route-stop` sumaron `position: relative` y
  un `::before` triangular (`bottom: calc(100% - 1px)`, centrado) que apunta
  hacia arriba, a la coordenada — verde para el cruce, papel para la parada.
  El divIcon padre ya tiene `overflow: visible`.
- No se tocaron `.yapa-pin`, `.yapa-marker-pin` ni los clusters del catálogo.
- Segunda ruta verificada: `pucara-de-tilcara` (paradaDestino `tilcara` →
  `.yapa-route-stop`); tras la extensión, sin intersecciones (ver Chequeos).

### 3. Borrado de travesía con confirmación inline (`travesia.ts`/`travesia.html`/`travesia-auth.css`)

- `borrarTravesia` + `window.confirm` eliminados. Estado nuevo:
  `borradoPendiente = signal<string | null>` (id de la travesía en
  confirmación → solo una abierta a la vez; abrir otra cierra la anterior).
- `pedirBorrarTravesia(guardada)`: abre la confirmación y con
  `afterNextRender(cb, { injector })` enfoca el botón `[data-accion="no"]`.
  Sin `setTimeout`.
- `cancelarBorrarTravesia()`: cierra sin borrar y con `afterNextRender`
  devuelve el foco al botón Borrar de esa tarjeta
  (`[data-borrar-travesia="{id}"]`, recreado al cerrarse el @else).
- `confirmarBorrarTravesia(guardada)`: cierra y ejecuta el borrado igual que
  antes (`travesiasGuardadas.borrar`, mismo manejo de error).
- HTML: dentro de `.travesia-guardada-acciones`, `@if
  (borradoPendiente() === guardada.id)` muestra `div.travesia-borrar-confirm`
  con `role="group"`, `aria-label="Confirmación de borrado de {título}"`,
  `(keydown.escape)="cancelarBorrarTravesia()"`, el texto
  `¿Borrar «{título}»?` y los botones Sí (`data-accion="si"`) / No
  (`data-accion="no"`). El `@else` mantiene el botón Borrar con
  `data-borrar-travesia`.
- CSS (`travesia-auth.css`, donde ya están las reglas `.travesia-guardada*`):
  `.travesia-borrar-confirm` (flex wrap) y `.travesia-borrar-texto`
  (flex-basis 100%). Los botones Sí/No heredan
  `.travesia-guardada-acciones button` (min-height 44px, min-width 72px) y el
  `:focus-visible` existente (línea 8). Sumé reglas de hover para Sí/No en el
  media query de hover ya existente.

### 4. Tipos huérfanos

- `grep` en `frontend/src`: `ZonaDetalle` y `UrbanoParadasCercanas` solo
  aparecían en su propia definición → borrados de `catalogo.types.ts` y
  `urbano.types.ts`.

### 5. Tests (`travesia.spec.ts`)

- Quitado `vi.spyOn(window, 'confirm')`. El test existente ahora cubre:
  - Click en Borrar → aparece `.travesia-borrar-confirm` con `role="group"`,
    aria-label con el título, texto `¿Borrar «…»?`, `document.activeElement`
    es el botón "No" y `persistencia.borrar` no se llamó.
  - Escape (keydown bubbles desde "No") → confirmación cerrada, foco de
    vuelta en el botón Borrar, `borrar` no llamado.
  - Borrar + click "No" → cerrada, foco restaurado, no borra, título sigue.
  - Borrar + click "Sí" → `persistencia.borrar` llamado con `'trav-1'`,
    confirmación cerrada y tarjeta removida del DOM.
- Los demás tests del archivo quedaron sin tocar.

## Archivos

- `frontend/src/app/yapa-mapa/yapa-mapa.component.css` (hover #8F3A21; pico
  `::before` en `.yapa-route-crossing` + `position: relative`)
- `frontend/src/app/yapa-mapa/yapa-mapa.component.ts` (solo `iconAnchor` del
  cruce en `renderRoute`, dentro del alcance permitido)
- `frontend/src/app/travesia/travesia.ts` (confirmación inline; imports
  `DOCUMENT`, `Injector`, `afterNextRender`)
- `frontend/src/app/travesia/travesia.html` (bloque `@if/@else` en
  `.travesia-guardada-acciones`)
- `frontend/src/app/travesia/travesia.spec.ts` (flujo nuevo sin
  `window.confirm`)
- `frontend/src/app/travesia/travesia-auth.css` (estilos
  `.travesia-borrar-*` + hover Sí/No)
- `frontend/src/app/catalogo.types.ts` (borrado `ZonaDetalle`)
- `frontend/src/app/urbano.types.ts` (borrado `UrbanoParadasCercanas`)
- `recibos/33-deuda-a11y-mapa/medir-33.mjs` (script de medición, adaptado de
  `medir-32.mjs`: hover real con playwright + ratio WCAG, rects de
  `.yapa-route-pin` con intersección/recorte/dentroDelMapa en 1440 y 390,
  capturas)

## Chequeos

Corridos por el coordinador en este worktree (el worker no pudo ejecutar en
su sandbox — ver Gaps):

- `grep` en `frontend/src`: **0** referencias a `window.confirm`,
  `ZonaDetalle`, `UrbanoParadasCercanas`, `borrarTravesia` (nombre viejo). ✔
- `cd frontend && npm run build`: **OK** — bundle generado en
  `frontend/dist/frontend/browser`, sin errores. ✔
- `cd frontend && npm test -- --watch=false`: **69/69** (12 archivos), tras
  la extensión del anclaje a `.yapa-route-stop`. ✔
- `node recibos/33-deuda-a11y-mapa/medir-33.mjs <dist> despues 4323`
  (playwright-core resuelto desde el frontend del repo principal):
  - hover: **3/3 cumplen ≥4.5:1** — `.yapa-cluster-pin:hover` 5.86:1,
    `.yapa-marker-pin:hover` 5.86:1 (#8f3a21 sobre #ede2d0),
    `.leaflet-bar a:hover` 15.09:1. ✔ (antes: 4.15:1 medido por kero-audit)
  - pins `cerro-siete-colores` 1440 y 390: **sin intersecciones** —
    "Purmamarca Cruce" ya no tapa al destino. ✔
  - pins `pucara-de-tilcara` 1440 y 390: **sin intersecciones** tras la
    extensión a `.yapa-route-stop` (antes fallaba `Tilcara`/`Pucará`). ✔
  - errores de consola: **0**. ✔
  - Resultado completo en `despues/medicion.json`.
- Capturas `despues/`: mapa + zoom de las dos rutas en 1440 y 390, y
  `home-1440-hover.png`. ✔

## Gaps

1. **Worker sin sandbox de ejecución**: el subagente no pudo correr
   npm/node/git; todos los chequeos de arriba los corrió el coordinador en
   este worktree sobre el build final (incluye la extensión al pin de parada).
2. **Capturas `antes/`**: no se generaron (requeriría un build extra de
   master); el "antes" de contraste está medido por kero-audit (4.15:1) y el
   solape del pin del cruce está documentado en
   `docs/pendientes-auditoria-visual.md`. El solape Tilcara/Pucará quedó
   registrado por la primera corrida de `medir-33.mjs` sobre este mismo build.
3. **`travesia-confirmacion.png`**: el flujo inline está cubierto por los
   tests (aparición, foco en "No", Escape, "Sí" borra); la captura real de la
   tarjeta pide sesión con travesía guardada y queda fuera de lo medible sin
   backend de auth.

===FIN===

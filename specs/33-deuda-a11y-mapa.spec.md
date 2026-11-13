# Slice 33 — Deuda de accesibilidad: hover del mapa, pin tapado, borrado inline y tipos sin uso

**Depende de:** 32 (mergeado en `8e8929c`). Corre en paralelo con 35 (no
comparten archivos). El 34 espera a este por `travesia.*`.

**Fuente:** auditoría posterior al slice 32
(`recibos/32-contraste-responsive-visual/kero-audit/report.json`,
`docs/pendientes-auditoria-visual.md`) y deuda declarada en el recibo del 31.
Decisiones de Franco del 13-nov: confirmación de borrado inline, no modal.

**Alcance de archivos:**
- `frontend/src/app/yapa-mapa/yapa-mapa.component.css`
- `frontend/src/app/yapa-mapa/yapa-mapa.component.ts`, solo la creación de
  los íconos de recorrido (`rutaPuntos` / `routePointClass`)
- `frontend/src/app/travesia/travesia.ts`
- `frontend/src/app/travesia/travesia.html`
- `frontend/src/app/travesia/travesia.spec.ts`
- El CSS de travesía donde ya están las reglas de `.travesia-guardada*`,
  solo para estilos de la confirmación
- `frontend/src/app/catalogo.types.ts`
- `frontend/src/app/urbano.types.ts`

**No tocar:** `styles.css` y tokens, backend, datos, `travesia.model.ts`,
`travesia.yapas.ts`, `travesia.types.ts` (son del 35), ni otros componentes.

## Qué tiene que pasar

### 1. Contraste en hover de pins y clusters del mapa

Hoy, en `@media (hover: hover) and (pointer: fine)`
(`yapa-mapa.component.css:63-75`), `.yapa-cluster-pin:hover`,
`.yapa-marker-pin:hover`, `.leaflet-bar a:hover` y `.yapa-popup-link:hover`
pintan `color: var(--oxido)` sobre `var(--arena)`. Eso da 4.15:1.
kero-audit marca 9 casos en `/` a 1440: "Quebrada · 4", "Abra Pampa",
"La Quiaca"…

- El color del texto en hover pasa a un óxido oscuro definido localmente,
  `#8F3A21` (calculado en ~5.8:1 sobre arena). El borde puede seguir en
  `--oxido`.
- Medido en navegador real: todo texto en hover de esa regla queda ≥4.5:1.
- Los estados no-hover y `.yapa-pin-active` no cambian.

### 2. "Purmamarca Cruce" sin taparse con el destino

Hoy todos los pins de recorrido usan `iconSize: [152, 44]` e
`iconAnchor: [76, 22]`, centrados en su coordenada. El cruce y el destino
(Purmamarca, a 3 km a casi la misma latitud) se superponen en desktop.

- En `rutaPuntos`, los puntos de tipo `cruce` usan un `iconAnchor`
  vertical negativo, para que la etiqueta quede **debajo** de su coordenada
  y deje despejado el alto del pin del destino (por ejemplo `[76, -26]`).
- Origen, destino y paradas quedan como están: centrados.
- Con CSS (`.yapa-route-crossing`), se agrega un pico (`::before`) que
  apunta hacia arriba, a la coordenada, para que se entienda a qué punto
  corresponde la etiqueta.
- **Aceptación:** en `/como-llegar/cerro-siete-colores` a 1440×900 y 390×844,
  los rectángulos de los tres `.yapa-route-pin` no se intersectan, siguen
  completos (sin recorte, como en el 32) y quedan dentro del mapa.
  Repetir en una segunda ruta con cruce o parada, si existe, y declararla.
- No cambian `.yapa-pin` ni los clusters del catálogo.

### 3. Borrado de travesía con confirmación inline

Hoy `borrarTravesia` (`travesia.ts:478`) usa `window.confirm`.

- "Borrar", en `.travesia-guardada-acciones`, ya no borra: muestra dentro de
  la misma tarjeta una confirmación con el texto `¿Borrar «{título}»?` y dos
  botones, **Sí** y **No**, dentro de un `role="group"` con `aria-label`.
- Al aparecer, el foco va a **No**.
- **No** o **Escape** sobre la confirmación la cierran sin borrar y devuelven
  el foco al botón "Borrar" de esa tarjeta.
- **Sí** ejecuta el borrado actual (`travesiasGuardadas.borrar`, manejo de
  error igual) y cierra la confirmación.
- Solo una confirmación abierta a la vez. Abrir otra cierra la anterior.
- Para el foco, usar `afterNextRender` u otro mecanismo de Angular. No
  usar `setTimeout`.
- Los botones mantienen área táctil ≥44 px y `:focus-visible`.
- `window.confirm` desaparece del código.

### 4. Tipos sin uso

- Borrar `ZonaDetalle` (`catalogo.types.ts:29`) y `UrbanoParadasCercanas`
  (`urbano.types.ts:59`), después de comprobar con grep que no tienen
  referencias en `frontend/src`.

## Tests exigidos

- En `travesia.spec.ts`, reemplazar el `vi.spyOn(window, 'confirm')` por el
  flujo nuevo:
  - Click en Borrar: aparece la confirmación, el foco queda en "No" y
    `borrar` no se llamó.
  - Escape: la confirmación se cierra, el foco vuelve a "Borrar" y `borrar`
    no se llamó.
  - Click en Borrar y luego en Sí: `borrar` se llamó con `'trav-1'`.
  - Click en Borrar y luego en No: no se borra.
- Los demás tests siguen pasando sin cambios.

## Criterios de aceptación

- [ ] Pasan los chequeos de `slices.conf`.
- [ ] `npm run build` OK, sin error de presupuesto.
- [ ] `git diff --check` limpio. `git diff --stat` muestra solo archivos del
      alcance, más `recibos/`.
- [ ] Medición en navegador: hover de pins y clusters ≥4.5:1 (tabla
      antes/después con método). Pins de recorrido sin intersección en 1440
      y 390.
- [ ] Capturas antes/después en `recibos/33-deuda-a11y-mapa/`: home a 1440
      con un cluster en hover; `/como-llegar/cerro-siete-colores` a 1440 y
      390; tarjeta de travesía guardada con la confirmación abierta. Si para
      esta última hace falta sesión, documentar cómo se obtuvo (por ejemplo,
      un fixture de test o un DOM simulado) o declararla como gap.
- [ ] 0 referencias a `window.confirm`, `ZonaDetalle` y
      `UrbanoParadasCercanas` en `frontend/src`.
- [ ] Recibo con las reglas por archivo, las mediciones y los gaps.

## Fuera de alcance

- La semántica `role=listitem` de `.map-place-card` (deuda del 29).
- Reposicionar etiquetas según el zoom y detectar choques en general.
- Imágenes (34) y márgenes de traslado (35).

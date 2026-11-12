# Slice 26 — Unificación de tokens y estilos compartidos

**Depende de:** master actual. Auditoría técnica del 12-nov encontró CSS
duplicado frágil entre home y travesía.

**Alcance:** `frontend/src/styles.css`,
`frontend/angular.json` (solo presupuesto `anyComponentStyle`, ajuste
mínimo aprobado por el coordinador el 12-nov: home.css scoped supera
10 kB),
`frontend/src/app/home/home.css`, `frontend/src/app/travesia/*.css`,
`frontend/src/app/lugar-detalle/lugar-detalle.css`,
`frontend/src/app/como-llegar/como-llegar.css`,
`frontend/src/app/yapa-mapa/yapa-mapa.component.css`,
`frontend/src/index.html` si hace falta. NO tocar TS salvo clases
mínimas, ni templates salvo atributos mínimos.

## Problemas a resolver (evidencia de la auditoría)

1. `styles.css:2` hace `@import './app/home/home.css'` **globalmente**.
   Las líneas ~711-758 de home.css redefinen `.travesia-shell .tramo`,
   `.yapa-card`, `.yapa-acciones`, `.agregar-lugar`,
   `.seleccion-lugares` con valores DISTINTOS a los de
   `travesia-plan.css`/`travesia-motion.css`. Mismo selector, dos
   definiciones → gana el orden del bundle. Visual frágil.
2. Tres `.kicker` con valores distintos: home.css:113 global
   (`.28em`, `--ocre`), travesia.css:9 (`.22em`, `--oxido`),
   como-llegar.css:10 (`.18em`, `--oxido`). La global pisa a las scoped.
3. `.status`, `.volver-inicio`, `.brand`, `.solo-lector` definidos en
   home.css global y reutilizados por accidente en travesia/como-llegar.
4. `lugar-detalle.css:3` redefine `--t60: #6f5f54` local (distinto del
   `rgba(36,22,16,.66)` global) → el mismo token significa dos cosas.
5. Valores mágicos hardcodeados que son tokens: `#f4ede3`, `#233a31`
   (hover de --verde), `#B5492A` en travesia.css:58-59,
   como-llegar.css:107, lugar-detalle.css:103.
6. `yapa-mapa.component.css` repite toda la paleta como fallback
   hardcodeado en cada `var(--x, fallback)` (~30 veces).

## Qué hacer

1. **Mover** el bloque `.travesia-shell` (y selectores de travesía que
   hoy viven en home.css ~711-758) a los CSS scoped de travesía que
   correspondan (`travesia.css`/`travesia-plan.css`/`travesia-motion.css`
   según corresponda al selector). Eliminar el `@import` global de
   home.css en styles.css — home.css debe cargarse scoped por el
   componente (verificar que `styleUrls`/`styleUrl` del componente lo
   referencie; si depende del @import global, agregarlo como
   styleUrl del componente Home).
2. **Crear una sola definición** de `.kicker`, `.status`,
   `.volver-inicio`, `.brand` y demás utilidades compartidas en
   `styles.css` global (o un `shared.css` importado una vez). Elegir
   los valores canónicos del sistema de diseño (docs/design.md):
   kicker = letter-spacing .22em, color --oxido, salvo que el diseño
   pida otra cosa — documentar la elección.
3. **Corregir `--t60`** en lugar-detalle.css: quitar la redefinición
   local o ajustarla al token global si el contraste real lo permite.
4. **Reemplazar** los hex hardcodeados por tokens (`--papel`,
   `--verde`, `--oxido`, y crear `--verde-hover` si hace falta).
5. En yapa-mapa.component.css: quitar los fallbacks hardcodeados de
   `var(--token, #hex)` → `var(--token)` (los tokens ya son globales).
6. **NO rediseñar**: mismos valores visuales resultantes. Si un cambio
   de valor es inevitable (ej. unificar kicker cambia .28em→.22em),
   documentarlo en el recibo como cambio visual deliberado.

## Criterios

- [ ] `cd frontend && npm test -- --watch=false` verde
- [ ] `npm run build` OK
- [ ] `git diff --check` limpio
- [ ] **Regresión visual**: kero-audit o screenshots comparativos de
      home, travesía, como-llegar, lugar-detalle, mapa en desktop+mobile
      antes/después — ningún cambio visual no justificado. Guardar en
      `recibos/26-diseno-tokens-v2/audit-despues/`.
- [ ] Grep final: no quedan dos definiciones del mismo selector entre
      home.css y los CSS de travesía.
- [ ] Recibo con: selectores movidos, valores unificados, excepciones.

## Fuera de alcance

- Cambios de layout, copy, componentes, lógica TS.
- Rediseño de tokens de color/tipografía (eso fue slice 22).
- CSS de pitch/.

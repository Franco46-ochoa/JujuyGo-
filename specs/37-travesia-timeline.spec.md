# Slice 37 — Travesía por día: timeline con horas, confianza y mapa por día

**Depende de:** conviene lanzarlo después del 36 (el set canónico de badges
de confianza se define ahí). Si se lanza antes, duplicar las clases de badge
provisionalmente y declararlo en el recibo.

**Fuente de verdad:** el prototipo aprobado por Franco
(`https://franco46-ochoa.github.io/JujuyGo-/travesia.html`, fuente local en
`C:\Users\Elect\orca\projects\prototipos-jujuygo\travesia.html`, commit
gh-pages `84d46dc`) + `docs/design.md`. El modelo de datos ya existe:
`DiaTravesia`, `EventoTravesia` (con `acceso_local`), `TramoTravesia`
(con `confianza` y `fuente`) en `travesia.types.ts`.

**Restricciones duras (condiciones de aprobación de Franco):**
- **Nada de datos demostrativos como garantía**: el timeline renderiza lo
  que devuelve la validación real (`/travesia/validar`). Los horarios del
  prototipo son ejemplo, no fixture funcional.
- **Confianza por tramo, no decorativa**: cada tramo muestra su `confianza`
  real. Mapeo mínimo de badges:
  - `publicado` → "Horario publicado"
  - `estimado` → "Hora estimada"
  - `tiempo-real` → "Tiempo real" (si llega)
  - evento con `acceso_local` → "Traslado local"
  - traslado sin horario (p. ej. Hornocal) → "Sin horario fijo" +
    "Verificar regreso". Si el backend no distingue ese caso hoy, declarar
    en el recibo cómo se detecta (campo existente o regla por tipo de
    evento) — no inventar el dato.
- **Purmamarca pueblo vs cruce**: las paradas son entidades distintas en el
  dataset (`purmamarcapueblo` / `purmamarcacruce`); el timeline muestra la
  parada real del servicio, no la genérica.
- **La caminata cruce↔pueblo nunca se presenta como recomendación**: si un
  acceso a pie aparece, el copy lo marca como traslado con margen y sugiere
  remis. Regla de copy, no de datos.
- El wizard de armado y la validación backend **no se rediseñan** — solo el
  render del plan resultado.

## Qué tiene que pasar

1. **Timeline por día**: cada `DiaTravesia` se renderiza como una lista
   vertical con hora a la izquierda (`t-hora`, `tabular-nums`), nodo, título
   del evento, detalle y badges — como el prototipo. Sustituye al render
   actual de eventos; conserva el estado de conflicto ("Revisar horarios")
   ya existente, integrado como badge/estado del día.
2. **Foto por lugar**: eventos de tipo lugar muestran su foto usando
   `fotoSrc`/`fotoSrcset` (helper del 34) con `loading="lazy"`,
   `decoding="async"` y `sizes` medido.
3. **Mapa por día**: un mapa Leaflet por día con los puntos de ese día,
   `fitBounds` con padding (el prototipo usa `padding: [28,28]`), no
   `setView` fijo. Marcadores mínimos con etiqueta; reutilizar lo que ya
   exista de Leaflet en el proyecto (`yapa-mapa`, `como-llegar`) — declarar
   en el recibo qué se reusa.
4. **Cierre de día**: línea editorial por día ("Dormís en Tilcara…", "El
   día cierra sin apuros…") si el plan trae dato de `cierre`; si no, no se
   fabrica.
5. **Yapas**: este slice deja el hueco — los eventos yapa se insertan en el
   timeline en su posición cronológica (ver 38). En este slice, la yapa-card
   actual puede seguir mostrándose donde está; el 38 la integra.
   Alternativamente, si resulta natural integrarlas ya, hacerlo y cerrar el
   38 como redundante — decidir y declarar.
6. **Header del plan**: meta del prototipo (rango de fechas, origen, bases,
   cantidad de tramos de colectivo) derivado de `PlanTravesia` — sin datos
   inventados.

## Alcance de archivos

- `frontend/src/app/travesia/travesia.html`, `travesia.ts`, specs asociados
- CSS de travesía + reuso de badges del 36
- `travesia.model.ts` / `travesia.yapas.ts` solo si hace falta un helper de
  ordenamiento cronológico (declarar en recibo)

**No tocar:** backend, el wizard (pasos 1–4), validación, `mis-travesias`,
`foto.ts`, tokens globales.

## Tests exigidos

- Spec del componente: el timeline ordena eventos por `hora`; cada tramo
  muestra el badge que le corresponde según `confianza`; un evento con
  `acceso_local` muestra "Traslado local".
- Test del mapa por día: se crea un mapa por día con los puntos correctos
  (mockear Leaflet como ya lo haga el proyecto).
- Los tests existentes del componente siguen pasando o se actualizan con
  justificación en el recibo.

## Criterios de aceptación

- [ ] Pasan los chequeos de `slices.conf`; `npm run build` OK.
- [ ] `git diff --check` limpio; diff dentro del alcance.
- [ ] Capturas en `recibos/37-travesia-timeline/`: plan de 2–3 días en
      390×844 y 1440×900 mostrando timeline, badges, fotos y mapa por día
      con todos los puntos encuadrados.
- [ ] Verificación con plan real del backend local (o fixture del mismo
      shape, declarado): ningún horario hardcodeado del prototipo queda en
      el componente.
- [ ] Un día con conflicto muestra el estado "Revisar horarios" integrado.
- [ ] Recibo con gaps (detección de "sin horario fijo", reutilización de
      mapa, etc.).

## Fuera de alcance

- Integración de yapas dentro del timeline (es el 38, salvo la alternativa
  del punto 5).
- Compartir/guardar travesía, auth, mis-travesias.
- Mapa general del viaje (solo por día, como el prototipo).

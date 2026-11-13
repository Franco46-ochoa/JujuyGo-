# Slice 38 — Yapas integradas en el timeline: "cierra porque lo dice el reloj"

**Depende de:** 37 (necesita el timeline por día para insertarse).

**Fuente de verdad:** prototipo aprobado
(`https://franco46-ochoa.github.io/JujuyGo-/travesia.html` — las yapas `✳`
aparecen **dentro** del recorrido, entre eventos, con una línea que explica
por qué no rompen el plan: "Cierra porque no cambia tu plan: es la misma
butaca, en el mismo servicio."). Es el diferencial del producto según
Franco: "las yapas aparecen dentro del itinerario y explican por qué no
alteran el horario del colectivo".

**Contexto actual:** hoy la yapa es una card aparte (`yapa-card` en
`travesia.html`) con acciones "Sumar"/"Dejar pasar". `YapaTravesia` tiene
`tipo`, `lugar_sugerido_slug`, `mensaje`, `accion`, `hora_sugerida`. El
backend (`yapa-llm.js`) devuelve `mensaje` + `fuente` (`llm`|`reglas`).

## Qué tiene que pasar

1. **Yapa dentro del timeline**: cada yapa sugerida se inserta como un
   ítem del timeline del día correspondiente, en su posición cronológica
   (`hora_sugerida`; si no la hay, después del evento al que aplica —
   declarar la regla en el recibo). Visual: la caja `✳ yapa` del prototipo
   (fondo arena, kicker, mensaje, línea de cierre en small).
2. **Línea "Cierra porque…"**: cada yapa inline lleva una justificación
   corta de por qué no altera el plan. Fuentes posibles, en orden de
   preferencia (declarar cuál se usa):
   - El backend ya validó el tramo/ventana y puede devolver la razón
     (mismo servicio, ventana entre tramos, adyacente a pie).
   - Reglas del frontend derivadas del plan validado (la yapa ya nace de
     huecos validados — la razón se puede componer de esos datos).
   - Si ninguna fuente da una razón veraz, la línea no se muestra — jamás
     una justificación genérica inventada.
3. **Acciones**: la yapa inline conserva Sumar / Dejar pasar (mismo
   comportamiento actual), adaptadas al nuevo formato. Al sumar, la yapa se
   convierte en evento del día y el timeline se re-ordena.
4. **La yapa-card actual desaparece** como elemento separado — no pueden
   coexistir los dos renders.
5. **Honestidad de fuente**: si la yapa vino de `reglas` (fallback) vs
   `llm`, el render no lo distingue visualmente (decisión del prototipo),
   pero el dato `fuente` debe seguir viajando — declarar en recibo.

## Alcance de archivos

- `frontend/src/app/travesia/travesia.html`, `travesia.ts`,
  `travesia.yapas.ts`, specs asociados
- CSS de travesía (estilo `.yapa` del prototipo)
- `travesia.types.ts` solo si hace falta un campo para la justificación
  (declarar en recibo; si el backend no lo da, componerlo en frontend)

**No tocar:** `yapa-llm.js` ni la lógica de sugerencia backend (la
justificación se compone con datos ya validados; cambiar el contrato del
backend solo si es imprescindible y se declara como gap para un slice
futuro).

## Tests exigidos

- La yapa se inserta en la posición cronológica correcta del día.
- La línea "Cierra porque…" se compone con datos reales del plan (test con
  fixture: yapa en ventana entre tramos → la justificación menciona la
  ventana/mismo servicio); si no hay razón veraz, no se renderiza.
- Sumar convierte la yapa en evento re-ordenado; Dejar pasar la quita.
- Los tests existentes de yapas siguen pasando o se actualizan con
  justificación.

## Criterios de aceptación

- [ ] Pasan los chequeos de `slices.conf`; `npm run build` OK.
- [ ] `git diff --check` limpio; diff dentro del alcance.
- [ ] Capturas en `recibos/38-yapas-inline/`: yapa inline entre dos
      eventos del timeline en 390 y 1440, con su línea de cierre.
- [ ] Ninguna justificación genérica: test/revisión confirma que cada
      "Cierra porque…" cita el dato real (servicio, ventana, distancia).
- [ ] Recibo con la regla de posicionamiento, la fuente de justificación
      elegida y gaps.

## Fuera de alcance

- Nuevos tipos de yapa, cambios en prompts LLM, yapas en otras vistas.
- Backend: contrato nuevo solo si es imprescindible (gap declarado).

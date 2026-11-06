# Yapa — design system v0 (kero-system)

Dirección aprobada por el dueño sobre `docs/mockups/mock-04.html` (fuente de verdad visual).
Gobierna toda pantalla de Yapa. Referencias madre: travel-sensations.com (calidez editorial, GPS-como-ornamento), Citymapper/Moovit (precisión operativa), Explora (datos como ornamento).

## Identidad

**Yapa** = el extra que te regala Jujuy. El producto regala algo de más: el plan que cierra, la sugerencia que no pediste. Los itinerarios se llaman **travesías**. Las sugerencias de la IA se llaman **yapas** — la marca ES el feature.

## Personalidad

Editorial cálida + precisión quirúrgica. Revista para soñar, instrumento para moverse.
Jamás: look de template, emoji como ícono, círculos de colores con iniciales, cards iguales en grilla, píldoras de colores, pasteles dulzones, tipografía system-font a 14px para títulos.

## Tokens

```css
--tinta: #241610;  --papel: #F4EDE3;  --arena: #EDE2D0;
--oxido: #B5492A;  /* acento único */
--ocre:  #C9A86A;  /* sol, detalles, itálicas sobre foto */
--verde: #2E4A3E;  /* banda operativa / transporte */
--t60: rgba(36,22,16,.62); --t30: rgba(36,22,16,.32); --t14: rgba(36,22,16,.14);
```

- **Display/serif:** Fraunces (variable; weight 340–520, itálica para acentos)
- **Texto/datos:** Archivo 300–600; números `tabular-nums` siempre
- **Espaciado:** escala 4·n; secciones 110px verticales; radios 3–4px en imagen, 999px solo nav/CTA
- **Grano:** overlay SVG feTurbulence 5% global — mata el plástico
- **Sombras:** ninguna decorativa; profundidad solo por capa foto↔texto

## Patrones de página (del mock aprobado)

- **Hero a sangre:** foto cubre 100svh, velo gradiente, nav píldora flotante, titular serif centrado, coordenadas al pie
- **Secuencia narrativa:** Imaginá → Armalo → Vivílo → Acordate como columnas con regla fina (no tarjetas)
- **Zonas:** collage asimétrico (1 grande + 3 laterales), foto con datos (`KM · MSN`)
- **Imperdibles:** filas editoriales `num itálica | nombre serif | texto | meta | →`, reglas finas
- **Pausa fotográfica:** foto a sangre + cita entre secciones
- **Banda operativa (verde):** la herramienta — timeline de tramos con nodos-punto ocre
- **Footer:** wordmark gigante + frase + coordenadas

## Modelo de interacción (4 momentos)

1. **Soñar** — sin login, modo revista: zonas/imperdibles/dormir/guías; cada lugar responde qué es y cómo se llega
2. **Armar** — 3 preguntas (fechas, llegada, intereses) → plan día por día validado contra horarios reales; edición re-valida en vivo con aviso de conflicto
3. **Viajar** — tarjeta grande "lo que toca ahora"; alerta antes de bajar; plan B si perdés el bondi
4. **Recordar** — travesía guardada local + link compartible; sin cuenta en MVP

## Capa IA — las yapas

Gemini genera sugerencias **por usuario, por contexto, por momento** — nunca plantillas:

- **Contexto por llamada:** itinerario actual + catálogo real + horarios + historial del usuario + hora `America/Argentina/Jujuy`
- **Memoria (vía Supabase):** yapas aceptadas/rechazadas alimentan el próximo prompt — efecto "aprende de vos"
- **Disparadores sanos:** al editar el plan, víspera del viaje, mañana del día, al llegar a un waypoint. Nunca notificaciones intempestivas; la yapa vive dentro del plan
- **Validador backend (antes de mostrar):** solo lugares del catálogo, solo si cierra logísticamente (tiempo + bondi). Lo inválido se descarta invisible
- **UI:** tarjeta `✳ yapa` insertada en el timeline del día, con la sugerencia y el porqué logístico

## Movimiento — capa de verdad (no mentir nunca)

- Tiempo real (si la API de Santa Ana responde): "el bondi llega en 6 min"
- Horario publicado (default): "sale ~9:40 (horario publicado, llegá 15 min antes)"
- Mismo diseño, dos verdades — la honestidad es el feature

## Fuera del sistema

- Sin e-commerce, sin chat libre, sin login en MVP, sin WebGL pesado
- Idiomas: ES base; PT/EN cuando haya texto de producto (15% extranjeros, Brasil primero)

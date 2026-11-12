# Slice 27 — Copy de yapas y textos de auth

**Depende de:** master actual (idealmente post-26, pero archivos
disjoint → puede correr en paralelo).

**Alcance:** `frontend/src/app/travesia/travesia.html`,
`frontend/src/app/travesia/travesia.ts` (solo textos/etiquetas),
`frontend/src/app/travesia/travesia.types.ts` (solo si hace falta un
mapa de etiquetas — NO cambiar el enum `TipoYapa` ni datos).
`frontend/src/app/home/home.html` solo si el concepto yapa se explica
ahí. NO tocar backend, Supabase, ni lógica de generación de yapas.

## Problemas (evidencia de auditoría UX)

1. `travesia.html:240`: `Tu yapa · {{ sugerencia.yapa.tipo }}` muestra
   el enum crudo: "rn9", "aclimatacion", "localidad", "zona".
2. `travesia.html:17,194`: "login no configurado" en inglés técnico
   cuando `auth.configurado` es false.
3. No hay texto que explique qué es una "yapa" la primera vez que
   aparece (el concepto solo se deduce del footer de home).

## Qué hacer

1. **Mapa de etiquetas humanas** para `TipoYapa` (const en el
   componente o archivo chico):
   - `localidad` → "Para seguir explorando"
   - `zona` → "Misma zona"
   - `rn9` → "Sobre la RN9"
   - `aclimatacion` → "Para el cuerpo"
   Ajustar redacción si el contexto pide otra cosa; mantener voseo.
2. Mostrar la etiqueta mapeada en `travesia.html` en vez del enum.
3. Reemplazar "login no configurado" por copy de producto en ambos
   lugares: ej. "Guardar tu plan no está disponible en este momento" /
   botón "Iniciá sesión para guardar" solo si está configurado.
4. Agregar una micro-explicación de qué es una yapa la primera vez que
   aparece en la sesión (ej. texto chico bajo el kicker: "La yapa es el
   extra que cierra tu día — sale de los horarios reales."). Una sola
   vez, no repetitiva.
5. **NO modificar**: valores del enum, `generarYapas`, datos de
   Supabase, contratos del backend.

## Criterios

- [ ] `npm test -- --watch=false` verde
- [ ] `npm run build` OK
- [ ] `git diff --check` limpio
- [ ] Screenshots de la tarjeta de yapa antes/después en recibo.
- [ ] Recibo con textos finales elegidos y justificación breve.

## Fuera de alcance

- Cambios visuales/de estilo más allá de clases existentes.
- Lógica de yapas, validación, transporte.

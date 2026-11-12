# Slice 30 — Copy de home (propuesta de valor + identidad)

**Depende de:** idealmente post-26 (usa estilos unificados). Archivos:
`frontend/src/app/home/home.html`, `home/home.ts` solo si hace falta,
`home/home.css` solo ajustes mínimos de tipografía del hero.

**Alcance:** SOLO textos visibles de home (hero, subtítulos, CTAs,
nombres de sección si aplica). NO tocar lógica, datos, estructura de
secciones, ni otros componentes.

## Dirección de marca (aprobada por el usuario)

Mantener "El norte que te queda" como frase de identidad, pero el H1
debe comunicar qué es el producto. Propuesta aprobada:

- **H1**: `Descubrí Jujuy.` (o similar descriptivo — puede ajustarse
  la redacción final en el recibo con justificación)
- **Frase de identidad**: `El norte que te queda.` (se conserva,
  como bajada o elemento secundario del hero)
- **Subtítulo**: descripción clara de la propuesta de valor —
  referencia aprobada: "Explorá destinos, organizá tus recorridos y
  descubrí experiencias para vivir Jujuy a tu manera." (puede
  refinarse; debe mencionar planificación con horarios reales si entra
  natural)

## Otros textos a revisar (evidencia de auditoría UX)

1. `home.html:227`: "Base de **operaciones**" bajo kicker "Dónde
   dormir" — lenguaje militar para alojamientos turísticos. Proponer
   alternativa (ej. "Dónde dormir en la Quebrada") manteniendo tono.
2. Coordenadas decorativas "23.1858° S — 65.2995° O · 2.324 m"
   repetidas en hero y footer — parecen dato del lugar pero son de
   Jujuy capital. Quitar, contextualizar ("Jujuy capital · …") o
   reemplazar por algo útil. Decidir y justificar.
3. "los bondis que sí pasan" vs "colectivo"/"ómnibus" — unificar a
   "colectivo" (registro neutro usado en el resto de la app) salvo
   que "bondi" se decida como guiño porteño consistente.
4. CTAs: "Empezá a imaginar" → evaluar si un texto más explícito
   ayuda ("Armá tu travesía") sin perder personalidad.

## Criterios

- [ ] `npm test -- --watch=false` verde
- [ ] `npm run build` OK
- [ ] `git diff --check` limpio
- [ ] Screenshots del hero antes/después en recibo.
- [ ] Recibo con: textos finales exactos, decisión por cada punto,
      y confirmación de que la identidad (papel/tinta/Fraunces) no
      cambió.

## Fuera de alcance

- Estructura de secciones, layout, estilos más allá de ajustes
  tipográficos del hero.
- Textos de otros componentes (travesia, como-llegar, lugar-detalle).

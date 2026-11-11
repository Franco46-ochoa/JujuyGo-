# Slice 25 — Pulido estético de Lugar-detalle y Travesía

**Depende de:** master actual. Auditoría Fase 0 en
`frontend/audit-fase0/report.json`. El slice 22 (tokens) puede mergear
antes/después — no dependas de él.

**Alcance:** `frontend/src/app/lugar-detalle/` y `frontend/src/app/travesia/`
(incluye travesia-auth.css, travesia-motion.css, travesia.guardadas.*,
travesias-guardadas.service.ts — CSS/tests sí; la lógica de guardado del
slice 21 NO se toca salvo estilo). NO tocar home, como-llegar, yapa-mapa
(salvo lectura), backend, specs, docs, supabase/migrations.

## Contexto — hallazgos del audit

**`/lugares/plaza-belgrano-jujuy`:**
- **14 textos <14px**: "Territorio · Valles" 13px, "Valles · San Salvador de
  Jujuy" **11px**, "1259 msnm" 12px, "Ver detalle →" 13px, lugares
  relacionados 12-13.3px, atribución Leaflet.
- **1-2 targets chicos**: "Ver detalle →" 76×17px (mínimo táctil 44px) y
  "×" 24×24px.
- **13 borderline** (~4.6): `--t60` — dependencia slice 22.
- **2 títulos sin balance**: "En el mapa", "Casa de Gobierno y Plaza Belgran…".
- **3 controles `touch-action: auto`** en móvil.
- **12-14 valores off-scale** (6×24, 14×10, 5×6…).

**`/travesia`:** casi limpio en audit estático (1 borderline, 1 offScale,
3 focus walked) — PERO el audit solo vio el wizard inicial. El plan
generado, las yapas, "Mis travesías" y la UI de auth (slice 21, recién
mergeada) nunca tuvieron pasada visual ni audit con datos reales. Trabajo:
estados completos del wizard, plan día por día, tarjetas de yapa, lista de
guardadas, botón Google, empty states.

## Skills OBLIGATORIAS (leer antes de diseñar)

Sistema visual: `docs/design.md` (mock-04) — gana sobre genéricas. Cargar de
`~/.agents/skills/`:

- `badesign-skill` — juicio, hard limits.
- `frontend-design` — dirección estética.
- `impeccable` — polish.
- `mobile-native` — táctil, inputs fecha que no zoomen (≥16px), safe areas.
- `kero-audit` — `scripts/checks.js` es la vara; re-correr al final.
- `break-ui` — OPTIONAL pero recomendado: stress visual del plan con datos
  extremos (nombres largos de lugares, muchos días, sin guardadas, error de
  red) — reportá qué se rompe.
- `typebien` — solo si tocás copy (el tono editorial está aprobado).
- `animate`/`emil-design-eng` — SOLO si agregás o tocás motion existente
  (travesia-motion.css ya existe: revisá que respete prefers-reduced-motion).

## Qué tiene que pasar

1. **lugar-detalle**: meta-textos a ≥14px (o justificar como dato-ornamento
   con tamaño legible alternativo); "Ver detalle →" con hit area ≥44px
   (padding invisible, no agrandar el texto); "×" a ≥44px táctil / ≥24px
   puntero; `text-wrap: balance` en títulos; touch-action en controles;
   espaciado a escala donde seguro.
2. **travesia wizard**: fechas/intereses/llegada — revisar focus visible,
   estados de opción seleccionada (state contrast ya pasa; el tema es
   jerarquía visual y si la opción elegida se nota sin leer), errores de
   validación (campo-error ya tiene estilo — unificar), progreso.
3. **plan día por día**: eventos, horarios, yapas — filas editoriales con
   regla fina (patrón del sitio), números itálicos, jerarquía clara entre
   hora/lugar/instrucción. Las yapas (`travesia.yapas.ts`) deben verse como
   "extra de la marca", no como alert genérica.
4. **auth UI (slice 21)**: botón "Entrar con Google", indicador de sesión,
   "Guardar travesía", "Mis travesías" — que hablen el mismo idioma visual
   (botones píldora verde/óxido según jerarquía, no estilos de librería).
   Empty state de "Mis travesías" honesto y cálido.
5. **Contraste**: nada <4.5:1 medido (los `t60` → dependencia slice 22).
6. **Motion**: `travesia-motion.css` — verificar que TODO respete
   `prefers-reduced-motion` (el audit lo mide: `moving` debe ser 0).
7. **NO rediseñar ni tocar lógica**: guardado/carga/borrado del slice 21
   funciona — solo estilo. No cambiar textos salvo largo de línea medido.
8. Responsive 390px sin scroll horizontal; inputs ≥16px para no zoomear iOS.

## Criterios

- [ ] `cd frontend && npm test -- --watch=false` verde
- [ ] `cd frontend && npm run build` OK
- [ ] `git diff --check` limpio
- [ ] kero-audit re-corrido en `/lugares/plaza-belgrano-jujuy` y `/travesia`
      a 390x844 y 1440x900: sin hard faults; smallText → 0 o excepciones
      documentadas; smallTargets → 0; unbalanced → 0; noTouchAction → 0;
      `moving` = 0 con reduced-motion; reporte en
      `recibos/25-estetica-detalle-travesia/audit-despues/`.
- [ ] Si corriste break-ui o revisaste estados del plan/auth, documentar
      hallazgos en el recibo (aunque no los arregles todos — scope).
- [ ] Recibo: cambios por sección, mediciones antes/después, archivos,
      gaps.

## Fuera de alcance

- Tokens globales (22), home (23), como-llegar/yapa-mapa (24).
- Lógica de auth/guardado (slice 21), yapas (lógica), transporte.
- Copy, datos, migraciones.

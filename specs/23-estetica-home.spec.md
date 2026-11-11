# Slice 23 — Pulido estético de Home

**Depende de:** master actual. La auditoría kero de Fase 0 está en
`frontend/audit-fase0/report.json` (commiteada). OJO: el slice 22
(estetica-tokens) puede mergear antes o después — trabajá sobre TU worktree
(master actual) y no dependas de sus cambios; si hay conflicto de valores
globales, el merge lo resuelve el coordinador.

**Alcance:** `frontend/src/app/home/` (home.css/html/ts/spec) y, solo si es
indispensable, utilidades globales en `frontend/src/styles.css` (anotalo en
el recibo si tocás algo fuera de home/). NO tocar como-llegar, lugar-detalle,
travesia, yapa-mapa, backend, specs, docs.

## Contexto — hallazgos del audit en `/` (home)

- **75 textos <14px** (390px y 1440px igual): chips de zonas ("Quebrada · 4"
a 13px), lugares del collage/mapa ("Abra Pampa", "Salinas Grandes" a 12px),
  meta del Tren Solar (12px), atribución Leaflet (12px — si es CSS de
  Leaflet y no de home/, NO lo toques: es del slice del mapa).
- **89-101 borderline contrast** (~4.57-4.66): texto `--t60` sobre papel —
  el slice 22 lo corrige global; vos NO cambies `--t60` (scope). Si alguna
  superficie de home usa OTRO color por debajo de 4.5, arreglalo local.
- **11 títulos sin `text-wrap: balance`**: "Imaginá/Armalo/Vivilo/Acordate",
  nombres de hoteles ("Hotel Huacalera", "La Comarca", etc.), "Próximos
  servicios · Terminal a…".
- **10 controles `touch-action: auto`** en móvil (chips/listas de zonas).
- **Espaciado fuera de escala**: home es la peor página (16 valores off,
  14px×109, 6px×86). Corregí los claramente errados; documentá excepciones.
- **Ritmo vertical**: `design.md` pide secciones ~110px verticales —
  verificá contra mock-04 (`docs/mockups/mock-04.html` o el que corresponda;
  la fuente de verdad visual es el mock aprobado).

## Skills OBLIGATORIAS (leer antes de diseñar)

Sistema visual: `docs/design.md` (mock-04) — gana sobre skills genéricas.
Cargar de `~/.agents/skills/`:

- `badesign-skill` — juicio de diseño, hard limits.
- `frontend-design` — dirección estética anti-template.
- `impeccable` — polish de UI.
- `mobile-native` — táctil, 100vh, tap highlight.
- `kero-audit` — `scripts/checks.js` es la vara; re-corré el audit al final.
- `typebien` — SOLO si tocás copy (no reescribir textos por gusto; el copy
  editorial ya está aprobado, no "mejorarlo" sin razón medida).

## Qué tiene que pasar

1. Comparar home renderizada vs `docs/mockups/mock-04.html` (misma sección
   por sección): hero a sangre, secuencia narrativa Imaginá→Armalo→Vivilo→
   Acordate, collage de zonas, imprescindibles, banda operativa, footer.
   Corregir DESVÍOS medibles (ritmo, alineaciones, tamaños, fotos con datos).
2. Subir meta-textos de UI a ≥14px donde sea texto de lectura (los chips de
   zonas, meta del tren, contadores). Texto que sea ornamento de mapa queda
   como está (scope de otro slice).
3. `text-wrap: balance` en todos los h1-h3 y títulos de sección de home.
4. `touch-action: manipulation` en chips, links y controles de home.
5. Espaciado: acercar al máximo los valores al scale 4·n sin romper el
   layout; cada excepción queda comentada o justificada en el recibo.
6. Contraste: medir con `checks.js`; ningún texto de home por debajo de 4.5:1
   en su fondo real (los `t60` los arregla el slice 22 — si medís <4.5 por
   eso, anotalo como dependencia, no lo "arregles" duplicando el token).
7. **NO rediseñar**: no cambiar identidad, layout de secciones, ni copy.
   Pulido contra el mock, no dirección nueva.
8. Responsive: verificar 390px (sin scroll horizontal, targets ≥44px táctil)
   y 1440px. Si un fix es solo desktop, que no rompa móvil.

## Criterios

- [ ] `cd frontend && npm test -- --watch=false` verde
- [ ] `cd frontend && npm run build` OK
- [ ] `git diff --check` limpio
- [ ] kero-audit re-corrido en `/` a 390x844 y 1440x900: sin hard faults,
      smallText de textos de UI → 0 (o excepciones documentadas),
      unbalanced → 0, noTouchAction → 0; reporte en
      `recibos/23-estetica-home/audit-despues/` + screenshots.
- [ ] Recibo: qué cambió por sección, mediciones antes/después, archivos,
      gaps.

## Fuera de alcance

- Tokens globales (`styles.css` variables) — slice 22.
- Leaflet/atribución de mapa — slice del mapa.
- Copy/textos (salvo largo de línea si el audit lo marca).
- Lógica TS, datos, rutas.

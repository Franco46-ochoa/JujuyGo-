# Recibo — Slice 30: copy de home

**Ejecutor:** Devin (coordinador). Worktree: `.slices/30-copy-home`, rama `slice-30-copy-home`.

## Qué se hizo

Solo textos visibles de `frontend/src/app/home/home.html` (7 líneas cambiadas, 1 archivo). Sin tocar lógica, datos, estructura ni estilos. `home.ts` y `home.css` no necesitaron cambios.

### Textos finales exactos y decisión por punto

1. **Hero / H1** (spec: H1 descriptivo + identidad conservada)
   - Antes: `El norte que te queda` (H1) + `Empezá a imaginar` (CTA)
   - Después:
     - H1: `Descubrí Jujuy.` + segunda línea en `<em>`: `El norte que te queda`
     - El H1 sigue conteniendo ambas frases (lector de pantalla y SEO reciben "Descubrí Jujuy. El norte que te queda"), la primera línea comunica el producto y la segunda conserva la identidad emocional. No hizo falta CSS nuevo: se reutilizó la estructura `<br><em>` existente.
     - Eyebrow sin cambios: `Tu yapa para recorrer Jujuy`.

2. **Subtítulo / propuesta de valor**
   - Antes: `Los lugares que se sueñan, los bondis que sí pasan y el día que cierra. Todo en un solo plan.`
   - Después: `Los lugares que se sueñan, los colectivos que sí pasan y el día que cierra. Todo se arma sobre horarios reales.`
   - Decisión: se conservó la cadencia original (voz del producto) y se agregó el mecanismo real que la referencia aprobada pedía mencionar: la planificación sobre horarios reales del colectivo. No se usó la referencia literal ("Explorá destinos, organizá tus recorridos…") porque la frase existente ya hacía ese trabajo con más voz; el spec permitía refinar.

3. **"Base de operaciones"** (registro militar)
   - Antes (H2): `Base de operaciones`
   - Después: `Tu base en la Quebrada`
   - Decisión: el kicker "Dónde dormir" ya dice la categoría; el H2 ahora nombra el beneficio concreto (base para salir a recorrer, que es lo que dice el section-intro). Alternativa descartada: "Dónde dormir en la Quebrada" (repetía el kicker).

4. **Coordenadas decorativas** (corregido tras revisión del usuario)
   - Hero: `23.1858° S — 65.2995° O · 2.324 m` → **eliminada la línea completa**
   - Footer: `23.1858° S — 65.2995° O` → `Quebrada de Humahuaca · UNESCO 2003`
   - Decisión v1 (reemplazo por `Jujuy capital · 1.259 m s.n.m.`) fue revisada por el usuario: la combinación altitud de capital + "Quebrada de Humahuaca / Patrimonio de la Humanidad" + foto de Purmamarca podía leerse como dato del lugar fotografiado. **Decisión final: quitar la línea del hero.** La única referencia geográfica visible sobre la foto es ahora el hero-caption ("Quebrada de Humahuaca · Patrimonio de la Humanidad"), que describe correctamente la región de la imagen. El footer conserva un dato verdadero y útil (UNESCO 2003, ya insinuado por el caption) junto a "Jujuy, Argentina".
   - Deuda declarada: la regla CSS `.hero-coordinates` en `home.css` quedó sin uso (el spec limitaba home.css a tipografía del hero; la limpieza queda para otro slice).

5. **"bondis" → "colectivos"**
   - Hero-copy y footer corregidos. El resto de la app usa "colectivo"/"ómnibus"; se unificó a "colectivo" (registro neutro). "Bondi" era guiño porteño sin segunda aparición que lo justificara.

6. **CTA**
   - `Empezá a imaginar` → `Armá tu travesía`
   - Decisión: unifica con el CTA del nav (`Armá tu travesía`) y con el CTA de la banda de transporte — una sola acción primaria con el mismo nombre en toda la página (principio de CTA consistente). "Empezá a imaginar" era más vago sobre qué pasa después del click.

## Archivos tocados

- `frontend/src/app/home/home.html` — único archivo de código.
- `recibos/30-copy-home/` — este recibo + screenshots.

## Comandos corridos y resultados

- `npm install` (frontend + backend del worktree, no existían `node_modules`)
- `npm test -- --watch=false` (frontend): **69/69 tests, 12 archivos** ✅
- `npm run build` (frontend): OK, sin warnings de budget ✅ (rebuild post-corrección: main 275 kB)
- `git diff --check`: limpio ✅
- `git diff --stat`: 1 archivo, +6/−7 ✅
- Verificación en browser (Playwright/Chromium, build local servido en :4183):
  - Desktop 1440×900 y móvil 390×844 ✅
  - `document.querySelector('h1').textContent` → `"Descubrí Jujuy.El norte que te queda"` ✅
  - `.hero-coordinates` → ya no existe en el DOM (`sin-coordenadas`) ✅
  - Screenshots: `audit/antes-hero.png` (producción, copy viejo), `audit/despues-hero-v2.png` (desktop), `audit/despues-hero-mobile.png` (móvil), `despues-full.png` (página completa, versión anterior a la corrección de coordenadas)
  - Nota: 8 errores de consola en local por llamadas a la API (backend no corre en el serve estático); no relacionados con el copy.

## Confirmación de identidad

No se tocó `home.css`, `styles.css`, tokens ni `home.ts`. Paleta papel/tinta/óxido, Fraunces/Archivo y estructura de secciones intactas. El cambio visual es solo de texto; la manija `<em>` del H1 se reutilizó.

## Gaps / NO quedó

- No se cambiaron textos de otros componentes (travesia, como-llegar, lugar-detalle) — fuera de alcance.
- "Antes" del hero se capturó desde producción (que ya tiene los slices 26–29 mergeados); el resto de la página antes/después no se screenshotteó sección por sección, solo hero + página completa después.
- Tests de backend no se corrieron a mano acá; quedan cubiertos por `./slices verificar`.

===RECIBO===
hecho: copy de home actualizado según dirección de marca aprobada — H1 "Descubrí Jujuy." + "El norte que te queda" como línea de identidad, subhead con "colectivos" y "horarios reales", CTA unificado "Armá tu travesía", H2 "Tu base en la Quebrada", coordenadas del hero eliminadas (corrección por ambigüedad geográfica); footer con UNESCO 2003, "bondis"→"colectivos" en hero y footer. Solo home.html, sin lógica ni estilos.
archivos: frontend/src/app/home/home.html
chequeos: npm test 69/69 OK; npm run build OK; git diff --check limpio; verificación browser (H1 renderiza "Descubrí Jujuy.El norte que te queda"); screenshots antes/después en audit/
gaps: CSS .hero-coordinates quedó sin uso en home.css (fuera de alcance tipográfico); sin screenshots sección por sección; tests back corren vía verificar; referencia de subtítulo adaptada en vez de literal (justificado arriba)
===FIN===

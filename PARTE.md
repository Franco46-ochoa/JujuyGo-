# Parte — JujuyGo / Yapa

Fecha: 2026-11-13 · master: `75300bb` pusheado a origin · producción verificada: `75300bb` (main-FESCVGYX.js)

Producto: itinerario operable sobre horarios reales + yapas que respetan el reloj del colectivo. Turistas sin auto. "Jujuy se descubre. Jujuy se recorre." MVP gratis, navegación abierta, login Google para generar/guardar/compartir travesías. Ruta piloto verificada: Terminal SS.Jujuy → Maimará → Tilcara → Humahuaca.

---

## Etapa 1 — Base funcional y editorial (slices 01–28): HECHA

Todo mergeado y deployado. Qué quedó funcionando:

- **Datos y catálogo** (01, 03, 04, 16): andamio Angular+Express+Postgres, catálogo de zonas/lugares, dataset local versionado de horarios reales de la Quebrada (autorizado por el dueño de horario-quebrada + datos de colejuy: Santa Ana, El Urbano), fotos de lugares.
- **Movimiento** (05, 06, 15, 17–20): mapa Leaflet/OSM con geometría OSRM que sigue la calle, "Cómo llegar" con ruta interurbana, proxy de transporte urbano (paradas cercanas, acceso a RN9, transbordo terminal vieja → terminal de ómnibus), origen por GPS con fallback honesto.
- **Travesía** (07, 09, 10): planificador por día con validador de itinerario en backend, plan elegido, pulido editorial del copy.
- **Cuenta** (21): Supabase + login Google, travesías guardadas.
- **Sistema visual** (22–26): tokens de diseño (tinta/papel/arena/óxido/ocre/verde), home editorial, estética de Cómo llegar y detalle de travesía, tokens v2.
- **Yapas y rendimiento** (27, 28): copy de yapas vía capa Gemini en backend, lazy loading de rutas + preload del hero.

Deuda que nació acá y ya está saldada en etapa 2: hover 4,15:1 del mapa (→33), pin del cruce tapado (→33), `window.confirm` (→33), márgenes de traslado (→35).

## Etapa 2 — Corrección, a11y y rendimiento (slices 29–35): CERRADA

Push único `8e8929c..75300bb` (33+35+34+docs). Verificación en producción con Chrome DevTools:

- Home: H1 «Descubrí Jujuy. / El norte que te queda» (copy del 30 en prod), CTA «Armá tu travesía»; 1440 y 390.
- Imágenes: todas con `srcset`/`sizes`, WebP servido (hero `purmamarca-1280.webp` a DPR 3, `-640.webp` a DPR 1); preload con `imagesrcset`/`imagesizes`, 1 sola petición de hero; lazy activo en thumbs.
- Flujos: `/`, `/lugares/cerro-siete-colores` (hero eager `fetchpriority=high`), `/como-llegar`, `/travesia` (wizard + login Google) — todos renderizan.
- Consola: **0 errores, 0 warnings**; **0 requests ≥400** en las 4 vistas.

### Decidido y hecho (en master y producción)

- **29** navegación/accesibilidad — merge `499fe04`.
- **30** copy de home — `c7f8a47`; altura de Jujuy capital fuera del hero (no asociarla con la foto de Purmamarca).
- **31** limpieza — merge `a9ff60e`; validación de travesía cancelada al destruir la pantalla.
- **32** contraste/responsive (solo CSS del alcance) — merge `8e8929c`; 28/28 contrastes OK, regiones sin corte en 390/768/1440, pins sin recorte.
- **33** deuda a11y mapa — merge `1a25783`: hover 5,86:1; cruces y paradas debajo de su coordenada con pico; borrado con confirmación inline ("¿Borrar «…»?", foco en No, Escape cancela, foco restaurado); tipos huérfanos fuera.
- **35** margen de traslado — merge `834cf88`: fuente única `backend/src/itinerario/margenes.js` (15 min base + 30 con acceso local); `/api/travesia/contexto` expone `margenes`; validador, generador y yapas con la misma regla. El plan real ya no deja 10 min para 3 km (colectivo 08:10 en vez de 08:50).
- **34** imágenes — merge `1a09fda`: 30 WebP 640/1280/1920 con ffmpeg q75 commiteadas, helper `foto.ts` único, `srcset`/`sizes`, lazy salvo heroes, `imagesrcset` en preload. Bytes `/` 390: 2.635→145 kB sin scroll (−94%); scroll 3.555→193 kB; detalle 1.003→55 kB. Hero: 1 sola petición. Tests 80/80. Juez devin: CIERRA (`detail-hero` eager aceptado: es el hero/LCP de esa página).

### Falta para cerrar la etapa

Nada — etapa 2 cerrada el 2026-11-13.

### Deuda declarada que queda (futuros slices)

- LCP en 390: el elemento LCP es el `<h1>` (Google Fonts render-blocking), no la imagen — slice de fuentes si se quiere.
- Choques de etiquetas de mapa según zoom en general (el 33 cubrió cruces/paradas vs origen/destino solamente).
- `role=listitem` de `.map-place-card` (deuda del 29).
- `sizes` de tarjetas de zona calculados desde el CSS del grid, no medidos pixel a pixel.
- Margen de Hornocal: +30 min puede quedarse corto en la práctica (aceptado como valor inicial tuneable en `margenes.js`).
- Captura real del borrado inline (requiere sesión con travesía guardada); hoy el flujo está cubierto por tests.

### Decisiones tomadas en esta etapa

- Confirmación de borrado: tarjeta inline, no modal.
- Márgenes en UN solo archivo compartido (condición de Franco): cambiar una vez y ajusta todo.
- Imágenes: variantes derivadas del nombre en el frontend; DB intacta; JPG como fallback.
- Juez: `subagent_explore` con contexto fresco por slice; push único al final de la tanda.

## Etapa 3 — Rediseño (EN CURSO: specs escritos, pendiente de lanzamiento)

- Los dos prototipos originales vivían en una sesión de Devin Cloud que **expiró y no se puede revivir** ("too old"; preview 401). Se reconstruyeron el 2026-11-13 y quedaron públicos en GitHub Pages (branch `gh-pages`, sin tocar master):
  - Índice: https://franco46-ochoa.github.io/JujuyGo-/
  - Home más corto con fotos: https://franco46-ochoa.github.io/JujuyGo-/home.html
  - Plan con timeline/fotos/mapa por día: https://franco46-ochoa.github.io/JujuyGo-/travesia.html
- Fuente local de los prototipos: `C:\Users\Elect\orca\projects\prototipos-jujuygo\` (repo propio, branch gh-pages). Sistema visual fiel a `docs/design.md` + home.css; fotos y coordenadas reales del catálogo.
- **Revisión de Franco (2026-11-13)**: dirección visual y conceptual APROBADA en ambos (conservar como base, no empezar de cero). Copy favorito: "Los lugares que se sueñan, los colectivos que sí pasan y el día que cierra."
- **Correcciones ya aplicadas** a los prototipos (commits gh-pages `4854d67` + `84d46dc`):
  - Duración: "tres días, dos noches" (antes decía 3 noches).
  - Home: la banda de horarios subió — ahora va zonas → banda operativa → imperdibles (el diferencial aparece temprano).
  - **Horarios re-alineados al dataset autorizado** (`backend/src/data/horario-quebrada.js`, 896 servicios):
    - Regreso día 3: **15:10 Evelia → SSJ** (antes 15:30, que el dataset confirma que va a Perico — lo detectó Franco). Plan B: 15:50 Jama Bus, 16:15 Panamericano directo, 17:15.
    - Día 1: 08:00 Santa Ana local por Purmamarca → Humahuaca, bajada Tilcara ~09:50 (antes "08:10 Panamericano" inexistente en dataset).
    - Día 2: 08:40 Evelia → SSJ **local por Purmamarca entra al pueblo** — bajada en la parada del centro, no en el cruce. Vuelta: 14:40 Evelia → Humahuaca **desde el pueblo** (antes "14:20 Panamericano desde el cruce").
    - La caminata cruce↔pueblo (~2 km banquina) quedó como plan B con remis, NO como recomendación — pedido explícito de Franco hasta verificar el recorrido peatonal.
    - Banda home: servicios reales (07:00 Evelia directo, 08:30 Panamericano→Humahuaca, 11:20 Evelia directo).
  - Hornocal: traslado local etiquetado "sin horario fijo / verificar regreso".
- **Pendiente de validación de mundo real** (no resoluble con el dataset; Franco pidió mantenerla viva cuando el prototipo pase a código): condiciones/safety del sendero cruce↔pueblo; existencia real y horarios de los traslados compartidos a Hornocal (el dataset solo cubre colectivos de línea); vigencia actual del horario publicado.
- **APROBACIÓN DE FRANCO (2026-11-13)**: dirección conceptual y visual aprobada para ambos prototipos → se autorizaron los specs de etapa 3, sin ampliar alcance por iniciativa propia. Condiciones que quedan escritas dentro de los specs:
  - Datos demostrativos nunca como garantía funcional — todo sale de la API validada.
  - Hornocal conserva "sin horario fijo" + "verificar regreso".
  - Purmamarca usa la parada del pueblo cuando el servicio "por Purmamarca" corresponde.
  - La caminata por banquina nunca como opción recomendada (plan B con remis).
  - Horarios desde la fuente autorizada + nota de vigencia.
- **Specs escritos** (`specs/`, pendientes de lanzamiento):
  - `36-home-rediseno.spec.md` — home corto: hero → zonas → banda operativa (endpoint real `/transporte/proximos` + badges de confianza) → imperdibles → pausa → footer.
  - `37-travesia-timeline.spec.md` — plan por día: timeline con horas, badges por `confianza` real, foto por lugar, mapa Leaflet por día con fitBounds. Depende del 36 por las clases de badge.
  - `38-yapas-inline.spec.md` — yapas insertadas dentro del timeline con línea "Cierra porque…" compuesta de datos reales (nunca genérica). Depende del 37.
- **Siguiente paso**: lanzar la ola (36 y 37 son casi paralelizables — comparten solo clases de badge; 38 detrás del 37). `./slices lanzar <id>` por Orca/Copilot según `slices.conf`.

## Lo que no se toca (transversal)

- **Rediseño** sin aprobación de Franco.
- **Datos, migraciones y seeds**; los nombres de foto salen de la base.
- **Archivos fuera del "Alcance"** de cada spec: lo que sobra se declara como deuda en el recibo, no se arregla en silencio.
- **Tokens globales y CSS** fuera del alcance de cada slice.
- **Secretos** (Supabase, DATABASE_URL): no se exponen ni rotan.
- **Git**: workers no commitean/pushean; solo `./slices` mergea; push único por tanda.
- **Diffs ajenos**: solapamientos entre slices se declaran antes de mergear.

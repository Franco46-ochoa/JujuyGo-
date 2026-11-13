# Pendientes de la auditoría visual (12-nov)

Origen: auditoría de Devin sobre producción
(`https://jujuygo-web.vercel.app`, build `main-YOSN5ICB.js`), desktop
1440×900 y móvil 390×844. Los tres bugs principales van en
`specs/32-contraste-responsive-visual.spec.md`. Acá queda lo que NO
entra en ese slice, para que no se pierda.

## A. Optimización de imágenes (coordinar con el slice 28)

**Hecho medido.** `frontend/public/img/` tiene 10 JPG de 1920 px de
ancho, sin variantes:

| Archivo | Peso |
|---|---|
| garganta.jpg | 2,3 MB |
| humahuaca.jpg | 1,28 MB |
| calilegua.jpg | 1,18 MB |
| purmamarca.jpg | 1,03 MB |
| tilcara.jpg | 1,0 MB |
| puna.jpg | 586 kB |
| hornocal.jpg | 572 kB |
| salinas.jpg | 489 kB |
| tren.jpg | 410 kB |
| salsaju.jpg | 356 kB |

El home usa esos mismos archivos para todo: el hero (1570×992 en
desktop, 439×951 en móvil), las tarjetas de regiones (425×263) y las
miniaturas de imperdibles (96×59). Las de fuera del primer viewport ya
tienen `loading="lazy"`; el hero no tiene `fetchpriority`.

**Por qué importa.** El slice 28 hoy solo agrega `fetchpriority="high"`
y un `preload` del hero. Con eso el LCP sigue dependiendo de un JPG de
1 MB: dividir el JavaScript no alcanza.

**Alcance propuesto** (ampliar el 28 si todavía no cerró; si ya cerró,
slice nuevo que dependa de 28):

1. Generar variantes por foto: anchos 480 / 960 / 1600, en WebP (AVIF
   opcional), con JPG de respaldo. Miniatura dedicada de ~200 px para
   las filas de imperdibles y el selector de lugares de travesía.
2. `srcset` + `sizes` (o `<picture>`) en hero, tarjetas de regiones,
   panel de zona, imperdibles, detalle de lugar y selector de travesía.
3. `width`/`height` o `aspect-ratio` en cada `<img>` para no mover el
   layout.
4. `loading="lazy"` en todo lo que esté fuera del primer viewport;
   `fetchpriority="high"` y `preload` (con `imagesrcset`) SOLO para la
   imagen del hero.
5. Medir antes/después en el recibo: peso transferido del home en
   móvil y LCP (Lighthouse móvil), además del tamaño de bundle que ya
   pide el 28.

**Cuidado al coordinar.** `fotoUrl()` arma `/img/<archivo>` desde el
catálogo y hay tests que lo fijan (`lugar-detalle.spec.ts` espera
`/img/purmamarca.jpg`). El cambio toca `home.html`,
`lugar-detalle.html`, `travesia.html` e `index.html`: choca con 27, 28,
29 y 30, así que va después de ellos. Mantener `CREDITS.md` al día.

## B. Branding: JujuyGo (marca) y Yapas (recomendaciones)

**Decisión de Franco.** Marca pública: **JujuyGo**. "Yapas" identifica
solo las recomendaciones inteligentes. Hoy "Yapa" aparece como nombre
de la plataforma.

**Dónde aparece hoy "Yapa" como marca** (relevado en master `b079ada`):

- `frontend/src/index.html:5` — `<title>Yapa — Jujuy como se vive</title>`
- `frontend/src/app/app.routes.ts:8-12` — títulos de las cinco rutas
  ("Lugar — Yapa", "Cómo llegar — Yapa", "Armá tu travesía — Yapa")
- `home/home.html:5` — logo del header (`aria-label="Yapa, inicio"`)
- `home/home.html:366` — logo del footer
- `travesia/travesia.html:3`, `como-llegar/como-llegar.html:3`,
  `lugar-detalle/lugar-detalle.html:3` — logo de cada pantalla

**Qué NO se renombra:** el concepto de producto "yapa/yapas" ("Tu
yapa", tarjetas de yapa, `TipoYapa`, `/api/yapa/*`), ni nombres
técnicos (`yapa-mapa`, clases `.yapa-*`).

**Alcance propuesto (slice propio, no mezclar con accesibilidad):**

1. Reemplazar la marca visible por "JujuyGo" en los siete puntos de
   arriba, con sus `aria-label`.
2. Revisar el resto de textos visibles donde "Yapa" se use como nombre
   de la app y no como recomendación (footer, meta description, Open
   Graph, favicon/manifest si existen, `pitch/`, README).
3. Definir el tratamiento tipográfico del logo "JujuyGo" con la
   identidad actual (Fraunces, punto ocre). Hay material en
   `docs/mockups/logo/`.
4. Actualizar los tests que afirmen el texto de marca.

**Decisiones abiertas para Franco antes de escribir el spec:**

- Bajada del título de pestaña: ¿"JujuyGo — Jujuy como se vive" o
  "JujuyGo — El norte que te queda"?
- ¿El dominio/proyecto de Vercel cambia o queda `jujuygo-web`?
- ¿El pitch (`pitch/`) entra en el mismo slice?

**Orden.** Toca `app.routes.ts` (28 y 29), `home.html` (27, 29, 30) e
`index.html` (28): lanzarlo después de que cierren 28, 29 y 30.

## C. Contrastes menores (no bloquean el slice 32)

| Elemento | Archivo | Hoy |
|---|---|---|
| Flechas `.place-arrow` de imperdibles (`--t30` sobre papel) | `home/home.css:433` | 2.01:1 (decorativa, `aria-hidden`; el mínimo para gráficos es 3:1) |
| Botón "Ver recorrido" deshabilitado (`opacity: .55`) | `como-llegar/como-llegar.css:42` | 4.2:1 |

## D. Alojamientos y guías "Pendiente de verificar"

Las seis tarjetas de alojamientos muestran "Pendiente de verificar ·
Fuente: por verificar" (`home/home.html:248`; guías en `:281`). El
texto es honesto y hay un test que lo exige (`home.spec.ts:178`).

Regla: no convertirlo en información aparentemente confirmada y no
inventar datos. Opciones a decidir: (1) verificar los datos con fuente
real y marcar `verificado`; (2) mantener la sección con un aviso claro
de "listado en verificación" a nivel de sección; (3) ocultar la sección
hasta tener datos verificados.

## E. Otras observaciones

- En el mapa de `/como-llegar/cerro-siete-colores`, el pin intermedio
  "Purmamarca Cruce" queda tapado por el pin del destino. Requiere
  lógica en `yapa-mapa.component.ts` (después del 28).
- `/lugar/<slug>` (singular) y cualquier ruta inexistente redirigen al
  home sin aviso: ya está cubierto por el slice 29.
- En móvil el mapa de Cómo llegar ocupa mucho alto de pantalla; usable,
  a revisar en la segunda ronda de diseño.

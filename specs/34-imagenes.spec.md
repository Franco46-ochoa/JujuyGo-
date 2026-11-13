# Slice 34 — Optimización de imágenes: WebP, srcset/sizes y carga diferida

**Depende de:** 33 (los dos tocan `travesia.ts/html`), así que se lanza
después de mergear el 33. Coordina con el 28, que ya está mergeado: agregó
el `preload` y el `fetchpriority` del hero.

**Fuente:** `frontend/public/img/` tiene 10 JPG de 1920 px de ancho,
8.9 MB en total:

| Archivo | Tamaño | Dimensiones |
|---|---|---|
| garganta | 2.3 MB | 1920×2880 |
| humahuaca | 1.28 MB | 1920×2560 |
| calilegua | 1.18 MB | |
| purmamarca | 1.03 MB | hero |
| tilcara | 1.00 MB | |
| puna | 586 kB | |
| hornocal | 572 kB | |
| salinas | 489 kB | |
| tren | 410 kB | |
| salsaju | 356 kB | |

Se sirven siempre a 1920 px, aunque se pinten a 90 px (thumbs) o a
media pantalla.

**Restricciones:**
- Los nombres de archivo vienen de la base (columna `foto`). **No tocar
  datos ni migraciones**: las variantes se derivan del nombre en el frontend.
- Sin dependencias npm nuevas. Las variantes se generan una vez con `ffmpeg`
  (ya instalado, con `libwebp`) y se commitean. El comando exacto queda en el
  recibo.
- Los JPG originales quedan como fallback, sin cambios.

## Qué tiene que pasar

1. **Variantes:** para cada `img/<nombre>.jpg`, generar
   `img/<nombre>-640.webp`, `-1280.webp` y `-1920.webp`, con calidad ≈75,
   sin metadatos y sin ampliar (si el original es más chico, usar su ancho).
2. **Helper único:** archivo nuevo `frontend/src/app/foto.ts` con:
   - `fotoFallbackZona(zona_slug)`: el mapa actual quebrada → purmamarca,
     puna → puna, yungas → calilegua, valles → salsaju, y purmamarca por
     defecto.
   - `fotoSrc(foto, zona_slug)`: devuelve `/img/<archivo>.jpg`.
   - `fotoSrcset(foto, zona_slug)`: devuelve
     `"/img/<base>-640.webp 640w, /img/<base>-1280.webp 1280w, /img/<base>-1920.webp 1920w"`.

   `home.ts`, `travesia.ts` y `lugar-detalle.ts` dejan de tener su propia
   copia del mapa:
   - Sus `fotoUrl(...)` actuales delegan en `fotoSrc` y conservan la firma,
     para que los tests existentes de `fotoUrl` sigan pasando sin cambios.
   - Cada uno agrega `fotoSrcset(...)`, que delega en el helper.
3. **Templates:** cada `<img>` de foto de lugar o zona en `home.html`,
   `travesia.html` y `lugar-detalle.html` pasa a tener:
   - `[srcset]` y un `sizes` acorde al ancho pintado en 390, 768 y 1440,
     medido. Por ejemplo, los thumbs de 90 px usan `sizes="90px"`, y el hero
     usa `100vw`.
   - `loading="lazy"` y `decoding="async"` en todas, **salvo el hero**, que
     mantiene `fetchpriority="high"` sin lazy.
   - Las imágenes estáticas (`/img/purmamarca.jpg` del hero y `/img/puna.jpg`
     de `home.html:220`) usan el mismo esquema.
   - No incluye el avatar de `auth`.
4. **Preload del hero** (`index.html:9`): agregar `imagesrcset` e
   `imagesizes` idénticos a los del `<img>` del hero, para que el navegador
   use la precarga y no descargue el hero dos veces.

## Alcance de archivos

- `frontend/public/img/*.webp` (nuevos)
- `frontend/src/app/foto.ts` y `foto.spec.ts` (nuevos)
- `frontend/src/app/home/home.ts` y `home.html`
- `frontend/src/app/travesia/travesia.ts` y `travesia.html`
- `frontend/src/app/lugar-detalle/lugar-detalle.ts` y `lugar-detalle.html`
- `frontend/src/index.html`

**No tocar:** CSS, salvo que alguna imagen cambie de tamaño pintado (en ese
caso, declararlo); backend y datos; `CREDITS.md`; `angular.json`.

## Tests exigidos

- `foto.spec.ts`:
  - fallback por zona;
  - `fotoSrc` con foto y sin foto;
  - `fotoSrcset` con las tres variantes, a partir de un nombre `.jpg`.
- Los tests existentes de `fotoUrl` siguen pasando sin modificarse.

## Criterios de aceptación

- [ ] Pasan los chequeos de `slices.conf`. `npm run build` OK, sin error de
      presupuesto.
- [ ] `git diff --check` limpio. `git diff --stat` muestra solo el alcance,
      más `recibos/`.
- [ ] Existen las 30 variantes. El recibo tiene una tabla con el peso del JPG
      original y de cada WebP.
- [ ] Medición en navegador, con el build local antes y después, en 390×844
      y 1440×900:
  - total de bytes de imagen transferidos al cargar `/` sin scroll, en
    `/` con scroll completo, y en `/lugares/cerro-siete-colores`;
  - LCP en 390;
  - que el hero se pida **una sola vez**: requests a `purmamarca*` en
    `/`.
- [ ] Revisión visual de nitidez: capturas antes/después de hero, tarjetas de
      regiones y thumbs a 390 y 1440, en `recibos/34-imagenes/`.
- [ ] Recibo con el comando de `ffmpeg`, las tablas, los `sizes` elegidos por
      cada uso y los gaps (por ejemplo, la caché de Vercel no se toca).

## Fuera de alcance

- AVIF.
- CDN o transformaciones en Vercel.
- Cambiar las fotos o los créditos.
- Rediseño.

# Recibo — Slice 34: Optimización de imágenes (WebP, srcset/sizes, lazy)

===RECIBO===

## Hecho

### 1. Variantes WebP (`frontend/public/img/`)

Para cada uno de los 10 JPG se generaron `-640.webp`, `-1280.webp` y
`-1920.webp` (30 archivos, commiteados; los JPG originales quedan intactos
como fallback). Comando exacto ejecutado:

```bash
for f in *.jpg; do b="${f%.jpg}"; for w in 640 1280 1920; do
  ffmpeg -hide_banner -loglevel error -y -i "$f" \
    -vf "scale='min($w,iw)':-2" -c:v libwebp -quality 75 -map_metadata -1 \
    "${b}-${w}.webp"
done; done
```

(`min($w,iw)` evita ampliar si el original fuera más chico; todos son 1920px.)

| Archivo | JPG | 640w | 1280w | 1920w |
|---|---|---|---|---|
| calilegua | 1156 kB | 72 | 348 | 888 |
| garganta | 2256 kB | 148 | 652 | 1564 |
| hornocal | 560 kB | 28 | 132 | 356 |
| humahuaca | 1252 kB | 72 | 284 | 688 |
| puna | 572 kB | 36 | 132 | 300 |
| purmamarca | 1004 kB | 56 | 272 | 696 |
| salinas | 480 kB | 20 | 96 | 244 |
| salsaju | 348 kB | 16 | 60 | 164 |
| tilcara | 984 kB | 56 | 264 | 684 |
| tren | 404 kB | 28 | 96 | 188 |

### 2. Helper único (`frontend/src/app/foto.ts`, nuevo)

`fotoFallbackZona` (mapa quebrada→purmamarca, puna→puna, yungas→calilegua,
valles→salsaju, default purmamarca), `fotoSrc` (JPG) y `fotoSrcset` (las tres
variantes WebP derivadas del nombre). Las tres copias del mapa en `home.ts`,
`travesia.ts` y `lugar-detalle.ts` se eliminaron: sus `fotoUrl(...)` conservan
firma y delegan en `fotoSrc`; cada uno sumó `fotoSrcset(...)` que delega en el
helper (lugar-detalle resuelve `zona_slug ?? this.lugar()?.zona_slug` como
antes). Tests existentes de `fotoUrl` sin tocar y pasando.

### 3. Templates: srcset + sizes + lazy/async

| Imagen | sizes elegido | Carga |
|---|---|---|
| home `.hero-image` (purmamarca estático) | `100vw` | `fetchpriority="high"`, sin lazy |
| `.zone-card` grande (index 0) | `(max-width:620px) 90vw, (max-width:900px) 45vw, (max-width:1440px) 55vw, 776px` | eager |
| `.zone-card` chicas | `(max-width:620px) 90vw, (max-width:900px) 45vw, (max-width:1440px) 34vw, 480px` | lazy |
| `.place-thumb` (96px, oculto ≤900) | `96px` | lazy |
| `.photo-quote` (puna estático) | `100vw` | lazy |
| `.zona-panel-hero` (panel min(560px,100%)) | `(max-width:560px) 100vw, 560px` | lazy |
| `.zona-lugar-foto` (88px) | `88px` | lazy |
| travesia `.lugar-eleccion img` (90px / 76px ≤720) | `(max-width:720px) 76px, 90px` | lazy |
| detalle `.detail-hero img` | `100vw` | `fetchpriority="high"` (es el LCP de esa página; sin lazy — declarado) |

Todas con `decoding="async"` salvo el hero (mantiene solo fetchpriority).
Los sizes de zona se derivan de `.section` (máx. 1280px, padding 5% por lado)
y del grid `1.618fr 1fr` → `1fr 1fr` ≤900px → `1fr` ≤620px; se exponen como
`sizesZonaGrande`/`sizesZonaChica` en `home.ts`. Avatar de auth intacto.

### 4. Preload del hero (`index.html`)

`imagesrcset` e `imagesizes="100vw"` idénticos al `<img>` del hero; `href` JPG
queda como fallback de la precarga.

## Mediciones (build local, API de producción vía proxy CORS; `medir-34.mjs`)

Bytes de imagen transferidos (transferSize de performance entries):

| Vista | Antes | Después | Δ |
|---|---|---|---|
| `/` 390 sin scroll | 2.635 kB | 145 kB | −94% |
| `/` 390 scroll completo | 3.555 kB | 193 kB | −95% |
| `/` 1440 sin scroll | 2.982 kB | 800 kB | −73% |
| `/` 1440 scroll completo | 8.600 kB | 1.397 kB | −84% |
| `/lugares/cerro-siete-colores` 390 | 1.003 kB | 55 kB | −95% |
| `/lugares/cerro-siete-colores` 1440 | 1.003 kB | 694 kB | −31% |

Hero: **1 petición** en todos los casos (antes `purmamarca.jpg` 1.027 kB;
después `purmamarca-640.webp` 55,8 kB en 390 y `-1920.webp` 711 kB en 1440) —
la precarga con `imagesrcset` funciona y no hay doble descarga.

LCP en 390 (3 corridas por build): antes 1.420–4.016 ms, después 1.988–2.688 ms.
**El elemento LCP es el `<h1>` en ambos builds** (verificado con
PerformanceObserver: `tag: H1`), no la imagen — está acotado por Google Fonts
y la latencia de la API, no por los bytes de imagen. Sin regresión atribuible
al cambio; mejora real queda en bytes transferidos.

Capturas antes/ y despues/ de hero, `.zone-collage`, `.place-row` y
`.detail-hero` a 390 y 1440, más `medicion.json` completo por corrida.

## Chequeos

- `npm run build`: **OK**, sin errores ni presupuesto excedido (main 277,75 kB).
- `npm test -- --watch=false`: **80/80** (13 archivos; +6 de `foto.spec.ts`).
- `git diff --cached --check`: limpio.
- `git status`: solo archivos del alcance (`foto.ts`, `foto.spec.ts`, los 3
  pares `.ts`/`.html`, `index.html`, `*.webp` nuevos, `recibos/`).
- Hero pedido una sola vez en las 4 mediciones. ✔
- 30 variantes existen y pesan menos que el JPG salvo garganta-1920
  (1564 < 2256, también menor). ✔

## Archivos

- `frontend/public/img/*-{640,1280,1920}.webp` (30 nuevos)
- `frontend/src/app/foto.ts`, `foto.spec.ts` (nuevos)
- `frontend/src/app/home/home.ts`, `home.html`
- `frontend/src/app/travesia/travesia.ts`, `travesia.html`
- `frontend/src/app/lugar-detalle/lugar-detalle.ts`, `lugar-detalle.html`
- `frontend/src/index.html`
- `recibos/34-imagenes/` (medir-34.mjs, antes/, despues/, este recibo)

## Gaps

1. **`detail-hero` sin lazy**: el spec dice "lazy en todas salvo el hero"; la
   imagen principal del detalle es el hero/LCP de esa página, así que quedó
   eager con `fetchpriority="high"`. Declarado por si se prefiere literal.
2. **LCP no mejoró** en 390: el LCP es texto (h1), no imagen — queda deuda de
   fuentes (Google Fonts en render-blocking) fuera de alcance.
3. **Caché de Vercel no se toca**: al desplegar, los `.webp` nuevos se sirven
   como estáticos; el HTML cambia, así que no hay riesgo de srcset apuntando a
   archivos inexistentes (los assets viajan en el mismo deploy).
4. `sizes` de tarjetas de zona calculados desde el CSS del grid, no medidos
   por script pixel a pixel; los valores están a favor de resolución de sobra.
5. El spec pedía los `sizes` "medidos": los bytes medidos confirman que el
   navegador elige la variante esperada (ej. 640w en thumbs/390,
   1920w en hero 1440).

===FIN===

# Slice 36 — Rediseño del home: más corto, fotos primero, diferencial arriba

**Depende de:** nada de la tanda abierta. Toca `home.*`, que ningún slice
abierto usa.

**Fuente de verdad:** el prototipo aprobado por Franco
(`https://franco46-ochoa.github.io/JujuyGo-/home.html`, fuente local en
`C:\Users\Elect\orca\projects\prototipos-jujuygo\home.html`, commit gh-pages
`84d46dc`) + `docs/design.md`. El prototipo manda en estructura y copy; el
sistema de tokens ya está en el código.

**Restricciones duras (condiciones de aprobación de Franco):**
- La banda de horarios **no es texto fijo**: se alimenta del endpoint real
  `GET /api/transporte/proximos?origen=sansalvadordejujuy&destino=tilcara`
  (ya existe en `backend/src/routes/transporte.js`). Cada servicio muestra
  su `confianza` real (`publicado` / `estimado` / `tiempo-real`) como badge.
- Si el endpoint falla o no hay servicios, la banda muestra un mensaje
  honesto ("No pudimos traer los próximos servicios — consultá vigencia en
  la terminal"), nunca horarios de mentira.
- Nota de vigencia obligatoria bajo la lista: "Fuente y confianza
  corresponden al horario publicado; consultá vigencia antes de viajar."
- No tocar datos, migraciones, seeds ni backend.

## Qué tiene que pasar

1. **Orden del home** (objetivo del prototipo):
   hero → zonas (collage) → **banda operativa** → imperdibles → pausa
   fotográfica → footer. Eliminar/reordenar las secciones que hoy quedan
   entre zonas y el cierre (ver inventario actual en `home.html`); el home
   resultante tiene que ser visiblemente más corto que el actual.
2. **Banda operativa nueva** (`section.transport-band`, fondo `var(--verde)`,
   texto papel — ya hay precedente de banda oscura en el sistema):
   - Título: "El plan que respeta *el reloj del colectivo*".
   - Copy: "Cada tramo se apoya en horarios publicados. Si el día no cierra,
     te avisamos antes de salir."
   - Columna derecha: "Próximos servicios · Terminal a Tilcara" con hasta
     3 servicios de `/transporte/proximos`, cada uno con hora, empresa,
     destino/llegada estimada y badge de confianza.
   - CTA "Armá tu travesía →" a `/travesia`.
3. **`transporte.service.ts`**: agregar `getProximos(origen, destino)` que
   llame al endpoint existente y devuelva `RespuestaProximos` (el tipo ya
   existe en `travesia.types.ts`; si conviene, moverlo a un archivo de tipos
   compartido — declarar la decisión en el recibo).
4. **Badges de confianza**: componente/clases de badge compartibles
   (`badge-publicado`, `badge-estimado`, `badge-local`, `badge-tiempo-real`)
   con la estética del prototipo (etiqueta en small-caps Archivo, borde fino,
   sin relleno pesado). Este slice define el set canónico que el 37 reusa.
5. **Pausa fotográfica** antes del footer: cita a ancho completo sobre foto
   (ya existe `puna.jpg`), copy del prototipo: "Un viaje no es una sucesión
   de visitas, es la historia que se cuenta después."
6. **Hero y zonas**: conservar el actual (ya cumple el prototipo); solo
   ajustar si el orden nuevo deja algo colgado.
7. **Footer**: el del prototipo es mínimo ("Yapa." + tagline + línea
   Jujuy/Quebrada). Si el footer actual es otro componente compartido, no
   tocarlo — solo declarar la diferencia en el recibo.

## Alcance de archivos

- `frontend/src/app/home/home.html`, `home.ts`, `home.spec.ts`
- `frontend/src/app/transporte.service.ts` (+ su spec si tiene)
- CSS del home (`frontend/src/app/home/home.css` o donde viva) + clases de
  badge (ubicarlas donde pueda reusarlas el 37 — declarar en recibo)
- `frontend/src/app/travesia/travesia.types.ts` solo si se mueve el tipo
  `RespuestaProximos`

**No tocar:** backend, datos/seeds, tokens globales (`styles.css` salvo
clases de badge nuevas), `foto.ts`, otros componentes.

## Tests exigidos

- `transporte.service.spec.ts` o el spec que corresponda: `getProximos`
  arma la URL con `origen` y `destino` y parsea `servicios`.
- `home.spec.ts`: la banda renderiza servicios mockeados con su badge de
  confianza; estado de error muestra el mensaje honesto (no horarios
  inventados); orden de secciones (zonas antes que banda antes que
  imperdibles) verificable en el DOM.

## Criterios de aceptación

- [ ] Pasan los chequeos de `slices.conf`; `npm run build` OK.
- [ ] `git diff --check` limpio; `git diff --stat` solo muestra el alcance.
- [ ] La banda aparece antes de imperdibles en el DOM y en capturas
      390×844 y 1440×900 (`recibos/36-home-rediseno/`).
- [ ] Los servicios visibles provienen del endpoint real (verificación con
      el backend local levantado, o mock documentado si el backend no
      corre); cada uno lleva su badge de confianza.
- [ ] El home medido (altura de página o cantidad de secciones) es más
      corto que el actual — declarar el antes/después en el recibo.
- [ ] El copy aprobado está literal: "El plan que respeta el reloj del
      colectivo" y la nota de vigencia.
- [ ] Recibo con gaps (por ejemplo, footer compartido no tocado).

## Fuera de alcance

- El wizard/plan de `/travesia` (eso es el 37 y 38).
- Rediseño de `lugar-detalle` ni `como-llegar` (los prototipos no los
  cubren; Franco no los aprobó — no extender el rediseño por iniciativa
  propia).
- Nuevos endpoints o cambios de confianza en backend.

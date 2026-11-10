# Slice 16 — Catálogo: fotos únicas por lugar y conteo real

**Depende de:** master actual (`f209fff` o posterior).
**Alcance:** `backend/migrations/004-fotos-lugares.sql` (nuevo), `frontend/src/app/home/` (home.ts/html/spec), `frontend/src/app/lugar-detalle/lugar-detalle.ts` (solo fallback de foto), `frontend/src/app/travesia/travesia.ts` (solo fallback de foto), `frontend/public/img/` (assets + CREDITS.md), `frontend/src/app/*.spec.ts` que dependan del texto/fotos. NO tocar `backend/src/routes/`, `backend/src/data/`, `hq.js`, `osrm.js`, `como-llegar/`, `yapa-mapa/`, specs, docs/ (salvo CREDITS.md en public/img).

## Contexto

- La home dice "Los 17 atractivos del catálogo" (`home.html:120`) pero la base tiene
  **15 lugares**. El número debe salir del catálogo real, no hardcodeado.
- En `backend/migrations/001-zonas-lugares.sql`, **6 lugares tienen `foto = NULL`**:
  `lagunas-de-yala`, `termas-de-reyes`, `paleta-del-pintor`,
  `monumento-independencia-humahuaca`, `termas-de-caimancito`, `san-francisco-yungas`.
- `puna.jpg` está asignada a 3 lugares de Puna (`laguna-de-los-pozuelos`,
  `abra-pampa`, `la-quiaca`) — misma foto para tres destinos distintos.
- `docs/mockups/assets/humahuaca.jpg` existe pero nunca se copió a
  `frontend/public/img/` ni se asignó.
- Fallback actual: `fotoUrl()` en `home.ts`, `lugar-detalle.ts` y `travesia.ts`
  devuelve `/img/purmamarca.jpg` cuando `foto` es NULL → Lagunas de Yala muestra
  foto de Quebrada. **Nunca** usar una foto de otra zona como fallback.
- Assets disponibles en `frontend/public/img/`: calilegua, garganta, hornocal,
  puna, purmamarca, salinas, salsaju, tilcara, tren (+ CREDITS.md con licencias).

## Qué tiene que pasar

1. **Conteo real**: el texto de la home muestra la cantidad real de lugares del
   catálogo (dinámico desde la API o constante derivada). Actualizar specs que
   asuman "17".
2. **Fallback coherente**: `fotoUrl` (o equivalente) nunca devuelve la foto de
   otro destino. Si `foto` es NULL, usar una imagen genérica de la **zona** del
   lugar (mapa zona→imagen existente) o un placeholder neutro del sistema de
   diseño. Documentar la decisión en el recibo.
3. **Migración `004-fotos-lugares.sql`** que corrija asignaciones:
   - `monumento-independencia-humahuaca` → `humahuaca.jpg` (copiar el asset de
     `docs/mockups/assets/` a `frontend/public/img/` y registrar en CREDITS.md).
   - Los 3 destinos de Puna: asignar imágenes distintas y coherentes. Preferir
     fotos nuevas de Wikimedia Commons / Unsplash con licencia libre
     (CC0/CC-BY/CC-BY-SA) verificando que la imagen realmente corresponda al
     lugar; registrar fuente y licencia en `frontend/public/img/CREDITS.md`.
     Si no se consigue foto verificada, usar la imagen de zona que corresponda
     y dejar constancia en el recibo.
   - Los lugares con `foto = NULL` restantes: misma regla — foto verificada o
     fallback de zona, nunca `purmamarca.jpg` ni foto de otra zona.
4. La migración debe ser idempotente (`UPDATE ... WHERE` o equivalente) y el
   seed/tests existentes deben seguir pasando.
5. Tests: spec de home con el conteo dinámico, spec de `fotoUrl`/fallback que
   verifique que ningún NULL cae en foto de otra zona.

## Criterios

- [ ] `cd frontend && npm test -- --watch=false` verde con tests nuevos
- [ ] `cd backend && npm test` verde
- [ ] `npm run build` (frontend) OK
- [ ] Ningún lugar de la base queda con `foto = NULL` o con foto de otra zona
- [ ] `frontend/public/img/CREDITS.md` refleja todos los assets usados
- [ ] Home muestra el número real de atractivos
- [ ] Recibo con gaps honestos (fotos pendientes de curaduría si las hay)

## Fuera de alcance

- Carrusel multimedia / hero con movimiento (slice posterior)
- Nuevas zonas o lugares
- Cambios en el generador de travesías
- Curaduría completa de las 15 fotos (esto es corrección de incoherencias, no
  el set final editorial)
- NO commitear.

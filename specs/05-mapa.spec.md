# Slice 05 — Mapa Leaflet/OSM integrado al catálogo (issue #5, feature MAP)

**Depende de:** 03-catalogo (mergeado), 04-horarios (mergeado)
**Fuente:** GitHub issue #5 — `gh issue view 5`
**Alcance de archivos:** `frontend/` (componentes, rutas, estilos, package.json para deps nuevas), `backend/` solo si hace falta exponer coords (ya están en `lugar.lat/lng` — verificar). NO tocar `docs/`, `specs/`, `slices.conf`, ni `backend/migrations` (no hace falta schema nuevo).

## Contexto que hay que leer primero

- `docs/design.md` — sistema visual Yapa; el mapa debe verse artesanal, no Google-Maps-default
- `docs/referencias-design.md` — sección MAP (Stroly, AllTrails, Airbnb pins)
- `docs/mockups/mock-04.html` — referencia
- `frontend/src/app/catalogo.service.ts` + `catalogo.types.ts` — servicio existente
- `frontend/src/app/home/` y `lugar-detalle/` — páginas existentes a integrar
- Lugares ya tienen `lat`/`lng` en el catálogo (verificar en `backend/migrations/001-zonas-lugares.sql` y seed)

## Qué tiene que pasar

1. Instalar `leaflet` + `@types/leaflet` (o el wrapper Angular que elijas, pero Leaflet puro está bien).
2. Componente mapa reutilizable `yapa-mapa` que:
   - Use tiles OSM con estilo filtrado/tinteado a la paleta Yapa (filtros CSS/hue-rotate o tiles CARTO Positron — lo que quede más limpio; documentar la elección)
   - Pins por lugar con popup (nombre, zona, altitud); **clusters** por zona/pueblo con conteo
   - Inputs: lista de lugares, punto centrado, zoom; evento de selección de lugar
3. Integración:
   - En Home o sección Zonas: mapa con todos los lugares, sync con la lista (hover/click en item resalta pin y viceversa)
   - En `lugar-detalle`: mini-mapa centrado en el lugar con su zona de contexto
4. Móvil: gestos táctiles OK, el mapa no rompe el layout (altura contenida, no fullscreen robando scroll).
5. Tests: unit tests del componente (renderiza, emite selección, clusters con N items). Si el mapa necesita mock de Leaflet en tests, mockearlo — no depender de tiles en CI.

## Criterios de aceptación

- [ ] `npm test` frontend verde (incluye tests del mapa)
- [ ] `npm run build` OK
- [ ] Mapa visible en Home/Zonas con pins reales de los 17 lugares
- [ ] Clusters funcionan (>1 lugar en zona cercana agrupa)
- [ ] Sync lista↔mapa (selección cruzada)
- [ ] Estilo coherente con design.md (no mapa default azul chillón)
- [ ] kero-audit del mapa (contraste de controles, tamaño táctil, sin errores de consola)

## Fuera de alcance

- Routing/calcular ruta sobre el mapa (eso es #6)
- Tiempo real, rutas de transporte dibujadas (fase posterior)
- NO commitear.

# Slice 28 — Lazy loading de rutas y Leaflet

**Depende de:** master actual (archivos disjoint con 26/27/29 salvo
app.routes.ts → coordinar: este slice es el ÚNICO que toca
app.routes.ts).

**Alcance:** `frontend/src/app/app.routes.ts`,
`frontend/src/app/yapa-mapa/yapa-mapa.component.ts`,
`frontend/src/index.html`, `frontend/angular.json` solo si hace falta.
NO tocar lógica de negocio ni templates salvo preload link.

## Problema (evidencia de auditoría técnica)

- Las 4 rutas se importan estáticamente → todo en initial bundle
  (~833 kB): incluye Leaflet (~150 kB) y `@supabase/supabase-js` aunque
  el usuario nunca salga del home ni use mapa/travesía.
- `home.ts` importa `YapaMapaComponent` estáticamente → Leaflet en
  initial aunque el mapa esté bajo el fold.
- Hero `home.html:2` sin `fetchpriority="high"` ni preload → LCP lento.
- `supabase.client.ts` crea el client a nivel módulo (import-time
  side-effect) → supabase-js en initial.

## Qué hacer

1. **Rutas lazy**: convertir las 4 rutas a `loadComponent: () =>
   import('./home/home').then(m => m.HomePage)` (y equivalente para
   las demás). Verificar que los titles sigan funcionando.
2. **Leaflet dinámico**: dentro de `YapaMapaComponent`, hacer
   `const L = await import('leaflet')` en la inicialización del mapa
   (convertir init en async o lazy-init). Si es complejo, alternativa
   aceptable: lazy-load el componente mapa con `@defer`/`@placeholder`
   en home.html — elegir lo más simple que saque leaflet del initial.
   Documentar la decisión.
3. **Supabase lazy**: si es viable sin romper auth, hacer el client
   bajo demanda (ej. `getSupabaseClient()` lazy en supabase.client.ts).
   Si rompe el flujo de auth, dejarlo y documentarlo como gap.
4. **Hero LCP**: `fetchpriority="high"` en el `<img>` del hero
   (home.html:2) + `<link rel="preload" as="image"
   href="/img/purmamarca.jpg">` en index.html (verificar que la ruta
   del hero sea efectivamente purmamarca.jpg).
5. **Medir**: `npm run build` antes y después — registrar el tamaño del
  initial chunk en el recibo (objetivo: reducción visible, idealmente
  >20%).

## Criterios

- [ ] `npm test -- --watch=false` verde
- [ ] `npm run build` OK — **con números before/after en el recibo**
- [ ] `git diff --check` limpio
- [ ] Verificar en build output que existe chunk separado para rutas
      lazy y que leaflet no está en main (o documentar por qué no).
- [ ] Screenshots home/como-llegar/travesia funcionando post-cambio.
- [ ] Recibo con: tamaños antes/después, decisión Leaflet/Supabase,
      gaps.

## Fuera de alcance

- Rediseño visual, cambios de copy, lógica de rutas más allá del lazy.
- Service worker/PWA.

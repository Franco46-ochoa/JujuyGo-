# Slice 29 — Navegación, 404 y accesibilidad de teclado/foco

**Depende de:** master actual. Archivos: `app.routes.ts` (⚠️ el slice
28 también lo toca — coordinar orden: si 28 mergeó primero, rebase;
si no, este agrega la ruta 404 sin tocar las demás rutas),
`como-llegar/como-llegar.html`, `lugar-detalle/lugar-detalle.html`,
`home/home.html`, `home/home.ts`, CSS de componentes.

**Alcance:** templates/TS/CSS de navegación y a11y. NO tocar lógica de
ruteo/transporte ni estilos de tokens (slice 26).

## Problemas (evidencia de auditoría)

1. **Sin vuelta contextual**: como-llegar solo tiene "← Volver a
   explorar" aunque se entre desde `/lugares/:slug` — falta "← Volver
   a {lugar}". lugar-detalle igual: "← Volver a explorar" sin contexto
   de zona.
2. **404 silencioso**: `app.routes.ts` `{ path: '**', redirectTo: '' }`
   — links rotos caen a home sin aviso. lugar-detalle sí tiene estado
   "no encontrado" — inconsistencia.
3. **`.map-place-card` no operable por teclado** (home.html:146-155):
   `tabindex=0` + click pero sin keydown.enter/space; y `mouseenter`
   sin `mouseleave` → pin queda seleccionado para siempre.
4. **Panel de zona sin focus management** (home.html:331-361):
   `role="dialog" aria-modal` abre sin mover el foco adentro ni
   devolverlo al trigger al cerrar.
5. `lugar-detalle.html:13` muestra "Reintentar" solo si el mensaje
   contiene 'conexión' — string-match frágil; error 500 no ofrece retry.

## Qué hacer

1. **Breadcrumbs/vuelta contextual**:
   - como-llegar con `:slugLugar` → link "← Volver a {nombre lugar}"
     (nombre desde el catálogo) además del "Volver a explorar".
   - lugar-detalle → link a su zona (`#zonas` o filtro si existe) y
     mantener "Volver a explorar".
2. **Página/estado 404**: en vez de redirect silencioso, mostrar un
   estado simple integrado al diseño (puede ser un componente mínimo
   o un estado en home): "No encontramos esta página" + link a home +
   link a explorar. Decidir lo más simple consistente con la app.
3. **Teclado en cards del mapa**: convertir `.map-place-card` a
   `<button>` o agregar `(keydown.enter)`/`(keydown.space)` +
   `(mouseleave)`/`(focusout)` para limpiar selección. Mínimo cambio
   visual.
4. **Focus en panel de zona**: al abrir, `focus()` al primer elemento
   interactivo o al heading del panel (`tabindex="-1"`); al cerrar,
   devolver foco al botón que lo abrió. Escape ya funciona — mantener.
5. **Error retry**: en lugar-detalle, usar una señal/flag
   `esErrorDeRed` en vez de `includes('conexión')` para decidir
   mostrar "Reintentar" (o mostrar retry siempre que haya error).
6. Respetar `prefers-reduced-motion` si se agregan transiciones.

## Criterios

- [ ] `npm test -- --watch=false` verde
- [ ] `npm run build` OK
- [ ] `git diff --check` limpio
- [ ] Verificación manual documentada en recibo: tab+enter en card del
      mapa selecciona lugar; panel de zona atrapa y devuelve foco;
      ruta inexistente muestra 404 amigable; como-llegar desde lugar
      muestra vuelta al lugar.
- [ ] Screenshots antes/después de los estados tocados.
- [ ] Recibo con: navegación agregada, decisiones 404, gaps.

## Fuera de alcance

- Rediseño visual, nuevos componentes de navegación globales (navbar
  nuevo), lógica de transporte.
- Cambios en app.routes.ts que pisen el trabajo del slice 28.

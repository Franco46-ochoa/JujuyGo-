# Slice 10 — El plan lo elige el turista + yapas contextuales + fixes de análisis

**Depende de:** todo lo mergeado hasta `97a7ce0`.
**Alcance:** `frontend/src/app/travesia/`, `frontend/src/app/home/` (solo estilos puntuales si hace falta), `frontend/src/app/app.config.ts`, `backend/src/itinerario/`, `backend/src/routes/travesia.js`, `backend/test/`. NO tocar otras páginas ni migraciones.

## Contexto

- `frontend/src/app/travesia/travesia.model.ts` — hoy `crearPlan` ordena ALFABÉTICO y reparte 2 lugares por día a 09:00/14:00 sin mirar geografía ni horarios. Eso genera planes imposibles (4/6 días con conflicto).
- `backend/src/itinerario/validar.js` — valida tramos RN9, devuelve `tramos` y `conflictos` con slugs crudos.
- `frontend/src/app/travesia/travesia.ts|.html` — wizard 3 pasos + plan editable.
- `backend/src/routes/catalogo.js` — patrón de router.
- Feedback del usuario: "el turista no puede elegir: día 1 quiero hacer ESTO, y la IA de una sugerencia respecto a lo que quiere hacer".

## Qué tiene que pasar

### A. El turista elige (wizard paso 4 + plan)

1. Paso nuevo del wizard **"¿Qué querés hacer?"** (después de intereses): lista del catálogo
   agrupada por zona con foto, nombre, localidad, altitud; multi-select con chips/cards.
   El turista puede marcar lo que quiera (mín. 1). Puede saltear el paso y dejar que
   se propongan lugares por intereses (comportamiento actual mejorado).
2. `crearPlan` rediseñado:
   - Si el turista eligió lugares → SOLO esos, distribuidos por día.
   - Si no eligió → sugerir por intereses (mismo scoring actual).
   - **Orden de días por geografía, no alfabético**: agrupar por zona y ordenar los días
     siguiendo la RN9 (de sur a norte: San Salvador → Purmamarca → Tilcara → Humahuaca →
     Puna). Lugares de la misma localidad/zona van al MISMO día si caben (2-3 por día máx).
   - Horas iniciales respetando el primer servicio RN9 disponible de `horarios` si se
     puede consultar (si no, mantener 09:00/14:00 pero NUNCA dos zonas incompatibles el
     mismo día).
3. En el plan generado, cada evento puede **moverse entre días** (ya existe) y el turista
   puede **agregar lugar a un día** con un picker inline.

### B. Yapas contextuales (sugerencias honestas)

1. Motor de sugerencias en frontend (puro, testeable, `travesia.yapas.ts`):
   - Reglas reales: misma localidad, misma zona, ruta RN9 contigua (paradas adyacentes),
     altitud compatible (no meter 3.600 msnm un día después de 2.300 → sugerir aclimatación).
   - Ejemplo canónico: si el turista marca **Volcán** → sugerir **Purmamarca/Cerro de los
     Siete Colores**: "el colectivo a Volcán pasa por el cruce, podés bajar, caminar el
     pueblo y seguir a la tarde". Verificar que el tramo exista en `horarios` antes de
     ofrecerlo.
   - Cada yapa: `{ tipo, lugar_sugerido_slug, mensaje, accion }` estructurada — NADA de
     textos prefijados genéricos; el mensaje se arma con datos del catálogo/horarios.
2. UI: bloque "Tu yapa" por día o al elegir lugar en el wizard — card editorial
   (kicker "yapa", serif), botones "Sumar" / "Dejar pasar". Aceptar suma el lugar al plan
   (y revalida); dejar pasar lo descarta (recordarlo en sesión para no insistir).
3. Mostrar UNA yapa activa a la vez; máximo 2 por día. Sin spam.

### C. Fixes del análisis

1. **Wizard ya no desaparece con error**: errores de validación de paso (fechas vacías,
   fecha_fin < fecha_inicio) se muestran inline junto al campo, el wizard queda montado.
2. **Slugs humanizados en la UI**: los conflictos y tramos muestran nombres de parada
   ("Terminal de San Salvador", "Purmamarca Cruce", "Abra Pampa") — mapear slug→nombre
   en frontend con los datos de `/api/transporte/paradas` si existe, o tabla local.
3. **Locale es-AR**: registrar `es` (registerLocaleData de @angular/common/locales/es)
   en app.config → números con punto de miles ("3.484 msnm") y fechas es.
4. **Contraste hero móvil**: el `em` ocre sobre foto — subir sombra/contorno o llevar el
   hero-copy a un bloque con velo local para legibilidad en 390px.

## Criterios de aceptación

- [ ] `npm test` front verde — incluye tests del generador (orden geográfico, mismos
      lugares elegidos, nunca 2 zonas lejanas por día) y del motor de yapas
      (Volcán → propone Cerro Siete Colores si el tramo existe)
- [ ] `npm test` back verde
- [ ] `npm run build` OK
- [ ] Wizard: error inline sin desmontar; paso "qué querés hacer" funcional
- [ ] Plan con fechas+intereses por defecto genera días geográficamente coherentes
      (ej: Quebrada junta, Puna junta — nunca Abra Pampa y Yala el mismo día)
- [ ] Al elegir Volcán aparece la yapa de Purmamarca (si el tramo RN9 existe)
- [ ] Slugs no aparecen nunca en UI; números con formato es-AR
- [ ] kero-audit `/` y `/travesia` 390x844 + 1440x900 sin hard fails ni console errors
- [ ] La yapa NUNCA propone horarios/tramos inexistentes (si no hay servicio, no se ofrece)

## Fuera de alcance

- LLM real para yapas (este motor es reglas honestas; el texto se genera con datos del
  catálogo, no con frases prefijadas)
- Persistir/ compartir travesía (#10)
- NO commitear.

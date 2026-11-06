# Referencias de diseño — JujuyGo (curada por 4 workers de investigación, nov-2026)

~45 fuentes revisadas → las ~20 que valen. Marcada con ⭐ lo que yo robaría sí o sí.
Mirá las URLs y decime qué sacás de cada una; después sale `design.md`.

## La espina dorsal (estructura del producto)

- ⭐ **PA Wilds** — pawilds.com · taxonomía "Landscapes & Journeys" = zonas↔itinerarios, idéntica a JujuyGo. Mapa ilustrado como hero + descargable; marketplace de artesanos locales.
- ⭐ **chile.travel Atacama** — chile.travel/en/destinations/san-pedro-de-atacama · el itinerario como DATO: `días, distancia, temporada, atractivos` + contenido día a día + tips honestos ("must-know: altura, última combi, efectivo"). Modelo del SPEC de JujuyGo.
- **Netflix Voyage en France** — voyageenfrance.netflix.com · mapa↔diario: cada parada del itinerario tiene entrada editorial; "create your own guide". Monocromo con un solo acento fuerte.
- **newzealand.com** — itinerarios por "¿cuántos días tenés?" (3/5/7) — la pregunta real del turista, encaja con ITI por rango.
- **visit.brussels** — itinerarios por perfil (pareja, familia, mochilero) → matching con REC.
- **Masar Destination** — masardestination.com.sa · el mapa ES la interfaz; toggle de modos (día/noche → para nosotros: explorar/operativo con capa colectivos on/off).

## Movimiento y rutas (RUT, MOV, ITI)

- ⭐ **Citymapper GO** — el "paso activo": una tarjeta grande con lo que toca ahora ("bajá en la próxima"), no lista eterna. + rutas con nombre humano ("la más simple").
- ⭐ **Moovit** — separación caminar/esperar/viajar como segmentos visuales distintos; "viajás N paradas"; "avisame antes de bajar" (Get Off Alert); botones Earlier/Later.
- **Transit app** — timeline vertical donde cada tramo usa el color de la línea/empresa de colectivo; fiabilidad crowdsourced.
- **Rome2Rio** — fila expandible por tramo: resumen (modo+tiempo+$) → "dónde se sube, qué empresa, conexión". Acepta destinos por landmark.
- **Visit A City** — auto-genera el día respetando constraints y avisa conflicto → "⚠ no cierra: último bondi a Salinas 16:30, llegás 17:10". El diferencial exacto.
- **Wanderlog** — chips "tiempo·distancia" entre paradas; mapa coloreado por día; optimize route.
- **Cuándo SUBO (AR)** — distingue tiempo real vs horario teórico. En Jujuy casi todo es teórico → "sale ~9:40 (horario publicado)" sin mentir ETA.
- **Komoot/Strava** — etapas por alojamiento (multi-día) + perfil de elevación scubbeable de la Quebrada bajo el step list.

## El mapa (MAP)

- ⭐⭐ **Paula Calvo** — paulacalvo.com.ar/mapas-turisticos · ilustradora de los mapas turísticos OFICIALES de Quebrada y Puna jujeña (ed. 2025). Referencia estética local; candidata a comisión.
- ⭐ **Stroly** — stroly.com · GPS real sobre mapa ilustrado a mano = el modelo exacto de MAP en Leaflet (`L.imageOverlay` + pins que ocultan detalle).
- **NPS Unigrid** — relieve sombreado + pictogramas uniformes + vista bird's-eye; la Quebrada pide relieve.
- **Mapbox Pencil/hand-drawn** — demuestra que OSM real puede parecer dibujado (tiles custom).
- **AllTrails/Airbnb** — pins "trailhead" por pueblo ("Tilcara · 5"), píldoras con info, lista↔mapa siempre sincronizados.

## Tono y sistema (dirección visual)

- ⭐ **Explora** — explora.com · misma geografía (puna/salares): altitud + coordenadas como ornamento tipográfico, itinerarios llamados "travesías", lujo de lo esencial.
- **Travel Sensations** — calidez narrativa + GPS-as-ornamento (ya referencia).
- **Jesko Jets** — tipo enorme + precisión blueprint para datos duros (ya referencia).
- **Faroe Space Program** — variable font que reacciona al scroll; color inesperado (azul-magenta atardecer > otro terracota).
- **Sumène Artense** — destino chico con scroll-storytelling sin WebGL + menú inmersivo-legible + 404 narrativo.
- **Spain Collection** — itinerarios con jerarquía editorial (nombre, foto dominante, metadatos finos) no card de marketplace.

## Datos y alianzas (no diseño, pero oro)

- ⭐ **horario-quebrada.netlify.app** — dev jujeño mantiene TODAS las paradas SS.Jujuy→La Quiaca (tiempos, precios, "solo efectivo", domingos menos). Dataset real para MOV; posible aliado.
- **visitsalta.ar / tucumanturismo** — regiones con imperdibles + directorio prestadores habilitados + horarios oficiales de micros (precedente).
- **visiticeland /llms.txt** — publicar el contenido en Markdown para LLMs: diferenciador barato para REC.
- **sanpedrodeatacama.travel** — card "a X km + medio día" + checklist por email.

## Baselines a superar

- turismo.jujuy.gob.ar (vivo pero finísimo), Jujuy Energía Viva (muerta 2019), Visit de argentina.travel (IA genérica sin transporte local).

## Mi lectura (Devin)

El consenso de los 4 frentes: **mapa ilustrado vivo + timeline de tramos coloreados + honestidad de horarios + datos como ornamento**. Tres niveles de dirección posible para design.md:

- **A. Artesanal** — mapa ilustrado tipo Paula Calvo + tierra/quebrada + travesías: única, local, más trabajo.
- **B. Editorial confiable** — tipo Explora/Citymapper: sobria, tipo grande, datos quirúrgicos. Menos riesgo.
- **C. Híbrida (mi voto)** — sistema editorial limpio con UN artefacto artesanal: el mapa de la Quebrada como hero y como MAP. Lo premiado sin lo frágil.

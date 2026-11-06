# JujuyGo — scope (kero-scope)

Tesis (docs/research.md): el turista sin auto no puede armar un día real con transporte público. JujuyGo = itinerario operable sobre horarios reales + recomendaciones de IA que respetan el reloj del colectivo.

## La lista

### Explorar y decidir

| Code | Feature | Qué hace |
|---|---|---|
| ZON | Catálogo de zonas y atractivos | Ver qué hay en cada región/localidad con datos prácticos, no folleto |
| GUI | Directorio de guías registrados | Encontrar guía habilitada (Registro Provincial, Ley 6308) por zona |
| HOT | Alojamiento y gastronomía por zona | Ver dónde dormir y comer según la zona del itinerario |

### Moverse

| Code | Feature | Qué hace |
|---|---|---|
| MOV | Colectivos con horarios reales | Saber qué línea sirve el tramo, a qué hora pasa y cuándo vuelve |
| MAP | Mapa OSM/Leaflet | Ver atractivos, paradas y el itinerario sobre el mapa |

### Armar el día

| Code | Feature | Qué hace |
|---|---|---|
| ITI | Itinerario por día | Armar un día que cierra: qué colectivo, cuánto tiempo en cada parada, a qué hora volvés |
| REC | Recomendaciones IA estructuradas | "Un día en Tilcara sin auto" → JSON que el front convierte en plan, no chat |

### Llevarlo

| Code | Feature | Qué hace |
|---|---|---|
| SAV | Guardar y compartir itinerario | Volver al plan en la parada sin reconstruirlo |
| LNG | Español / Portugués / Inglés | El 15% extranjero (Brasil primero) lee en su idioma |

## Lo que JujuyGo no hace

- **Trámites, turnos, agenda de gobierno** — es el trabajo de Tu Jujuy; competir ahí es perder.
- **Reservas ni pagos** — quién paga (hoteleros/guías vs gratis) es decisión abierta del plan, no del listado.
- **Seguridad/911, registro de excursión** — ya lo cubre Jujuy Destino Seguro.
- **Chat libre con IA** — la IA devuelve JSON estructurado; chatbot es costo sin diferencial (ChatIA de Salta ya lo hace).
- **Guía enciclopédica estática** — es exactamente lo que mató a Jujuy Energía Viva.
- **Colectivos urbanos de SS. Jujuy como producto** — la app de Santa Ana los cubre; se usan como dato, no como feature.

## Brechas a validar en el plan (no en esta lista)

- API de Santa Ana: la app existe (oct-2026); un endpoint consumible es suposición a validar — fallback: horarios estáticos Terminal + Moovit.
- Datos de zonas/hoteles/guías: fuente oficial (Min. Turismo) vs curado propio.

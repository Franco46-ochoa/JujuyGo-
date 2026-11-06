# Spike #11 — API de Santa Ana: ¿tiempo real posible?

**Fecha:** 2026-11-06 · **Método:** inspección de la app web `bus.santaanasrl.com.ar` (Next.js) + probing directo de endpoints.

## Hallazgos

La app "Santa Ana Bus" (lanzada oct-2026) consume dos hosts:

- `bus.santaanasrl.com.ar` — frontend Next.js con endpoints `/api/*` propios
- `api.santaanasrl.com.ar` — API principal + `appwrite.santaanasrl.com.ar/v1` (backend Appwrite)

### Endpoints PÚBLICOS (sin auth, verificados)

| Endpoint | Devuelve |
|---|---|
| `GET bus.santaanasrl.com.ar/api/lines` | 39 líneas urbanas con `activeBuses` y `status` (ONLINE) |
| `GET bus.santaanasrl.com.ar/api/line-stops?lineId=X` | Paradas con lat/lng, dirección ida/vuelta, orden |
| `GET api.santaanasrl.com.ar/api/line-routes` | Geometrías de recorridos (paths lat/lng) |

### Endpoints con AUTH ("Autenticacion requerida" / 403)

| Endpoint | Qué daría |
|---|---|
| `api.santaanasrl.com.ar/api/web/vehicles` | **Posiciones en tiempo real de las unidades** |
| `api.santaanasrl.com.ar/api/web/stop-arrivals` | Arribos estimados por parada |

## Decisión

**Parcial.** Lo que SÍ es consumible hoy:

- Catálogo de líneas urbanas + paradas + geometrías → usable para "cómo llegar" **dentro de SS.Jujuy** (ej: aeropuerto → terminal) y para enriquecer MAP con recorridos reales.
- `activeBuses` por línea como señal de servicio activo.

Lo que NO es consumible sin acuerdo:

- Posiciones GPS en tiempo real y arribos estimados → requiere auth (Appwrite). Para integrarlo hay que gestionar acceso con Santa Ana SRL (son una empresa local, contacto viable) o seguir la app y ver si el token es reutilizable (ética/legal: no scrapear auth ajeno sin permiso).

**Alcance crítico:** esto cubre la red URBANA (Alto Comedero ↔ SS.Jujuy, 39 líneas). La línea interurbana RN9 a la Quebrada (nuestro MOV principal del issue #4) es otro servicio — los horarios publicados quedan como fuente hasta que Santa Ana confirme si la RN9 está en esta API o es operada aparte.

## Follow-ups

1. **Contacto Santa Ana SRL** (Pellegrini 950, SS.Jujuy): pedir acceso de lectura a `/api/web/vehicles` + `/api/web/stop-arrivals`, o confirmar si la RN9 interurbana está en la plataforma.
2. Mientras tanto: consumir el catálogo público (líneas/paradas/rutas urbanas) como capa extra de MOV — issue futuro.
3. `confianza='tiempo-real'` queda disponible en el modelo (issue #4) para cuando haya acceso.

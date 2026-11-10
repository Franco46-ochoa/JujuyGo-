# Slice 20 — Combinaciones urbanas con transbordo en "Cómo llegar"

**Depende de:** 19-urbano-acceso-rn9 mergeado (`02604b7`) + fix `5214cba` (no sugerir
urbano si origen ≈ salida RN9).
**Alcance:** `frontend/src/app/como-llegar/` (como-llegar.ts/html/css/spec) y, si hace
falta, un helper puro nuevo tipo `frontend/src/app/como-llegar/urbano-ruteo.ts` +
su spec. NO tocar backend, migraciones, catálogo, home, lugar-detalle, travesia,
specs, docs.

## Contexto

- La sección "Colectivo urbano" (directa o "hacia la salida RN9") usa
  `buscarLineasCandidatas`: líneas con parada ≤600 m del origen Y ≤600 m del destino,
  mismo `direction`, `order` ascenso < descenso.
- Caso real verificado: usuario en oeste de SSJ (-24.1796,-65.3449) → Terminal
  (-24.2128,-65.2891). NO hay línea directa; el usuario sabe que se hace con
  transbordo (ej. por la "terminal vieja"). La app hoy solo muestra "no encontramos"
  + paradas cercanas.
- `/api/urbano/red` ya trae TODAS las paradas de las 54 líneas con `lat/lng`,
  `direction`, `order`, `name` — alcanza para armar un grafo de paradas en el cliente.
- Restricciones duras del producto: nunca inventar líneas/paradas; distancias
  aproximadas siempre marcadas; la combinación es una sugerencia ("confirmá en la
  parada"), no un itinerario oficial con horarios (no existen horarios urbanos).

## Qué tiene que pasar

1. **Helper puro `urbano-ruteo.ts`** (testeable sin Angular): dado `red`, origen y
   destinoUrbano, devolver rutas con **hasta 1 transbordo**:
   - Legado A: línea con parada ≤600 m del origen; sus paradas intermedias en el
     `direction` correcto (order ascenso < order descenso, como hoy).
   - Transferencia: una parada de A a ≤250 m de una parada de otra línea B
     (tolerancia documentada), donde B tiene sentido coherente hacia el destino.
   - Legado B: línea B con parada ≤250 m del punto de transferencia y ≤600 m del
     destinoUrbano, mismo sentido y order coherente (subís después de bajar).
   - Puntaje: priorizar menos distancia total caminada + menos transbordos; devolver
     top N (ej. 5) deduplicadas por par (lineaA,lineaB).
   - Caso borde: si ya hay candidatas directas, las combinaciones van DESPUÉS y
     rotuladas distinto ("Con transbordo").
2. **UI en la sección urbana** (tanto intra-urbano como acceso-RN9): debajo de las
   candidatas directas, listar combinaciones como paso a paso:
   "Tomá la {lineaA} sentido {dirA}, bajá en {paradaTransfer} y tomá la {lineaB}
   sentido {dirB}, bajá en {paradaDescenso}" + distancias aproximadas de cada tramo.
   - Sin geometría de mapa obligatoria para combinaciones (la polilínea RN9 se
     conserva; si es barato, se puede usar la geometría de la primera línea).
   - Texto honesto: "combinación estimada con datos de paradas publicados; los
     cruces pueden variar — confirmá en la parada". Fuente colejuy visible.
   - Si no hay ni directas ni combinaciones: mantener el fallback actual
     ("no encontramos" + paradas cercanas).
3. **Tests del helper**: armar una red sintética mínima (2 líneas, paradas con
   coords/direction/order) y cubrir: combinación válida con transbordo, rechazo
   por sentido/order incoherente, rechazo si la transferencia >250 m, dedupe,
   top-N, y que sin líneas no devuelve nada.
4. **Tests del componente**: sección muestra "Con transbordo" solo cuando hay
   combinaciones y no hay directas (o después de ellas), texto honesto presente,
   caso sin datos → fallback intacto.

## Criterios

- [ ] `cd frontend && npm test -- --watch=false` verde con tests nuevos
- [ ] `cd backend && npm test` verde (no debería tocarse)
- [ ] `npm run build` OK
- [ ] Manual con datos reales: el caso oeste-SSJ → Terminal muestra al menos una
      combinación plausible (línea cercana al usuario → transferencia → cerca de
      la Terminal), o el fallback honesto si la red no la permite
- [ ] Ningún dato inventado: líneas/paradas solo de `/api/urbano/red`
- [ ] kero-audit 390x844 + 1440x900 sin fallas duras ni console errors
- [ ] Recibo con gaps honestos (ej. si la red de paradas tiene huecos que impiden
      probar el caso real del usuario)

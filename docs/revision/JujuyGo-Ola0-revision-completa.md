# JujuyGo — Ola 0 para revisión (2026-11-15)

Un solo archivo con todo. Orden: plan, 039, 036, 040–046, inventario, design.md, diff de design.md, script del hash.


---

<!-- ARCHIVO: docs/plan-cierre.md -->

# Plan de cierre y entrega — JujuyGo

> Ola 0, preparada el 2026-11-15 para que la revise Franco. **No se lanzó
> ningún slice.** Master `7bc370b`.
> Complementa `PARTE.md` (estado) y `docs/estado.md` (histórico).

## 1. Entregables de la Ola 0

| Entregable | Archivo | Estado |
|---|---|---|
| Spec 039 corregido | `specs/039-fuente-horarios.spec.md` | listo para revisión |
| Spec 036 reescrito según la maqueta | `specs/036-home-rediseno.spec.md` | listo para revisión |
| Specs 040–046 | `specs/040-…` a `specs/046-…` | listos para revisión |
| `design.md` alineado a la maqueta | `docs/design.md` | editado (ver §6) |
| Inventario de imágenes | `docs/inventario-imagenes.md` | listo para revisión |
| Specs 037 y 038 reemplazados | `specs/reemplazados/` (`git mv`, reversible) | movidos para que `./slices auto` no los lance |

## 2. Decisiones de Franco que aplica este plan (2026-11-15)

1. **A0** queda dentro del **040**, después del 039. No hay un puente de
   texto aparte.
2. **Tests con DB:** base descartable por worktree. Prohibido escribir en
   `jujuygo_test`, Supabase o producción. Si no se puede aislar, no se
   corren. Ver el bloqueo **B-01**.
3. **Coordenadas:** solo Terminal SSJ (-24.2218, -65.2718) y Tilcara
   (-23.5761, -65.3986), en el **041**.
4. **Datos manuales:** se conservan, con la procedencia distinguida. Hay
   cuatro clases: publicado en el dataset, dato manual verificado, llegada
   estimada y pendiente de verificación. Contrato en el 039.
5. **El Home sigue la maqueta.** `design.md` se corrigió solo donde había
   conflicto.
6. **Imperdibles y Guías se conservan.** La banda de horarios no se duplica
   con el buscador (D-08).
7. Foto del hero: **la consigue Franco**. Sin lupa ni «Yapas» en el nav
   mientras no tengan función o destino. El footer lleva solo destinos
   reales.
8. **OpenStreetMap**, sin otro proveedor y sin simular terreno. Pueblo y
   Cruce de Purmamarca separados.
9. **Travesía v2 aprobada** como 044, con las siete condiciones escritas en
   su spec.
10. **Sección 6.1:** no existe en `docs/design.md`. Revisé los dos PDF
    «Análisis visual JujuyGo» de `Downloads` (con `pdftotext`) y no tienen
    una sección 6.1. No se le atribuye contenido.

## 3. Correcciones pedidas (A–D)

**A. Números del piloto.** Recontados del dataset. Cada número es un
**registro** del dataset (una salida programada), en día hábil (martes
2026-11-17, frecuencias 1 y 2).
- Pueblo→Humahuaca: **19 registros** en total. 16 corren en día hábil, de
  los cuales **14 están confirmados** y **2 pendientes** (`hq-0527` y
  `hq-0551`, destino final Hipólito Irigoyen).
- El error anterior: los 3 que se contaban como «pendientes» eran en
  realidad los **excluidos por día** (f3: `hq-0513`, `hq-0530`,
  `hq-0545`).
- El juego completo y único de cifras está en el 039.
- Conciliación seed↔dataset: **5 de 14** idas con equivalente exacto
  (empresa + hora + destino). La cifra «7/14» salía de no exigir el destino.
  **0 de 9** vueltas: el seed tiene 9 vueltas, no 7.

**B. Las dos salidas de las 07:00.** El 07:00 que muestra el Home es
`rn9-ida-0700`: Panamericano →Humahuaca, en el seed, sin equivalente en el
dataset. `hq-0023` es **otro registro**: Evelia →Tilcara, «Local por
Purmamarca», lunes a viernes. El 039 los trata como dos entradas distintas
(test 9).

**C. Pendientes.** `hq-0595` sigue pendiente de Q3 y `hq-0761` de Q4;
`hq-0758` está confirmado. La tabla de 80 paradas (F4) es evidencia de
auditoría: no entra al catálogo ni completa recorridos.

**D. Dependencias.** Ver §4.
- El **046** sigue dependiendo del 039. Se adelanta a la Ola 2 (corre junto
  al 040) porque es solo backend y el 040 es solo frontend: no comparten
  archivos.
- El **043** mantiene la dependencia del 039, por el contrato de Pueblo con
  coordenadas `null`.
- El **036** pasó a depender de 040, 042 y 043. El 040 le da el `?origen=`
  de Cómo llegar; el 042, el header; el 043, el mapa.
- Ningún slice arranca sin que todas sus dependencias tengan CIERRA y estén
  mergeadas.

## 4. DAG definitivo

`./slices dag` ya lo verificó así:

```
Ola 1   039-fuente-horarios        ← nada
        042-header-marca-movil     ← nada   (sin archivos compartidos con 039; ver B-01)
Ola 2   040-transporte-honesto     ← 039, 042   (comparte travesia.html y como-llegar.html con 042)
        046-validador-cierre       ← 039        (solo backend: validar.js)
        041-coordenadas            ← 039        (seed.js y transporte.js, que también toca 039)
        043-mapa-home              ← 039        (contrato de Pueblo con coordenadas null)
        → MAX_PARALELO=2: primero 040 + 046, después 041 + 043
Ola 3   036-home-rediseno          ← 040, 042, 043   (+ el inventario aprobado)
        044-travesia-v2            ← 040, 046        (sin archivos compartidos con 036)
Ola 4   045-yapas-inline           ← 044
Ola 5   P2 (sin spec todavía): criterio de Imperdibles (C2), fotos de relleno
        (D-11), incorporar las fotos que lleguen, favicon y OG, fuentes y LCP,
        etiquetas del mapa (C4), role=listitem (deuda del 29)
Cierre  code-review-en-loop → kero-audit (1440/768/390/360) → qa-con-video
        → PARTE.md y estado.md → push único (lo autoriza Franco) → deploy
```

Archivos compartidos, todos en cadena y ninguno en paralelo:
- `home.html`: 042 → 040 (solo la banda) → 036
- `travesia.*`: 039 (solo el modelo) → 042 (header) → 040 → 044 → 045
- `como-llegar.*`: 042 → 040
- `seed.js` y `transporte.js`: 039 → 041

Flujo de cada slice: spec → worker aislado → recibo → `./slices verificar
<id>` → juez Devin (subagente con contexto fresco, `juez.txt`) → **revisión
del diff por Franco** → merge solo con su autorización.

**No usar `./slices auto`** hasta resolver D-10, porque el 036 viejo figura
como «nocerro» y `auto` relanzaría sobre ese worktree. Se lanza por id:
`./slices lanzar <id>`.

## 5. Bloqueos y decisiones que necesitan a Franco

### Bloqueos

- **B-01 — DB aislada, sin `CREATEDB` (revisado el 2026-11-15; no se
  ejecutó nada).**

  **Estado verificado** (solo lectura sobre `pg_roles` y `pg_database`):
  - Roles: `jujuygo` (sin superusuario, sin `CREATEDB`, sin `CREATEROLE`) y
    `postgres` (superusuario).
  - Bases: `jujuygo` y `jujuygo_test`, las dos del rol `jujuygo`.

  **Riesgos encontrados:**
  1. `backend/src/db.js` y tres tests (`como-llegar`, `hospedaje`,
     `transporte`) tienen un fallback fijo a
     `postgres://jujuygo:jujuygo@localhost:5432/jujuygo_test`. El worktree
     del 036 no tenía `backend/.env` y su recibo informa 61/61 tests de
     backend en verde: **esa verificación escribió en `jujuygo_test` por el
     fallback.**
  2. `.worktreeinclude` copia `backend/.env` a los worktrees. Ese archivo
     tiene `DATABASE_URL` (dev), `DATABASE_URL_TEST` (compartida) y
     **`DATABASE_URL_PROD` (Supabase)**.

  **Alternativa propuesta: pool fijo creado una sola vez por un
  administrador.** No necesita `ALTER ROLE` sobre `jujuygo`.
  - **Setup.** Lo corre Franco en su terminal, como `postgres`. La
    contraseña la tipea él y no pasa por ningún agente:

    ```sql
    -- rol de pruebas nuevo, sin capacidades extra
    CREATE ROLE jujuygo_wt LOGIN PASSWORD '…' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    -- jujuygo_wt no puede conectarse a las bases compartidas (jujuygo sigue: es el dueño)
    REVOKE CONNECT ON DATABASE jujuygo, jujuygo_test FROM PUBLIC;
    -- pool: 4 bases (MAX_PARALELO=2, más margen)
    CREATE DATABASE jujuygo_test_wt_01 OWNER jujuygo_wt;   -- … _02, _03, _04
    -- en cada base del pool, la marca que exige el guard (dueño postgres: los tests no la pueden borrar)
    \c jujuygo_test_wt_01
    CREATE SCHEMA descartable AUTHORIZATION postgres;
    CREATE TABLE descartable.marca (ok boolean PRIMARY KEY);
    INSERT INTO descartable.marca VALUES (true);
    GRANT USAGE ON SCHEMA descartable TO jujuygo_wt;
    GRANT SELECT ON descartable.marca TO jujuygo_wt;
    ```
  - **Qué puede hacer `jujuygo_wt`:** es dueño de su base, así que puede
    vaciarla (`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`) y migrar.
    No puede crear bases ni roles, ni conectarse a `jujuygo` o
    `jujuygo_test`.
  - **Por worktree** (`PREPARAR` en `slices.conf` y `orca.yaml`, a aprobar):
    1. Asignar el primer número libre del pool con un lock
       `.slices/db-pool/NN.lock` que contiene el id del slice.
    2. Vaciar esa base.
    3. **Escribir un `backend/.env` mínimo**, con solo `PORT` y
       `DATABASE_URL_TEST=postgres://jujuygo_wt:…@localhost:5432/jujuygo_test_wt_NN`.
       La contraseña sale de una variable del `.env` raíz que carga Franco.
    4. Sacar `backend/.env` de `.worktreeinclude`, para que ningún worktree
       reciba `DATABASE_URL` ni `DATABASE_URL_PROD`.
    5. El lock se libera al mergear o descartar el slice (paso manual,
       documentado).
  - **Pre-chequeo en `CHECKS`** (a aprobar). Protege también el código de
    antes del 039, que todavía tiene los fallbacks:

    ```
    "tests-back::test ! -d backend || (grep -Eq '^DATABASE_URL_TEST=postgres://jujuygo_wt:[^@]+@(localhost|127\.0\.0\.1)(:5432)?/jujuygo_test_wt_[0-9]{2}$' backend/.env && ! grep -Eq '^DATABASE_URL(_PROD)?=' backend/.env && cd backend && npm test)"
    ```

    Si el `.env` del worktree no apunta al pool, o trae `DATABASE_URL` o
    `DATABASE_URL_PROD`, **el check falla y los tests no corren.**
  - **Guard del 039** (lista de permitidas: usuario, host, patrón de nombre
    y `descartable.marca`). Si no se cumple, lanza un error; no saltea en
    silencio.
  - **Tres capas:**
    - el pre-chequeo frena antes de correr;
    - el `REVOKE` impide la conexión aunque una URL esté mal;
    - el guard frena dentro de los tests.

  **Si no se arma el pool:** no se corre ningún test de backend. El 039 se
  puede implementar, pero **no cierra**, y la Ola 1 no se lanza.
- **B-02 — Q1–Q7 al titular** (las envía Franco). Mientras no lleguen
  respuestas:
  - SSJ→Purmamarca Pueblo tiene **0 servicios confirmados** (10 pendientes).
    Cómo llegar al Cerro de los Siete Colores, el lugar más conocido, va a
    mostrar «No hay un servicio confirmado» con sus pendientes.
  - Tilcara→Pueblo tiene 0 confirmados: el día 2 del piloto no cierra.
  - Es el comportamiento correcto según las reglas, pero **afecta el
    producto**. Q4 y Q6 son las más urgentes.

### Decisiones

| # | Qué decidir | Recomendación |
|---|---|---|
| D-01 | **Cuáles son los datos manuales verificados.** No encontré en el código ninguna entrada que se pueda probar como manual. Que un worker haya cargado el 05:30 en el slice 04 solo muestra que su procedencia actual es el seed; **no** prueba que sea un dato verificado (precisión del revisor). Se conserva como `seed-sin-conciliar` y no se presenta como horario respaldado. Si hay una verificación externa de ese servicio u otro (horario, empresa, origen, destino, frecuencia y evidencia), se documenta y entra en `manuales.js` | Listarlos antes del 040 |
| D-02 | Los servicios del seed sin conciliar (18) se muestran en el bloque plegado «pendientes de verificación», solo con la salida en cabecera | Sí (así está escrito el 039) |
| D-03 | B-01: **sin `ALTER ROLE`**. Pool `jujuygo_test_wt_01..04` creado por `postgres`, rol `jujuygo_wt`, `REVOKE CONNECT` en las bases compartidas, `.env` mínimo por worktree y pre-chequeo en `CHECKS` (ver B-01) | Aprobar el SQL y los cambios de `slices.conf`, `orca.yaml` y `.worktreeinclude` |
| D-04 | **Hash: se mantiene `d4c832b4…`.** Es reproducible: SHA-256 de `JSON.stringify` con claves ordenadas de forma recursiva, sobre el `default export` completo. Da el mismo valor con LF y con CRLF. Mi «no reproducible» anterior estaba mal: había probado sin ordenar las claves (`bfbfb7a2…`) y sobre los bytes del archivo (`fc0d9518…`). Detalle y comando en el 039 | Aceptar `d4c832b4…` |
| D-05 | Enviar Q1–Q7 (están en el 039) | Ya; Q4 y Q6 primero |
| D-06 | Texto de `<title>` y `meta description` (en el 042) | Revisar el copy |
| D-07 | Yapa destacada: **Pucará de Tilcara**. La ficha está **completa**; lo verifiqué con un GET de solo lectura a la API pública: nombre, zona, localidad, coordenadas, altitud 2500 m, descripción, cómo llegar, mejor época y nota. La foto `tilcara.jpg` es del Pucará (CREDITS: «Pucará de Tilcara, Argentina 01») y el WebP responde 200. Rotación propuesta: una constante editorial `{ slug, desde, hasta }` que cambia Franco a mano. «De la semana» solo si se compromete a rotarla; sin selección automática | Aprobar el lugar; la rotación, después |
| D-08 | La banda «Próximos servicios» sale del Home: el buscador lleva a Cómo llegar, que muestra los servicios con su clase. **Para no perder información**, el 040 (en Cómo llegar) tiene que cubrir lo que hoy da la banda: próximas salidas del tramo desde la hora actual, con su clase. Va como condición en el 036 y el 040 | Sí, con esa condición |
| D-09 | Copiar la maqueta a `docs/mockups/maqueta-descubri-jujuy.png` | Sí |
| D-10 | **No se borra** el worktree del 036 viejo. Revisión hecha:<br>• rama `slice-036-home-rediseno`, **0 commits** propios; todo el trabajo está *staged* y sin commit en el worktree;<br>• 7 archivos de frontend (+233 / −600) y, sin trackear, dos capturas (1440 y 390, 18 MB) y el recibo;<br>• **copia de rescate** en `recibos/036-home-rediseno-v1/` (`cambios-frontend.patch`, 1088 líneas, que aplica limpio sobre master con `git apply --check`, y `recibo-agente.md`). Las capturas siguen solo en el worktree;<br>• para el 040 se rescatan `getProximos()` con su spec de 70 líneas, el bloque de badges y el patrón de test de orden con `compareDocumentPosition`. El resto (reestructura de `home.*`) se descarta | Mantenerlo hasta que el 040 y el 036 nuevo estén mergeados |
| D-17 | «Cómo llegar» en el nav en lugar de «Yapas» | **Aprobado** por el revisor |
| D-18 | Si falla la fuente: 200 con datos manuales y pendientes, nunca convertidos en confirmados | **Aprobado** por el revisor. El 039 (test 1) y el 046 (test 6) lo cubren |
| D-11 | En 9 detalles de lugar se ve una foto de otro sitio (relleno de la migración 004). ¿Pie «Foto ilustrativa de la región» o sin hero hasta tener la foto? | Pie, en un slice P1 |
| D-12 | Aprobar los cambios de `design.md` (marca JujuyGo y patrones del Home) | Revisar el diff |
| D-15 | Migración `005` de coordenadas en producción: se aplica en el paso de publicación | Con autorización en ese paso |
| D-16 | Recursos gráficos G-01 a G-07 (SVG en código) del inventario | Aprobar junto con el inventario |

### Contradicciones encontradas (resueltas o declaradas)

- **Cifras del piloto y del seed:** corregidas (§3 A).
- **Hash `d4c832b4`:** reproducido y documentado. Se mantiene (D-04).
- **Registros 18→19 (65):** origen Cruce y referencia Pueblo, con destinos
  finales en los dos sentidos. Quedan como Q7; no se interpretan.
- **«Rápido por Maimará» (3 registros):** el nombre sugiere una parada en
  Maimará. No se infiere nada (Q5).
- **`design.md` dice «sin login en MVP»** y la app tiene login con Google.
  No choca con la maqueta, así que no se tocó. Queda anotado.
- **Llegadas «publicadas» del seed:** por ejemplo Tilcara 07:05 =
  05:30 + 95 min. Es una suma etiquetada como publicada. Es una
  inconsistencia demostrable: el 039 deja de presentarla. El dato no se
  borra.

## 6. Cambios en `docs/design.md` (solo los que chocaban con la maqueta)

- Título e identidad: marca **JujuyGo**. Las yapas son un feature, no la
  identidad. Los identificadores `yapa*` no se renombran.
- Para la composición del Home manda la maqueta.
- Excepción a «cards iguales en grilla»: las cuatro regiones del Home.
- Patrones del Home: hero alineado a la izquierda con buscador; regiones de
  cuatro tarjetas; mapa OSM con leyenda; ornamentos SVG; footer con destinos
  reales y créditos.
- Sin cambios en tokens, tipografía, IA, la capa de verdad ni el modelo de
  interacción.

## 7. Revisión del worktree del 036 viejo (`.slices/036-home-rediseno`)

- Checks verdes, **sin juez**: no está aprobado.
- **Se descarta** la reestructura de `home.*`: seguía el prototipo viejo,
  sacaba el mapa, los hospedajes y las guías, y la banda salía del seed.
- **Queda como referencia para el 040:** `getProximos()` con su spec y el
  bloque de badges, que hay que rehacer para cuatro clases.
- El borrado necesita autorización (D-10).

## 8. Asignación propuesta

- Workers: Copilot vía Orca (`MAX_PARALELO=2`).
- Juez: subagente Devin con contexto fresco.
- Devin coordina y verifica; no juzga su propio trabajo.
- Por la cuota, no se corren dos slices de UI pesados en paralelo (036 y
  044 pueden ir en serie si hace falta).

## 9. Pasos para integrar y publicar (después de las olas)

1. Todos los slices de P0 y P1 con CIERRA, diff revisado y merge autorizado.
2. `code-review-en-loop` sobre el diff total.
3. `kero-audit` en las 5 rutas, en 4 anchos.
4. `qa-con-video` del buscador, Cómo llegar, la travesía piloto y el menú
   móvil.
5. Suites en base descartable.
6. Actualizar `PARTE.md` y `docs/estado.md`.
7. **Push único**, con autorización.
8. Deploy en Vercel del backend y del frontend, y migración 005 en
   Supabase, también con autorización.
9. Verificación en producción: 0 errores de consola, 0 requests ≥400, y
   los cuatro badges vistos en datos reales.

## 10. Estado de la revisión (2026-11-15, segunda vuelta)

Veredicto del revisor: **Ola 0 preparada, no aprobada.**

Mientras no termine la revisión, no se hacen commits, no se conceden
permisos, no se borran worktrees y no se inicia la Ola 1.

Lo que se cambió en esta vuelta:
- El hash quedó documentado y se mantiene `d4c832b4…`.
- B-01 se rehízo sin `ALTER ROLE`, como pool administrado. El guard pasó a
  lista de permitidas y frena en vez de saltear.
- El 036 viejo tiene una copia de rescate y no se borra.
- La ficha del Pucará quedó verificada.
- D-08 lleva su condición.
- D-17 y D-18 quedaron aprobados.

## 11. Confirmaciones

- No se lanzó ningún worker ni slice.
- No hubo merge, push ni deploy.
- No se modificó producción ni Supabase.
- No se escribió en ninguna base: solo consultas de lectura a `pg_roles` y
  `pg_database`. No se ejecutó `ALTER ROLE` ni el SQL del pool.
- Contra producción, solo un GET público de lectura
  (`/api/lugares/pucara-de-tilcara` y un WebP).
- No se borró ningún worktree. Se creó la copia de rescate
  `recibos/036-home-rediseno-v1/`.
- No se descargó, generó ni incorporó ninguna imagen.
- Archivos tocados en la Ola 0 (sin commit):
  - specs 036 y 039, y specs nuevos 040–046
  - 037 y 038 movidos a `specs/reemplazados/` con un aviso de reemplazo
  - `docs/design.md`
  - `docs/inventario-imagenes.md` y este archivo
  - además seguían modificados, de antes: `PARTE.md` y la versión anterior
    del spec 036

---

<!-- ARCHIVO: specs/039-fuente-horarios.spec.md -->

# Slice 039 — Fuente de horarios: dataset autorizado, procedencia por registro

**Depende de:** nada

**Bloquea:** 040, 041, 043, 044, 046 y el merge de 036.

**Estado:** corregido el 2026-11-15 (Ola 0). No lanzar hasta que Franco
apruebe la Ola 0.

## Por qué

Hoy `/api/travesia/contexto`, `/api/travesia/validar`,
`/api/transporte/proximos` y `/api/transporte/como-llegar` leen la tabla
`horario`, cargada por `backend/src/seed.js` (slice 04, commit `bf8c5d3`,
2026-11-06). Esa carga se armó con una salida en la cabecera más deltas
fijos (+95 min hasta Tilcara, etc.) y marca como `publicado` horas que son
**sumas**: por ejemplo, la llegada 07:05 a Tilcara de `rn9-ida-0530`.

El dataset autorizado (`backend/src/data/horario-quebrada.js`, 896
registros, `meta.generado_en` 2026-11-10, licencia expresa del titular) solo
se expone en `/api/hq/*`, y `hq.salidas()` mezcla sentidos y no filtra por
día.

Lo que dispone Franco (2026-11-15):
- Los datos manuales que verificó él se **conservan** y se muestran con su
  procedencia.
- Ningún registro se borra.
- Lo que no tiene procedencia demostrable queda **pendiente de
  conciliación**, visible como tal y nunca presentado como si viniera del
  dataset.

## Vocabulario (contrato)

- **Registro**: una fila de `horario-quebrada.js`. Es una salida a una
  `hora` desde `origen_id`, con una `frecuencia`. Todos los conteos de este
  spec son de registros.
- **Servicio** (respuesta de API): un registro, o una entrada manual, o una
  entrada del seed, proyectado sobre un tramo A → B en una fecha.

Cada servicio que devuelve el backend lleva estos campos (se suman a los
actuales; ninguno se quita):

```js
{
  id,                        // 'hq-0023' | 'man-…' | 'rn9-ida-0530'
  procedencia,               // 'dataset' | 'manual-verificado' | 'seed-sin-conciliar'
  salida: { hora, estado },  // estado: 'publicado' | 'manual-verificado' | 'pendiente-verificacion'
  llegada: { hora, estado }, // estado: 'estimada' | null   (hora null si no hay dato)
  cobertura,                 // 'confirmada' | 'pendiente'
  pendiente: null | { motivo, pregunta },  // motivo: ver R3; pregunta: 'Q3'…'Q7' | null
  frecuencia: { codigo, texto },
  empresa, tipo_servicio, destino_final,
  // compatibilidad: `confianza` se mantiene = salida.estado mapeado
  // ('publicado' | 'estimado' | 'manual-verificado'); `fuente` se mantiene.
}
```

Las cuatro clases que pidió Franco salen de esos campos:

1. Publicado respaldado por el dataset: `procedencia: 'dataset'` y
   `salida.estado: 'publicado'`.
2. Dato manual verificado: `procedencia: 'manual-verificado'`.
3. Llegada estimada: `llegada.estado: 'estimada'`. **Nunca** hay llegada
   "publicada".
4. Pendiente de verificación: `cobertura: 'pendiente'` o
   `salida.estado: 'pendiente-verificacion'`.

## Reglas (cada una con test)

- **R1 — Salida publicada.** Cada registro del dataset es una salida
  publicada **solo** en su `origen_id`.
- **R2 — Referencia y destino final.** `destino_id` es la ciudad de
  referencia y `ciudad_destino` es el destino final. **Sin alias por
  nombre**: los 12 registros con `ciudad_destino: "Purmamarca"` no se
  igualan a Pueblo (19) ni a Cruce (18). Quedan pendientes con motivo
  `destino-final-ambiguo` y pregunta Q6.
- **R3 — Cobertura de un tramo A → B.**
  - **Confirmada** solo si se cumplen las tres condiciones: A = `origen_id`;
    B = `destino_id`; `ciudad_destino` es exactamente el nombre de B.
  - **Pendiente** en cualquier otro caso donde el registro pase por B, con
    estos motivos:
    - `destino-final-distinto` (Q4): la referencia es B pero el destino
      final es otro.
    - `parada-intermedia` (Q3/Q5): B queda entre origen y referencia según
      el orden sur→norte `[10..26]`.
    - `destino-final-ambiguo` (Q6).
    - `sentido-ambiguo` (Q7): el orden `origen_id`→`destino_id` y el destino
      final apuntan a sentidos opuestos. Ver "Hallazgo 18→19".
  - **Iruya (27) queda fuera.**
  - La cobertura nunca se infiere del nombre del servicio, de
    `rapid_stops` (Q2) ni del diccionario de tiempos.
- **R4 — Día.** La fecha se calcula en `America/Argentina/Jujuy`.
  - Tipos de día: feriado (fijos `MM-DD` y específicos del dataset) o
    domingo → 5; sábado → 4; resto → 2.
  - Frecuencias admitidas: día 2 → {1,2}; día 4 → {1,3,4}; día 5 → {1,3,5}.
  - Textos: 1 «Todos los días», 2 «Lunes a viernes (no feriados)»,
    3 «Sábados, domingos y feriados», 4 «Solo sábados», 5 «Domingos y
    feriados».
- **R5 — Purmamarca.** Pueblo (19, slug `purmamarca-pueblo`, nuevo) y Cruce
  (18, `purmamarca-cruce`) son paradas distintas en todas las respuestas.
- **R6 — Llegada.** La llegada es estimada con `tiempos_viaje` de la fuente
  (réplica existente `duracionEstimadaMinutos`, incluido el −10 min
  LOCAL_PURMA al cruce). Si no hay duración, `llegada.hora: null`. El
  diccionario **no** prueba cobertura.
- **R7 — Urbanos fuera.** Los 283 registros `Urbano` (líneas 35, 36 y 39 de
  Santa Ana) no entran en consultas interurbanas. No se borran: quedan para
  un slice futuro.
- **R8 — Datos manuales.** Nuevo `backend/src/transporte/manuales.js`: un
  registro de salidas cargadas y verificadas por Franco. Cada entrada exige
  `id: 'man-…'`, origen, destino, hora, empresa, frecuencia,
  `verificado_por`, `fecha_verificacion` y `evidencia`.
  - **Arranca vacío**: hoy no hay en el código ninguna entrada que se pueda
    probar como manual. Lo completa Franco (decisión D-01 del plan).
  - Una entrada manual tiene `procedencia: 'manual-verificado'`, cobertura
    confirmada para el tramo que declara y llegada `null` salvo que declare
    una.
  - Gana sobre el dataset solo si Franco lo indica en la propia entrada
    (`reemplaza: 'hq-…'`). Si no, se muestran las dos.
- **R9 — Seed sin conciliar.** Nuevo
  `backend/src/transporte/conciliacion-seed.js`, con valores fijados en este
  spec (tabla de abajo).
  - Una entrada del seed con equivalente exacto no se duplica: se muestra
    el registro del dataset.
  - Las demás salen como `procedencia: 'seed-sin-conciliar'`,
    `salida.estado: 'pendiente-verificacion'`, **solo con la salida en su
    cabecera** y sin horas intermedias (los deltas no son datos) y
    `llegada: { hora: null, estado: null }`.
  - Nunca hacen que un plan "cierre".
  - No se borra nada de `seed.js` ni de la tabla `horario`.

## Conciliación seed ↔ dataset (fijada; verificada el 2026-11-15)

Criterio de equivalencia exacta: misma cabecera, misma `hora`, misma
`empresa` y misma ciudad de referencia final.

- **Ida (14 entradas): 5 con equivalente.**
  - `rn9-ida-0615` → `hq-0016`
  - `rn9-ida-0705` → `hq-0025` (f2) y `hq-0026` (f3)
  - `rn9-ida-0915` → `hq-0052`
  - `rn9-ida-0930` → `hq-0057`
  - `rn9-ida-1600` → `hq-0139`
- **Ida sin conciliar (9):** `0530`, `0700`, `0745`, `1100`, `1230`,
  `1400`, `1730`, `1900`, `2030`.
- **Vuelta (9 entradas, no 7): 0 con equivalente.**
- Si el criterio no exige el destino, empresa + hora coinciden en 7 de 14
  idas (se suman `0745`→`hq-0036` y `1100`→`hq-0076`, que van a La
  Quiaca). Esos dos **no** son equivalentes.

Casos que pidió Franco, registro por registro:

| Lo que muestra hoy la UI | Origen en el código | Registro del dataset | Clasificación |
|---|---|---|---|
| 05:30 Panamericano, Terminal→Tilcara, llegada 07:05 «publicado» | `seed.js:163` `rn9-ida-0530` (→La Quiaca) + delta +95 | No hay ningún Panamericano 05:30. `hq-0010` es Evelia 05:30 **→Humahuaca**: **no es equivalente y no lo reemplaza** | `seed-sin-conciliar`, salida pendiente de verificación, sin llegada. Se conserva |
| 06:15 Panamericano | `rn9-ida-0615` | `hq-0016` Local →La Quiaca, f1 | Salida publicada en SSJ. **Bajada en Tilcara: pendiente** (`parada-intermedia`, Q5). Llegada estimada |
| 07:00 Panamericano →Humahuaca | `rn9-ida-0700` | No hay ningún Panamericano 07:00. `hq-0023` es **otro registro** (Evelia, →Tilcara, «Local por Purmamarca», lun–vie) | `rn9-ida-0700`: seed sin conciliar. `hq-0023`: publicado, cobertura SSJ→Tilcara confirmada, f2 |
| Tilcara→Pueblo (prototipo v2) | — | `hq-0595` Tilcara→SSJ 08:40 | Pendiente Q3 |
| 15:30 Humahuaca→SSJ | `rn9-vta-1530` (Evelia) | `hq-0761` Panamericano, destino final Perico | `rn9-vta-1530`: seed sin conciliar. `hq-0761`: pendiente Q4 |
| 15:10 Humahuaca→SSJ | — | `hq-0758` Evelia Rápido | Publicado, confirmado. `rapid_stops: [22,23]` no habilita Huacalera ni Uquía (Q2) |

## Números del piloto (único juego válido; registros; martes 2026-11-17)

| Tramo | Registros A→B (todas las frecuencias) | Día hábil (f1, f2) | Confirmados | Pendientes con referencia B (no se cuentan acá los que pasan por B como parada intermedia) |
|---|---|---|---|---|
| SSJ(10) → Tilcara(21) | 6 | 6 | **6** | 0 |
| Tilcara(21) → Pueblo(19) | 0 | 0 | **0** | 0 |
| Pueblo(19) → Humahuaca(24) | 19 | 16 | **14** | 2: `hq-0527`, `hq-0551` (destino final Hipólito Irigoyen, Q4) |
| Humahuaca(24) → SSJ(10) | 62 | 57 | **47** | 10: destino final Perico o Salta (`hq-0691`, `0695`, `0736`, `0749`, `0753`, `0761`, `0770`, `0779`, `0780`, `0799`), Q4 |
| SSJ(10) → Pueblo(19) | 10 | 10 | **0** | 10: destino final La Ciénaga ×7, Chalala, Puerta de Lipán, «Purmamarca» (`hq-0137`, Q6) |
| Maimará(20) | 0 como origen o referencia | — | 0 | — |

En Pueblo→Humahuaca, 19 − 16 = 3 registros quedan **fuera por día**
(f3: `hq-0513`, `hq-0530`, `hq-0545`). Las cifras anteriores («16 = 14 + 3
pendientes» y «7/14, 0/7») estaban mal y quedan reemplazadas por estas.

**Consecuencia que hay que mostrar, no ocultar.** Para SSJ→Purmamarca
Pueblo no hay ningún registro confirmado: los 10 son pendientes. La UI
(040) los muestra etiquetados y el validador nunca dice "cierra".

## Hallazgo 18→19 (va a Q7; no se interpreta)

Hay 65 registros con `origen_id` 18 (Cruce) y `destino_id` 19 (Pueblo),
todos «Local por Purmamarca». Sus destinos finales van en los dos sentidos:
SSJ ×23, Humahuaca ×17, Tilcara ×6, La Ciénaga ×7, «Purmamarca» ×6 y otros.
Esto sugiere que `destino_id` no siempre es la "referencia en el sentido de
marcha". Quedan pendientes con motivo `sentido-ambiguo` y se suman como
evidencia a Q3 y Q7.

## Qué tiene que pasar

1. **`backend/src/transporte/fuente.js` (nuevo)**: el único lector del
   dataset, de `manuales.js` y de `conciliacion-seed.js`.
   - Expone `servicios({ origen, destino, fecha, desde, limite })`, que
     devuelve `{ servicios, pendientes, excluidos: { por_dia, por_urbano } }`.
     `servicios` = cobertura confirmada, ordenados por hora. `pendientes` =
     el resto, con su motivo.
   - Expone también `paradas()` y `estado()`.
2. **Integridad al arrancar.** Se valida:
   - Estructura: `meta`, `ciudades`, `empresas`, `horarios`,
     `tiempos_viaje` y feriados.
   - Por registro: `id` único, `hora` HH:MM, `frecuencia` ∈ 1..5, ciudades
     existentes, empresa y servicio no vacíos.
   - Contra `backend/src/data/horario-quebrada.manifest.json`: 896
     registros, `generado_en` y `sha256`.
   - **Hash canónico** (es el mismo `d4c832b4…` del `PARTE.md`;
     reproducido el 2026-11-15):

     | | |
     |---|---|
     | Archivo | `backend/src/data/horario-quebrada.js`, sin cambios desde el commit `7d5c48f` (2026-11-09) |
     | Entrada | el `default export` completo, ya importado: `meta`, `ciudades`, `empresas`, `feriados_fijos`, `feriados_especificos`, `horarios`, `tarifas`, `tiempos_viaje` |
     | Normalización | claves de objeto ordenadas alfabéticamente, de forma recursiva. El orden de los arrays se conserva. Después, `JSON.stringify` sin espacios y codificado en UTF-8 |
     | Valor | `d4c832b499cdb55ccbdb7d4871197cbd8632ce3ac84d5c132c3566cb9a7c40c9` |
     | Comando | `node backend/scripts/hash-dataset.mjs backend/src/data/horario-quebrada.js` (script nuevo de este slice; imprime el hash y lo recalcula sobre copias LF y CRLF del archivo) |
     | Fin de línea | probado: el mismo valor con copias LF y CRLF |

     Por qué no coincidían los otros valores:
     - `fc0d9518…` es el SHA-256 de los **bytes del archivo**. Cambia con el
       fin de línea, los comentarios y el formato.
     - `bfbfb7a2…` es `JSON.stringify` **sin ordenar las claves**. Depende
       del orden en que el importador escribió las propiedades.
     - El canónico no depende de ninguno de los dos: es el que va en el
       manifiesto.
   - Nuevo `GET /api/transporte/fuente` → `{ ok, version, generado_en,
     registros, manuales, seed_sin_conciliar, error? }`.
3. **Si la fuente falla.** `fuente.js` deja de servir registros del
   dataset. Esos registros no se reemplazan por el seed y no hay respuestas
   parciales "como si" fueran del dataset. Los endpoints de horarios
   responden **200** con:
   - `fuente: { ok: false, error }`;
   - `servicios` con solo las entradas manuales verificadas (que no dependen
     del dataset);
   - los `pendientes` del seed.

   Así se cumple "mantener la información disponible si falla la fuente" sin
   mezclar procedencias. Catálogo, hospedajes, urbano y travesías guardadas
   no se ven afectados (test).
4. **Consumidores migrados** (los campos se suman; no se quita nada):
   - `/travesia/contexto`: `paradas` (con `purmamarca-pueblo`, coordenadas
     `null` y `coordenadas: 'pendiente-autorizacion'`), `horarios` desde
     `fuente.js` y `fuente.generado_en`.
   - `/travesia/validar`: usa la `fecha` de cada día.
     - Tramo sin servicio confirmado y con pendientes →
       `cobertura-pendiente` («No hay un servicio confirmado de X a Y; hay N
       pendientes de verificación»).
     - Sin servicio confirmado ni pendientes → `tramo-sin-transporte`.
     - Los pendientes y el seed sin conciliar nunca resuelven un tramo.
   - `/transporte/proximos` y `/transporte/como-llegar`: `servicios` +
     `pendientes` + `fecha` opcional.
   - `/hq/salidas`: delega en `fuente.js`, en un solo sentido.
5. **Lecturas de la tabla `horario`.** Se retiran las lecturas de horarios
   de esa tabla. La tabla y `seed.js` siguen intactos. `seed.js` solo
   **exporta** las listas `salidasIda` y `salidasVuelta` como constantes,
   sin cambiar valores, para que la conciliación no las duplique.
6. **Purmamarca → Pueblo** en `resolverParadaLugar` (backend) y
   `PARADAS_POR_LOCALIDAD` (`frontend/src/app/travesia/travesia.model.ts`).
   En `margenes.js`, el texto del cruce pierde la cifra «3 km».
7. **Guard de base descartable** en `backend/test/helpers/db.js` (nuevo).
   Es una **lista de permitidas**, no de prohibidas.
   - Los tests con DB obtienen la URL **solo** con `urlDescartable()`. Se
     sacan los fallbacks escritos a mano a `jujuygo_test` en `como-llegar`,
     `hospedaje` y `transporte`, y el fallback de `src/db.js` cuando
     `NODE_ENV=test`.
   - `urlDescartable()` acepta únicamente:
     - host `localhost`, `127.0.0.1` o `::1`;
     - usuario `jujuygo_wt`;
     - base que cumpla `^jujuygo_test_wt_\d{2}$`;
     - además, la base tiene que tener la marca de descartable:
       `SELECT ok FROM descartable.marca` tiene que devolver `true`. El
       schema `descartable` lo crea el administrador al armar el pool y es
       de `postgres`, así que los tests no pueden borrarlo ni falsificarlo
       (B-01, `docs/plan-cierre.md`).
   - Ante cualquier otra cosa (`jujuygo`, `jujuygo_test`, Supabase, falta de
     URL o falta de la marca), **lanza un error**: la suite con DB falla con
     el motivo y el check queda rojo. **No se saltea en silencio.** Los
     tests sin DB siguen corriendo.
   - Se agrega `backend/scripts/hash-dataset.mjs`, que reproduce el hash.

## Alcance de archivos

- **Nuevos:**
  - `backend/src/transporte/fuente.js`
  - `backend/src/transporte/cobertura.js` (tabla vacía de paradas
    intermedias confirmadas)
  - `backend/src/transporte/manuales.js` (vacío)
  - `backend/src/transporte/conciliacion-seed.js`
  - `backend/src/data/horario-quebrada.manifest.json`
  - `backend/test/fuente.test.js`
  - `backend/test/helpers/db.js`
  - `backend/test/fixtures/*`
  - `backend/scripts/hash-dataset.mjs`
- **Modificados:**
  - `backend/src/hq.js`
  - `backend/src/routes/hq.js`
  - `backend/src/routes/transporte.js`
  - `backend/src/routes/travesia.js`
  - `backend/src/itinerario/validar.js`
  - `backend/src/itinerario/margenes.js`
  - `backend/src/index.js`
  - `backend/src/db.js` (sacar el fallback a `jujuygo_test`)
  - `backend/src/seed.js` (solo `export` de las dos listas)
  - los tests de backend afectados
  - `frontend/src/app/travesia/travesia.model.ts` y `travesia.model.spec.ts`
  - `frontend/src/app/travesia/travesia.types.ts` y
    `como-llegar/como-llegar.types.ts` (solo los campos nuevos, opcionales)

**No tocar:**
- `horario-quebrada.js`
- valores de `seed.js` (horas, empresas, coordenadas: las coordenadas van
  en 041)
- `migrations/`
- Supabase
- HTML/CSS
- 036–038

## Tests exigidos (`node --test` + Vitest; trabajá con `tdd`)

1. **Integridad.** Dataset válido → `estado().ok`, 896, hash canónico
   `d4c832b4…`. Fixtures (ausente, roto, hora inválida, id duplicado, hash
   distinto) → `fuente.ok: false`. Ninguna respuesta trae registros `hq-*`;
   las entradas manuales de un fixture siguen apareciendo; `/api/lugares`
   responde 200.
2. **Sentido.** Humahuaca→SSJ no incluye salidas desde SSJ ni desde
   Tilcara.
3. **SSJ→Tilcara**, martes 2026-11-17: exactamente 6 servicios confirmados,
   incluido `hq-0023`. `hq-0016` (→La Quiaca) aparece en `pendientes` con
   motivo `parada-intermedia`.
4. **Destino final.** Humahuaca→SSJ desde 15:00: `servicios` incluye
   `hq-0758`; `pendientes` incluye `hq-0761` con `destino-final-distinto`
   y Q4.
5. **Pueblo→Humahuaca, martes.**
   - 14 servicios confirmados.
   - Los pendientes con motivo `destino-final-distinto` y referencia 24 son
     exactamente `hq-0527` y `hq-0551`.
   - Entre los registros 19→24, `excluidos.por_dia` = 3.
6. **Frecuencias.** Sábado 2026-11-21 excluye f2; el feriado 2026-11-23 se
   comporta como día 5; martes excluye f3, f4 y f5.
7. **Purmamarca.** Tilcara→Pueblo, martes:
   - 0 servicios confirmados (no hay registros 21→19);
   - `pendientes` trae `hq-0595` con motivo `parada-intermedia` y Q3, junto
     con el resto de los registros 21→10 del día que pasan por 19.
   - `validar` sobre el tramo Tilcara→Siete Colores → `cobertura-pendiente`,
     nunca `validado: true`.

   SSJ→Pueblo: 0 servicios; los 10 registros 10→19 en `pendientes`, con su
   motivo.
8. **Llegada.** No hay `llegada.estado: 'publicado'` en ninguna respuesta.
   La duración Pueblo→Humahuaca es la del diccionario (75 min).
9. **Seed.**
   - `rn9-ida-0530` aparece solo en `pendientes` como `seed-sin-conciliar`,
     con salida 05:30 en `terminal-jjs`, sin llegada y sin parada Tilcara.
   - `rn9-ida-0615` no aparece (lo representa `hq-0016`).
   - `rn9-ida-0700` y `hq-0023` son dos entradas distintas.
   - Las 23 entradas de `seed.js` siguen exportadas y sin cambios: snapshot
     de horas y empresas.
10. **Manual.** Con un fixture de `manuales.js`, una entrada aparece con
    `procedencia: 'manual-verificado'` y resuelve un tramo del validador.
    Con `manuales.js` vacío, no aparece nada.
11. **Guard de DB** (unitario, sin conectarse):
    - `urlDescartable()` lanza un error con `…/jujuygo_test`, `…/jujuygo`,
      un host `*.supabase.com`, el usuario `jujuygo` y una URL vacía;
    - acepta `postgres://jujuygo_wt@localhost/jujuygo_test_wt_01`.

    Con DB: una base sin `descartable.marca` → error.
12. **Hash.** `hash-dataset.mjs` imprime `d4c832b4…` y el manifiesto
    coincide.
13. **Piloto.** Plan 17–19/11/2026: el día 2 (Tilcara→Pueblo) no queda
    validado y el validador no declara `validado: true` el plan.
14. **Frontend.** `paradaSlugDeLugar` de un lugar de Purmamarca →
    `purmamarca-pueblo`. Los tests existentes siguen verdes.
15. **Regresión.** Los tests de `hq`, `transporte`, `travesia`,
    `itinerario` y `como-llegar` pasan, o se reescriben contra el dataset
    con la justificación en el recibo.

## Criterios de aceptación

- [ ] Pasan los checks de `slices.conf` **contra una base del pool
      descartable** (B-01). Sin pool, las suites con DB fallan por el guard
      y el slice **no cierra**: no hay cierre con tests salteados.
- [ ] Build del frontend OK; `git diff --check` limpio; el diff queda dentro
      del alcance.
- [ ] El recibo trae:
  - una tabla de R1–R9 contra el test que cubre cada regla;
  - salidas reales locales de `/api/transporte/fuente`, de
    `/transporte/proximos?origen=terminal-jjs&destino=tilcara&fecha=2026-11-17`
    y de `/hq/salidas?origen=humahuaca&destino=sansalvadordejujuy&desde=15:00&fecha=2026-11-17`;
  - la prueba con el dataset corrupto;
  - los gaps.
- [ ] Ningún horario, parada o cobertura inventada o inferida por nombre.

## Fuera de alcance

- Las coordenadas (041).
- La UI que muestra pendientes y procedencia (040).
- La tabla de 80 paradas de la fuente (evidencia de auditoría hasta Q1).
- Llenar `cobertura.js` o `manuales.js`.
- Urbanos.
- Borrar la tabla `horario` o el seed.

## Consultas al titular (las envía Franco)

- **Q1.** ¿La autorización incluye las coordenadas y los tipos de servicio
  de las paradas que publica el sitio?
- **Q2.** `rapid_stops: [22, 23]` en 11 Rápidos: ¿son paradas adicionales o
  las únicas intermedias?
- **Q3.** «Local por Purmamarca», ¿entra al pueblo en los dos sentidos?
  (`hq-0595`; evidencia: los 65 registros 18→19)
- **Q4.** En servicios con destino final más allá de la referencia (Perico,
  Salta, La Ciénaga, Chalala, Puerta de Lipán, Hipólito Irigoyen), ¿se
  puede subir o bajar en la ciudad de referencia?
- **Q5.** ¿En qué localidades intermedias suben y bajan los Local y los
  Local por Purmamarca? (ej. `hq-0016` en Tilcara)
- **Q6.** ¿El destino final «Purmamarca» (12 registros) es el Pueblo?
- **Q7.** ¿Qué significa `destino_id` 19 en los registros con origen 18 y
  destino final hacia el sur?

---

<!-- ARCHIVO: specs/036-home-rediseno.spec.md -->

# Slice 036 — Home según la maqueta aprobada «Descubrí Jujuy»

**Depende de:** 040, 042, 043

- 040: la vista de Cómo llegar recibe `?origen=` y presenta los horarios
  con las cuatro clases.
- 042: header compartido, marca y menú móvil.
- 043: el mapa con lugares, paradas y leyenda.

**Estado:** reescrito el 2026-11-15. Reemplaza al 036 anterior, que seguía
el prototipo `home.html`. El worktree existente
`.slices/036-home-rediseno` **se descarta** (ver «Qué pasa con el worktree
existente»). No lanzar hasta que Franco apruebe la Ola 0 **y** el
inventario de imágenes (`docs/inventario-imagenes.md`).

## Fuente de verdad

- **Composición:** la maqueta `C:\Users\Elect\Downloads\JujuyGo_ Descubrí
  Jujuy.png`. Copiarla a `docs/mockups/maqueta-descubri-jujuy.png` está
  pendiente de que Franco lo autorice.
- **Tokens, tipografía y reglas:** `docs/design.md`, actualizado el
  2026-11-15. Donde choquen en la composición del Home, manda la maqueta
  (decisión de Franco).
- **Datos:** catálogo, hospedajes, guías y lugares reales. Nada inventado.

Skills que tiene que cargar el worker: `badesign-skill`, `emil-design-eng`
y `mobile-native`. Antes del `worker_done`, `kero-audit` en 1440, 768, 390
y 360.

## Composición (en este orden)

1. **Hero a sangre** (`header.hero`):
   - Header del 042 en variante `sobre-foto`.
   - Eyebrow «Viajá por Jujuy».
   - H1 «Jujuy se descubre.» con segunda línea en itálica «También se puede
     recorrer sin auto.»
   - Bajada: «Encontrá cómo llegar a los lugares que querés conocer.»
   - **Buscador Desde/Hasta funcional** (`form`, `role="search"`):
     - *Desde*: los orígenes base de Cómo llegar (Terminal, Aeropuerto, …)
       más «Mi ubicación».
     - *Hasta*: los lugares del catálogo, agrupados por localidad.
     - Al enviar navega a `/como-llegar/<slugLugar>?origen=<slug>` (ruta
       existente; el parámetro lo agrega 040).
     - Los campos llevan `<label>` visible. Los valores por defecto son
       «Terminal de Ómnibus» y ningún destino.
   - **Nota bajo el buscador:** «Consultá las opciones de transporte
     disponibles · Horarios sujetos a verificación de la fuente.» El botón
     (i) abre una explicación breve (`<details>`) de las cuatro clases:
     salida publicada en el dataset, dato manual verificado, llegada
     estimada y pendiente de verificación.
   - **Foto:** un slot `<picture>` con dirección de arte (horizontal en
     desktop, recorte vertical en móvil). Hasta que llegue la foto del
     colectivo que consigue Franco (inventario H-01), usa `purmamarca`
     **como provisoria**, con un comentario `<!-- provisoria: H-01 -->`.
     El preload de `index.html` sigue a la foto del slot.
2. **«Explorá Jujuy · Un mapa, mil caminos»** (`#mapa`):
   - Columna de texto: «Descubrí rutas, paradas y localidades para
     planificar tu viaje de forma simple.» y el botón «Abrir mapa →», que va
     a `/como-llegar`, porque ese es el mapa operativo.
   - Centro: `yapa-mapa` (043) con lugares y paradas y la leyenda.
   - Derecha: **tarjeta de yapa destacada**.
     - El lugar sale de una constante editorial en `home.ts`
       (`YAPA_DESTACADA = { slug }`).
     - Propuesta pendiente de Franco: `pucara-de-tilcara`, que tiene foto
       propia y 6 servicios confirmados SSJ→Tilcara.
     - Kicker «Yapa destacada». Dice «de la semana» **solo** si Franco
       aprueba la rotación (ver plan, D-07).
     - Foto, nombre y una línea de la `descripcion` del catálogo.
     - «Leer más →» a `/lugares/<slug>`.
     - Si el slug no existe en el catálogo, la tarjeta no se renderiza.
3. **«Descubrí Jujuy · Sus regiones, en una experiencia»** (`#zonas`):
   - Bajada: «Paisajes únicos, cultura viva y tradiciones que inspiran.»
   - **Cuatro tarjetas iguales**, en el orden de la maqueta: Quebrada,
     Valles, Yungas y Puna. El orden va fijado en el frontend; la base no
     se toca.
   - Cada tarjeta lleva foto, nombre y flecha, y abre el **panel de zona
     existente** (dialog).
   - Sin el botón «Conocer las zonas»: no hay una página de zonas a la que
     llevar (lo dice el recibo).
   - Si una región no tiene foto correcta, usa el fallback de zona de
     `foto.ts` y queda marcada en el inventario. No se inventa.
4. **Imperdibles** (`#imperdibles`): se conserva (decisión de Franco), con
   filas editoriales según `design.md`. El criterio de selección **no
   cambia** en este slice: siguen siendo los primeros 6 (deuda C2, P2).
5. **Banda partida** (`#hospedajes`):
   - **«¿Dónde dormir?»**: «Encontrá alojamientos con identidad, en el
     lugar que querés estar.»
     - El botón «Ver opciones» despliega (`aria-expanded`) la lista real de
       hospedajes, con «Pendiente de verificar · Fuente: …» como hoy.
     - Sin fotos de establecimientos.
     - Imagen de la banda: H-08 del inventario. Si no está, la banda va sin
       foto (fondo arena).
   - **«Armá tu travesía»** (verde): «Elegí tus destinos, organizá tu
     recorrido y guardá tu itinerario.» y «Planificar viaje →» a
     `/travesia`.
6. **Guías** (`#guias`): se conserva, como franja compacta debajo de la
   banda partida, con el estado vacío actual y el enlace al Registro
   Provincial.
7. **Footer**:
   - Wordmark JujuyGo y «Turismo de Jujuy, con identidad.»
   - **Solo destinos que existen:** Zonas, Mapa, Cómo llegar, Armá tu
     travesía y **Créditos de fotos**.
   - Los créditos son una lista visible construida desde
     `frontend/public/img/CREDITS.md`, en forma de constante TypeScript
     copiada a mano. La atribución es obligatoria por CC BY-SA.
   - Sin redes, sin «Sobre», sin «Contacto», sin «Preguntas frecuentes».

**Salen del Home:**
- La sección «Un viaje en cuatro movimientos».
- La pausa fotográfica con cita.
- La banda «Próximos servicios»: el buscador lleva a Cómo llegar, que
  muestra los servicios con su clase. Así no se duplica (D-08 del plan, a
  confirmar por Franco).

**Ornamentos:** bordes de papel rasgado y la línea de cerros óxido son SVG
inline, `aria-hidden`. Se hacen en código y quedan sujetos a la aprobación
del inventario (G-01, G-02). Sin texturas descargadas.

## Móvil (390 y 360)

- Hero:
  - H1 con `clamp()`.
  - El buscador se apila: Desde, Hasta y el botón a todo el ancho; campos
    de 44 px o más; `font-size` ≥ 16 px en los inputs (para que iOS no
    haga zoom).
  - La nota va debajo.
- El mapa pasa a 360 px de alto, con la leyenda debajo del mapa y no
  encima. La tarjeta de yapa va debajo del mapa.
- Regiones:
  - A partir de 560 px: una grilla de 2×2.
  - Por debajo: una columna.
  - El título y la flecha nunca se pisan (regresión de la auditoría: Yungas
    cortada, flecha de Puna).
- La banda partida se apila. Sin scroll horizontal en 360.

## Alcance de archivos

- `frontend/src/app/home/home.html`, `home.css`, `home.ts`, `home.spec.ts`
- `frontend/src/index.html` (solo el preload del hero)
- `docs/mockups/maqueta-descubri-jujuy.png` (copia, si Franco la autoriza)

**No tocar:**
- Backend
- `yapa-mapa/*` (043)
- `site-header/*` (042)
- `como-llegar/*` (040)
- `styles.css` y los tokens globales
- `public/img/*`: no se agregan imágenes en este slice

## Tests exigidos (Vitest)

1. **Orden:** hero < `#mapa` < `#zonas` < `#imperdibles` < `#hospedajes` <
   `#guias` < footer, verificado con `compareDocumentPosition`.
2. **Buscador:** elegir «Terminal» y «Pucará de Tilcara» y enviar navega a
   `/como-llegar/pucara-de-tilcara?origen=terminal-jjs`. Sin destino, no
   navega y muestra un error asociado al campo.
3. **Yapa destacada:** con el slug presente, renderiza el nombre y el
   enlace del catálogo. Con un slug inexistente, no renderiza la tarjeta.
4. **Regiones:** son cuatro tarjetas en el orden Quebrada, Valles, Yungas y
   Puna; el click abre el panel de esa zona.
5. **Dormir:** «Ver opciones» alterna `aria-expanded` y muestra los 6
   hospedajes del mock con «Pendiente de verificar».
6. **Footer:** cada enlace tiene `routerLink` o fragmento a una sección que
   existe. No hay `href` externos salvo los créditos. Los créditos listan
   los 10 archivos de `CREDITS.md`.
7. **Sin horarios en el Home:** no aparece ningún patrón HH:MM fuera del
   buscador.
8. **Sin elementos falsos:** no hay lupa, ni «Yapas» en el nav, ni redes
   (regresión de la decisión de Franco).

## Criterios de aceptación

- [ ] Checks de `slices.conf`; build OK; diff dentro del alcance.
- [ ] `kero-audit` en 1440, 768, 390 y 360, con captura por ancho en
      `recibos/036-…/capturas/`: contraste, hit areas, foco, sin overflow,
      0 errores de consola.
- [ ] Una comparación lado a lado con la maqueta en el recibo: qué coincide
      y qué difiere, y por qué.

## Qué pasa con el worktree existente (`.slices/036-home-rediseno`)

El worktree se revisó el 2026-11-15. Tiene checks verdes y **no tiene
juez**.

- **Se descarta:** la reestructura de `home.html`, `home.css`, `home.ts` y
  `home.spec.ts`. Seguía el prototipo viejo y sacaba el mapa, los
  hospedajes y las guías, que Franco pidió conservar. Además fijaba la
  banda sobre servicios del seed.
- **Sirve como referencia para 040** (no se mergea desde acá):
  - `getProximos()` y `transporte.service.spec.ts`;
  - el bloque `.badge-*` de `styles.css`, que hay que rehacer para las
    cuatro clases.
- El worktree y su rama se borran solo con autorización de Franco
  (operación destructiva).

---

<!-- ARCHIVO: specs/040-transporte-honesto.spec.md -->

# Slice 040 — Transporte en la UI con las cuatro clases (absorbe A0)

**Depende de:** 039 (el contrato de procedencia y estado), 042 (porque los
dos tocan `travesia.html` y `como-llegar.html`: van encadenados).

**Estado:** Ola 0, para revisión de Franco. Por su decisión, este slice
**reemplaza a A0**: no hay un puente de texto aparte.

## Por qué

Después del 039, el backend entrega cada servicio con `procedencia`,
`salida.estado`, `llegada.estado`, `cobertura` y `pendiente`. La UI todavía
muestra `confianza` cruda y llama «Horario publicado» a todo. Este slice
hace que lo que ve el usuario diga exactamente lo que el dato es, **sin
ocultar** horarios válidos ni datos manuales.

## Qué tiene que pasar

1. **Badges globales** en `frontend/src/styles.css`. Se toma como
   referencia el bloque del worktree 036 descartado y se rehace con estas
   clases:

   | Clase | Texto | Cuándo |
   |---|---|---|
   | `.badge-publicado` | «Salida publicada» | `procedencia: 'dataset'` y `salida.estado: 'publicado'` |
   | `.badge-manual` | «Dato verificado» | `procedencia: 'manual-verificado'` |
   | `.badge-estimado` | «Llegada estimada» | Junto a la hora de llegada, siempre que haya llegada |
   | `.badge-pendiente` | «Pendiente de verificación» | `cobertura: 'pendiente'` o `salida.estado: 'pendiente-verificacion'` |

   Contraste ≥ 4,5:1 sobre papel y sobre verde. El estado no se distingue
   solo por color: cada badge lleva texto.
2. **Helper único** `frontend/src/app/transporte-presentacion.ts` (nuevo).
   `clasesServicio(servicio)` devuelve `{ salida, llegada, pendiente }` con
   el texto y la clase. Lo usan Cómo llegar, Travesía y la banda actual del
   Home, sin lógica duplicada.
   - Motivos legibles:
     - `destino-final-distinto`: «Sigue hasta {destino_final}; falta
       confirmar si sube/baja acá»
     - `parada-intermedia`: «Pasa por esta localidad; falta confirmar la
       parada»
     - `destino-final-ambiguo`: «Destino informado de forma ambigua»
     - `sentido-ambiguo`: «Sentido del servicio sin confirmar»
     - `seed-sin-conciliar`: «Horario cargado antes, en conciliación con
       la fuente»
   - El código de la pregunta (Q3–Q7) **no** se muestra al usuario. Sí se
     guarda en `data-pregunta`, para auditar.
3. **Cómo llegar** (`como-llegar.ts` y `.html`):
   - **Servicios confirmados:** salida con su badge, empresa y tipo, y
     frecuencia en texto. La llegada como «~HH:MM» con «Llegada estimada»,
     u omitida si es `null`.
   - **Pendientes:** un bloque «N servicios pendientes de verificación»,
     plegado por defecto (`<details>`). Cada ítem muestra salida, empresa,
     destino final y motivo. **No se ocultan**, pero tampoco se mezclan con
     los confirmados.
   - **Fuente caída** (`fuente.ok === false`): el aviso «La fuente de
     horarios no responde; mostramos solo datos verificados manualmente y
     pendientes». Se ve lo que llegue.
   - **Sin confirmados pero con pendientes** (ej. SSJ→Purmamarca Pueblo):
     el titular es «No hay un servicio confirmado para este tramo» y debajo
     van los pendientes. No se usa «No hay servicios».
   - **Próximas salidas** (condición D-08: que no se pierda lo que hoy da
     la banda del Home). Por defecto, la lista arranca en la hora actual de
     Jujuy y muestra las próximas salidas confirmadas del tramo con su
     clase. Un control «Ver todo el día» muestra el resto.
   - **Parámetro `?origen=<slug>`** (lo necesita el buscador del 036): si el
     slug está en las opciones, preselecciona el origen. Si es
     `mi-ubicacion`, inicia el mismo flujo de geolocalización del botón.
     Si es inválido, queda Terminal y se ignora el parámetro.
   - Se reemplazan `confianza()` («Horario publicado» / «Horario estimado»)
     y los textos fijos que digan «publicado» sobre llegadas.
4. **Travesía** (`travesia.ts` y `.html`, solo la presentación de los
   tramos y conflictos):
   - Cada tramo lleva el badge de salida y la llegada estimada.
   - El conflicto `cobertura-pendiente` se muestra con su mensaje y la
     cantidad de pendientes.
   - El resumen solo dice que el día «cierra» si `validado === true`.
5. **Home, banda actual** (`home.html` y `home.ts`, mínimo). La banda
   «Próximos servicios» que está hoy en producción usa el helper:
   - salida con su badge;
   - llegada «~HH:MM · Llegada estimada»;
   - pendientes contados al pie.

   El 036 la reemplaza después. Este cambio existe para que producción
   quede correcta aunque el 036 se demore. Es lo que absorbe a A0.

## Alcance de archivos

- `frontend/src/styles.css` (solo el bloque de badges)
- `frontend/src/app/transporte-presentacion.ts` y su `.spec.ts` (nuevos)
- `frontend/src/app/transporte.service.ts` y su spec (tipos de respuesta)
- `frontend/src/app/como-llegar/como-llegar.ts`, `.html`, `.css`,
  `.types.ts` y `.spec.ts`
- `frontend/src/app/travesia/travesia.ts`, `travesia.html`,
  `travesia-plan.css`, `travesia.types.ts` y `travesia.spec.ts`
- `frontend/src/app/home/home.html`, `home.ts` y `home.spec.ts` (solo la
  banda de transporte)

**No tocar:**
- Backend
- `travesia.yapas.ts` (045)
- `travesia.model.ts`, salvo los tipos
- `yapa-mapa/*`
- `site-header/*`
- Tokens

## Tests exigidos (Vitest; trabajá con `tdd`)

1. Helper: un fixture por clase (dataset, manual, pendiente con cada
   motivo, seed sin conciliar) da el texto y la clase de la tabla. Una
   llegada `null` no produce badge de llegada.
2. Helper: ninguna entrada produce el texto «publicad» asociado a una
   llegada.
3. Cómo llegar: con 2 confirmados y 3 pendientes, renderiza 2 ítems en la
   lista principal y «3 servicios pendientes de verificación» plegado.
4. Cómo llegar: con 0 confirmados y 10 pendientes, aparece el titular «No
   hay un servicio confirmado» y los 10 pendientes están accesibles.
5. Cómo llegar: con `fuente.ok: false` aparece el aviso; los servicios
   manuales del fixture se ven con «Dato verificado».
6. Cómo llegar: `?origen=aeropuerto-jujuy` preselecciona el aeropuerto;
   `?origen=xyz` deja Terminal; `?origen=mi-ubicacion` llama a
   geolocalización (mock).
7. Travesía: un tramo publicado muestra «Salida publicada» y «Llegada
   estimada»; el conflicto `cobertura-pendiente` muestra su mensaje y el
   día no dice «cierra».
8. Home, banda: con un fixture de `hq-0023` muestra 07:00 «Salida
   publicada», sin llegada «publicada».
9. Próximas salidas: con el reloj mockeado a las 10:00, la lista arranca
   en la primera salida ≥ 10:00; «Ver todo el día» muestra las anteriores.
10. Regresión: los specs existentes de Cómo llegar, Travesía y Home pasan,
   o se actualizan con la justificación en el recibo.

## Criterios de aceptación

- [ ] Checks de `slices.conf`; build OK; diff dentro del alcance.
- [ ] `kero-audit` en Cómo llegar y Travesía (1440 y 390): contraste de los
      cuatro badges sobre papel y sobre verde, foco del `<details>`, 0
      errores de consola.
- [ ] Recibo con capturas reales contra el backend local del 039 (fecha
      2026-11-17): Terminal→Pucará de Tilcara, Terminal→Cerro Siete Colores
      (sin confirmados) y Humahuaca→Terminal.

## Fuera de alcance

- Rediseño de Travesía (044)
- Yapas (045)
- Home nuevo (036)
- Reglas del validador (046)

---

<!-- ARCHIVO: specs/041-coordenadas-terminal-tilcara.spec.md -->

# Slice 041 — Coordenadas de Terminal SSJ y Tilcara (evidencia ColeJuy)

**Depende de:** 039 (los dos tocan `seed.js` y `routes/transporte.js`; van
encadenados).

**Autorización:** Franco, 2026-11-15. Alcanza **solo** a estas dos paradas.
No se extiende a otras paradas ni a la tabla de 80 paradas de la fuente.

## Valores (dados por Franco)

| Parada (slug) | Actual | Nuevo |
|---|---|---|
| `terminal-jjs` | -24.2128, -65.2891 | **-24.2218, -65.2718** |
| `tilcara` | -23.5776, -65.3934 | **-23.5761, -65.3986** |

## Qué tiene que pasar

1. **Evidencia antes de editar.**
   - Consultar en modo solo lectura `GET /api/urbano/paradas-cercanas`
     (proxy ColeJuy) alrededor de cada coordenada nueva, y registrar en el
     recibo el id, el nombre y las coordenadas de la parada ColeJuy que la
     respalda, con la distancia en metros.
   - Si ColeJuy no tiene paradas en Tilcara (la red es urbana de SSJ), el
     recibo lo dice y la coordenada de Tilcara se aplica igual, porque es
     un valor dado por Franco, citado como tal.
   - Si para la Terminal la parada ColeJuy más cercana queda a más de
     150 m del valor nuevo, **parar y reportar**. No se edita.
2. **`backend/src/seed.js`, `PARADAS_RN9`:** solo `lat` y `lng` de esas dos
   entradas.
3. **`backend/src/routes/transporte.js`, `BASE_ORIGINS['terminal-jjs']`:**
   las mismas coordenadas.
4. **Migración `backend/migrations/005-coordenadas-terminal-tilcara.sql`**,
   idempotente: `UPDATE parada SET lat=…, lng=… WHERE slug IN (…) AND (lat
   <> … OR lng <> …)`, con un comentario que cita la autorización y la
   evidencia. **Se aplica solo en la base descartable del worktree.** En
   producción, en el paso de publicación y con la autorización de Franco.
5. **Tests que dependen de distancias** (`backend/test/como-llegar.test.js`:
   GPS dentro de 300 m y caminata de 0,5 km): se recalculan las entradas
   **relativas a la coordenada nueva**. No se aflojan las aserciones.
6. **Frontend:** los mocks de `como-llegar.spec.ts` no cambian (son
   fixtures). Se declara en el recibo.

## Alcance de archivos

- `backend/src/seed.js` (solo esas 4 cifras)
- `backend/src/routes/transporte.js` (solo `BASE_ORIGINS`)
- `backend/migrations/005-coordenadas-terminal-tilcara.sql` (nuevo)
- `backend/test/como-llegar.test.js` y `backend/test/transporte.test.js`
  (si alguno fija coordenadas)

**No tocar:**
- Otras paradas
- `horario-quebrada.js`
- Supabase y producción

## Tests exigidos

1. `PARADAS_RN9` tiene los dos valores nuevos y las otras 8 paradas quedan
   idénticas (snapshot).
2. Después de migrar la base descartable, `GET /api/transporte/paradas`
   devuelve las coordenadas nuevas.
3. GPS a 200 m de la Terminal nueva → `traslado_inicial: null`. GPS a
   ~500 m → caminata de 0,5 km.
4. La migración es idempotente: correrla dos veces da 0 filas la segunda
   vez.

## Criterios de aceptación

- [ ] Checks verdes contra una base del pool descartable (B-01). Sin pool,
      el guard del 039 hace fallar los tests 2–4 y el slice **no cierra**.
- [ ] Recibo con la evidencia ColeJuy (punto 1) y `git diff --stat`, que
      tiene que mostrar solo los archivos del alcance.

---

<!-- ARCHIVO: specs/042-header-marca-movil.spec.md -->

# Slice 042 — Header compartido, marca JujuyGo y menú móvil

**Depende de:** nada

No comparte archivos con el slice de horarios, así que puede correr en
paralelo con él.

**Estado:** Ola 0, para revisión de Franco.

## Por qué

- La marca pública es **JujuyGo**. Hoy dicen «Yapa» los títulos de ruta,
  `index.html` y los logos de las cuatro pantallas.
- No hay menú en móvil: el nav no entra en 390 ni en 360.
- La maqueta pide un nav único: logo, ítems y el CTA «Planificá tu viaje».

## Qué tiene que pasar

1. **Componente `frontend/src/app/site-header/`** (standalone): logo, nav,
   CTA y menú móvil.
   - Input `variante: 'sobre-foto' | 'papel'`. Sobre la foto es
     transparente con texto papel, y al hacer scroll pasa a papel; ese
     comportamiento de `navFijada` hoy vive en `home.ts` y se mueve al
     componente.
   - **Logo:** el wordmark «JujuyGo» en Fraunces, con el trazo de cerros
     tomado de `docs/mockups/logo/logo-mark.svg` como SVG inline.
     `aria-label="JujuyGo, inicio"`.
   - **Ítems** (solo destinos reales):
     - Zonas → `/` con fragmento `zonas`
     - Mapa → `/` con `mapa`
     - Imperdibles → `/` con `imperdibles`
     - Dormir → `/` con `hospedajes`
     - Travesía → `/travesia`
     - Cómo llegar → `/como-llegar`
   - **CTA** «Planificá tu viaje →» a `/travesia`.
   - **No se muestran:** la lupa (no hay búsqueda), el ítem «Yapas» (no
     tiene destino) ni los desplegables ▾ (no tienen ítems reales).
     Decisión de Franco.
   - **Menú móvil, por debajo de 900 px:**
     - botón «Menú» con `aria-expanded` y `aria-controls`;
     - panel con los ítems y el CTA;
     - Escape cierra y el foco vuelve al botón;
     - navegar cierra el panel;
     - con el panel abierto no hay scroll del fondo;
     - hit areas ≥ 44 px;
     - en 360 no hay overflow.
   - `aria-current="page"` en la ruta activa.
2. **`app.config.ts`:** `withInMemoryScrolling({ anchorScrolling:
   'enabled', scrollPositionRestoration: 'enabled' })` para que los
   fragmentos funcionen desde otras páginas.
3. **Reemplazar los headers propios:**
   - `home.html` (`nav.hero-nav`)
   - `como-llegar.html`
   - `lugar-detalle.html`
   - `travesia.html`: **se conservan** los controles de sesión (avatar,
     «Entrar con Google»). Se reubican dentro del header en el slot
     `<ng-content select="[acciones]">`.
   - `no-encontrado.html`, si tiene header propio.
4. **Títulos:**
   - `app.routes.ts`: «… — JujuyGo».
   - `index.html`: `<title>JujuyGo — Descubrí Jujuy sin auto</title>` y
     `<meta name="description" content="Lugares de Jujuy, cómo llegar en
     colectivo y travesías día por día armadas sobre horarios
     publicados.">`. Copy a confirmar por Franco.
5. **No se renombra** `yapa*`, `TipoYapa`, `/api/yapa/*`, `yapa-mapa` ni las
   clases `.yapa-*`.

## Alcance de archivos

- `frontend/src/app/site-header/*` (nuevo: `.ts`, `.html`, `.css`,
  `.spec.ts`)
- `frontend/src/app/app.config.ts`, `app.routes.ts`, `frontend/src/index.html`
- `home.html`, `home.ts`, `home.css`: solo quitar el nav propio y montar el
  componente
- `como-llegar.html` y `.css`, `lugar-detalle.html` y `.css`,
  `travesia.html` y `travesia-auth.css`, `no-encontrado.html`: solo el
  bloque del header
- Los specs existentes que buscaban «Yapa» en el logo

**No tocar:**
- Backend
- Tokens
- Lógica de travesía y de Cómo llegar
- `docs/design.md` (se actualiza en la Ola 0)

## Tests exigidos (Vitest)

1. El header muestra «JujuyGo» y no muestra «Yapa» como marca, en las cinco
   rutas.
2. Los ítems son exactamente los seis listados y el CTA. No hay lupa, ni
   «Yapas», ni botones de desplegable.
3. Menú móvil: click en el botón → `aria-expanded="true"` y panel visible;
   Escape → cerrado y foco en el botón; navegar → cerrado.
4. En Travesía siguen el botón «Entrar con Google» y el avatar (mocks de
   sesión).
5. Los títulos de las cinco rutas terminan en «— JujuyGo».
6. Los fragmentos: `routerLink="/" fragment="zonas"` presentes.

## Criterios de aceptación

- [ ] Checks de `slices.conf`; build OK; diff dentro del alcance.
- [ ] `kero-audit` en las cinco rutas a 1440, 390 y 360: menú operable por
      teclado, sin overflow, contraste del header sobre foto y sobre papel.
- [ ] Se aplica la regla de DB del plan (B-01). Este slice no toca backend,
      pero `tests-back` corre igual: necesita el pool y el pre-chequeo de
      `.env` de `slices.conf`. Si no están, no se lanza.

---

<!-- ARCHIVO: specs/043-mapa-home.spec.md -->

# Slice 043 — Mapa: lugares, paradas y leyenda (OSM)

**Depende de:** 039

Lo que se usa de ese slice: el slug `purmamarca-pueblo` y el contrato de
paradas con coordenadas `null` y `coordenadas: 'pendiente-autorizacion'`.
Este mapa lo monta después el Home.

**Estado:** Ola 0, para revisión de Franco.

## Decisiones que aplica (Franco, 2026-11-15)

- **Seguimos con OpenStreetMap.** Sin otro proveedor de tiles, sin
  dependencias nuevas y sin simular una capa satelital o de terreno.
- **Pueblo y Cruce de Purmamarca son separados** en datos, en marcadores y
  en la leyenda.
- Las líneas entre paradas son **conexiones esquemáticas**. Nunca se
  presentan como el recorrido del colectivo; tampoco el OSRM.

## Qué tiene que pasar (`yapa-mapa`)

1. **Input nuevo `paradas`** (opcional): `{ slug, nombre, tipo, lat, lng,
   coordenadas? }[]`.
   - Las que tienen coordenadas se dibujan como **marcador verde** con
     ícono de colectivo (SVG inline).
   - Las que tienen `lat: null` **no se dibujan**. Se listan en una nota de
     la leyenda: «Purmamarca Pueblo: parada sin ubicación confirmada».
2. **Lugares** (input existente): siguen en **óxido**.
   - El lugar Cerro de los Siete Colores es un *lugar*, no una parada.
   - El Cruce es una parada verde distinta. La etiqueta del Cruce dice
     «Purmamarca Cruce (RN9)».
3. **Conexión esquemática** opcional (input `conexion: boolean`): una
   polyline punteada fina entre las paradas, en el orden de
   `orden_en_linea`.
4. **Leyenda** (un componente dentro del mapa, accesible como lista):
   - Lugares turísticos
   - Paradas de colectivo
   - Conexión esquemática (no es el recorrido exacto)
   - La nota de paradas sin ubicación, si las hay
5. **Estilo dentro de OSM:**
   - Controles de zoom con tokens. Radios de 3–4 px; 999 px solo en
     píldoras.
   - Filtro opcional sobre la capa de tiles: `sepia` ≤ .25 y `saturate`
     ≤ .9. No puede bajar el contraste de las etiquetas del mapa por debajo
     del de hoy.
   - **La atribución OSM tiene que quedar visible** (ODbL).
6. Los marcadores no se tapan entre sí en el zoom inicial de la Quebrada.
   Si hace falta, se reutiliza el clustering existente (deuda C4 parcial).

## Alcance de archivos

- `frontend/src/app/yapa-mapa/yapa-mapa.component.ts`, `.html`, `.css`,
  `.types.ts` y `.spec.ts`
- `yapa-mapa.clustering.ts` (solo si hace falta para las paradas)

**No tocar:**
- `home.*` (el 036 monta el mapa con paradas)
- `como-llegar.*`
- Backend
- `package.json`

## Tests exigidos (Vitest)

1. Con 3 paradas con coordenadas y 1 con `null`: 3 marcadores de clase
   parada y la nota de la leyenda nombra la parada sin ubicación.
2. Las clases de marcador son distintas para lugar y para parada. Cruce y
   Pueblo nunca comparten marcador.
3. La leyenda tiene los tres ítems y queda expuesta como `role="list"`.
4. `conexion=true` dibuja una sola polyline con `dashArray`.
5. La atribución OSM está presente en el DOM.
6. Sin el input `paradas`, el comportamiento actual no cambia (regresión de
   los specs existentes).

## Criterios de aceptación

- [ ] Checks de `slices.conf`; build OK; diff dentro del alcance.
- [ ] Captura del mapa en una página de prueba del spec, o el recibo
      explica cómo se verificó.

---

<!-- ARCHIVO: specs/044-travesia-v2.spec.md -->

# Slice 044 — Travesía v2 map-first (reescribe el 037)

**Depende de:** 040, 046

- 040: badges y presentación de las cuatro clases en `travesia.*`.
- 046: el validador emite `sin-regreso`, `dia-vacio` y `condicional`. Esta
  pantalla los muestra.

**Estado:** Ola 0. Franco aprobó la reescritura del 037 como 044
(2026-11-15). El spec `037-travesia-timeline.spec.md` queda **reemplazado**.

## Fuente de verdad

- El prototipo v2
  (`C:\Users\Elect\orca\projects\prototipos-jujuygo\travesia-v2.html`,
  `.css` y `.js`, gh-pages `0e415b2`) con las 22 pruebas de interacción de
  `pruebas/`: un solo mapa, los días como objetos, paradas operables y hoja
  inferior en móvil.
- `docs/design.md`.
- Los datos del prototipo son de ejemplo. **No son fixtures funcionales.**

Skills: `badesign-skill`, `emil-design-eng`, `gestures` (hoja inferior),
`mobile-native` y `kero-audit`.

## Condiciones de Franco (cada una con test)

1. No afirmar que un itinerario cierra si falta el regreso: se muestra el
   conflicto `sin-regreso` del 046.
2. Los eventos superpuestos se ven en el día: `eventos-superpuestos`.
3. Los días sin transporte de regreso quedan identificados.
4. Las cuatro clases se distinguen (helper del 040).
5. Si falla la fuente, la información sigue disponible: aviso, más los
   datos manuales y pendientes. El plan no «cierra».
6. No se eliminan datos manuales verificados (la UI no filtra
   `procedencia: 'manual-verificado'`).
7. Sin escrituras inseguras: los tests mockean Supabase; el guardado sigue
   igual que hoy (RLS del usuario).

## Qué tiene que pasar

1. **Un solo mapa** para todo el plan, con los puntos del día seleccionado
   resaltados y los de los otros días atenuados. `fitBounds` al día, con
   padding.
   - Se reutiliza `yapa-mapa` (043) si alcanza; si no, se declara en el
     recibo qué se reutilizó.
   - Las etiquetas atenuadas no tapan las activas: deuda visual de la v2
     (la etiqueta de Tilcara).
2. **Días como objetos**: tarjeta o pestaña por día con fecha, estado
   (cierra / condicional / no cierra / sin plan), eventos y tramos.
   - En desktop, el día 2 del plan piloto entra en el panel sin recortarse
     (deuda de la v2).
3. **Paradas operables**: tocar una parada en la lista o en el mapa muestra
   sus servicios del tramo con las clases.
   - El piloto tiene que mostrar así estos dos registros:
     - `hq-0595` como «Pendiente de verificación» (Q3);
     - `hq-0761` como pendiente con el destino final Perico (Q4).
4. **Móvil**: una hoja inferior con dos alturas (resumen y detalle),
   arrastrable 1:1, que se puede interrumpir. Escape o el botón cierran.
   Respeta `prefers-reduced-motion`.
5. **Traslados sin horario** (Hornocal, acceso local): el día se marca
   «Condicional: el traslado local no tiene horario fijo; verificá el
   regreso».
6. El wizard de armado y el guardado no se rediseñan; solo se reubican.

## Alcance de archivos

- `frontend/src/app/travesia/travesia.html`, `travesia.ts`,
  `travesia.css`, `travesia-plan.css`, `travesia-motion.css` y
  `travesia.spec.ts`
- `travesia.types.ts`: los tipos de los conflictos nuevos del 046
- Un componente nuevo opcional en `frontend/src/app/travesia/plan-mapa/*`

**No tocar:**
- `travesia.yapas.ts` y la `yapa-card` (045)
- Backend
- `yapa-mapa/*`: si hace falta cambiarlo, se declara y se frena
- Tokens

## Tests exigidos (Vitest)

1. Un plan validado con regreso muestra «cierra». Con el conflicto
   `sin-regreso` no lo muestra, y el aviso y su propuesta son visibles.
2. Con `eventos-superpuestos`, el día muestra el aviso y los dos eventos
   quedan marcados.
3. Con `dia-vacio`, el día queda en estado «sin plan» y no cuenta como
   cerrado.
4. `condicional` (acceso local sin horario) muestra el texto del punto 5.
5. `fuente.ok: false` muestra el aviso. Los tramos manuales del fixture se
   ven con «Dato verificado» y el plan no dice «cierra».
6. Al seleccionar el día 2, el mapa recibe solo las coordenadas de ese día
   como activas (spy sobre `fitBounds`).
7. Hoja inferior: con un ancho de 390, existe; Escape la cierra; con
   reduced motion no hay transición (clase).
8. El guardado sigue llamando al servicio mockeado con el mismo
   `PlanTravesia` que antes (regresión).

## Criterios de aceptación

- [ ] Checks de `slices.conf`; build OK; diff dentro del alcance.
- [ ] `kero-audit` en 1440, 390 y 360; captura por estado de día; 0
      errores de consola.
- [ ] Recibo contra el backend local del 039 y el 046, con el plan piloto
      17–19/11/2026.

---

<!-- ARCHIVO: specs/045-yapas-inline.spec.md -->

# Slice 045 — Yapas dentro del plan (reescribe el 038 sobre la v2)

**Depende de:** 044

**Estado:** Ola 0. El spec `038-yapas-inline.spec.md` queda
**reemplazado**. Se conserva su intención: la yapa vive dentro del día y
explica por qué no rompe el plan.

## Qué tiene que pasar

1. Cada yapa sugerida se inserta en el día de la v2, en su posición
   cronológica (`hora_sugerida`). Si no la tiene, va después del evento al
   que aplica; la regla se declara en el recibo. Visual: la caja `✳ yapa`
   del prototipo.
2. **«Cierra porque…»**: la justificación sale **solo** de datos validados
   (el mismo servicio, la ventana entre tramos validados o la caminata
   adyacente con su margen).
   - Si no hay razón demostrable, la línea no se muestra.
   - **Se elimina el texto genérico** «sale de los horarios reales»
     (`travesia.html`, A5).
3. Las yapas nunca usan un servicio pendiente, del seed sin conciliar o de
   un día condicional como justificación.
4. Las acciones Sumar y Dejar pasar se mantienen. Sumar convierte la yapa en
   evento y **re-valida** el día; si deja de cerrar, se ve el conflicto.
5. La `yapa-card` separada desaparece.
6. No se renombra `yapa*`, `TipoYapa` ni `/api/yapa/*`. El backend no se
   toca.

## Alcance de archivos

- `frontend/src/app/travesia/travesia.yapas.ts` y su spec
- `travesia.html`, `travesia.ts` y los CSS de travesía (solo el bloque de
  yapas)
- `travesia.spec.ts`

## Tests exigidos (Vitest)

1. Una yapa con `hora_sugerida` queda entre los eventos correctos.
2. Una yapa sin razón demostrable no tiene la línea «Cierra porque».
3. Ninguna yapa cita un servicio con `cobertura: 'pendiente'`.
4. Sumar → aparece el evento y se llama a validar. Si la validación
   devuelve un conflicto, se ve el conflicto.
5. No queda `.yapa-card` en el DOM, ni el texto «sale de los horarios
   reales».

## Criterios de aceptación

- [ ] Checks de `slices.conf`; build OK; diff dentro del alcance.
- [ ] `kero-audit` en 1440 y 390.

---

<!-- ARCHIVO: specs/046-validador-cierre.spec.md -->

# Slice 046 — Validador: un plan cierra solo si cierra de verdad

**Depende de:** 039 (que ya cambia `validar.js` y `routes/travesia.js`).

Puede correr en la misma ola que el 040, una vez que el 039 tenga CIERRA y
esté en master. El 040 es solo frontend y este es solo backend: no
comparten archivos.

**Estado:** Ola 0, para revisión de Franco.

## Problemas verificados en `backend/src/itinerario/validar.js` (master `7bc370b`)

- **Último día sin regreso.** Cuando `llegada === 'auto'`, el generador
  (`travesia.model.ts:261`) pone `cierre = ultimaParada` en el último día.
  `validarTramo` sale temprano si `origen === destino` (línea 111): no hay
  tramo de regreso, no hay conflicto y el día queda `validado: true`.
- **Día sin eventos.** Da `validado: true` con 0 conflictos y cuenta como
  un día que «cierra».
- **Traslado local sin horario** (Hornocal: `acceso_local`). Se trata como
  si un margen fijo resolviera el regreso.
- **Eventos superpuestos.** El conflicto existe (línea 197), pero se salta
  el tramo de ese evento y `paradaActual` avanza igual. El tramo siguiente
  se valida desde una parada a la que el plan nunca llegó.

## Qué tiene que pasar

1. **`sin-regreso`.** En el último día, el destino de cierre es
   `plan.termina_en` (campo nuevo, opcional) o, si falta, el `origen` del
   día 1 o `terminal-jjs`.
   - Si la última parada es distinta y no se resuelve un tramo `regreso`,
     hay conflicto `sin-regreso`: «El último día no tiene regreso a {X}».
     La propuesta es «Agregá el regreso o indicá dónde termina tu viaje».
   - Si `plan.termina_en` es igual a la última parada, no hay conflicto: el
     viajero lo declaró.
2. **`dia-vacio`.** Un día sin eventos da `estado: 'sin-plan'`,
   `validado: false` y un aviso (no un error). No cuenta para el
   `validado` del plan.
3. **`condicional`.** Si un evento tiene `acceso_local` y no hay un horario
   para ese acceso, el día queda `condicional: true` con el motivo, y
   `validado: false`. El plan puede decir «cierra con condiciones», nunca
   «cierra».
4. **Superpuestos.** Ante `eventos-superpuestos`, `paradaActual` **no**
   avanza a la parada del evento superpuesto: el tramo siguiente sale de
   la última parada alcanzada.
5. **Fuente caída** (`fuente.ok === false` del 039). Los tramos que solo se
   resolverían con el dataset dan `fuente-no-disponible`. Los que resuelve
   una entrada manual sí se resuelven.
6. `validado` del plan = todos los días `validado === true`, ninguno
   `sin-plan` ni `condicional`, y sin `sin-regreso`.
7. **El contrato solo suma cosas:** el campo opcional `termina_en`; los
   tipos de conflicto `sin-regreso`, `dia-vacio` y `fuente-no-disponible`;
   y en cada día, `estado` y `condicional`. Consumidores revisados:
   `travesia.ts` y `travesia.types.ts`. Los tipos nuevos los agrega el 044;
   mientras tanto el frontend actual los muestra como conflictos genéricos,
   que ya sabe pintar.

## Alcance de archivos

- `backend/src/itinerario/validar.js`
- `backend/src/routes/travesia.js` (validación de `termina_en`)
- `backend/test/itinerario.test.js` y `backend/test/travesia.test.js`

**No tocar:**
- El frontend (el 044 muestra esto)
- `margenes.js`, salvo leer de él
- Datos

## Tests exigidos (`node --test`, puros sobre `validarItinerario`, sin DB)

1. Último día que termina en Humahuaca, sin `termina_en` → `sin-regreso`, y
   el plan da `validado: false`.
2. Lo mismo con `termina_en: 'humahuaca'` → sin conflicto `sin-regreso`.
3. Un día con `eventos: []` → `estado: 'sin-plan'`, y el plan da
   `validado: false`.
4. Un evento en Hornocal (acceso local) → `condicional: true`, y el día da
   `validado: false`.
5. Eventos A 10:00 (120 min) y B 10:30 en otra parada → hay
   `eventos-superpuestos` y el tramo hacia C sale de la parada de A.
6. Con `fuente.ok: false` y sin manuales → `fuente-no-disponible`. Con un
   manual que cubre el tramo → resuelto.
7. Regresión: los casos existentes de `itinerario.test.js` siguen verdes, o
   se justifica cada cambio.

## Criterios de aceptación

- [ ] Checks de `slices.conf`. Estos tests no usan DB.
- [ ] Recibo con el JSON real de `/travesia/validar` para el plan piloto
      contra el backend local.

---

<!-- ARCHIVO: docs/inventario-imagenes.md -->

# Inventario de imágenes y recursos visuales — JujuyGo

> Relevado el 2026-11-15 sobre master `7bc370b`. Fuentes:
> - `backend/migrations/001-zonas-lugares.sql` y `004-fotos-lugares.sql`
>   (columna `lugar.foto`)
> - `003-hospedaje.sql`
> - `frontend/src/app/foto.ts` (fallback por zona)
> - `home.html`, `lugar-detalle.html`, `travesia.html`, `yapa-mapa`,
>   `como-llegar`, `index.html`
> - `frontend/public/img/CREDITS.md`
> - la maqueta «Descubrí Jujuy»
>
> **No se descargó, generó ni incorporó ninguna imagen.** Los tiles de OSM
> no cuentan como fotos.

## Qué hay hoy en `frontend/public/img/`

Son 10 fotos de Wikimedia Commons, cada una en 4 formatos (JPG + WebP 640,
1280 y 1920).

| Archivo | Qué muestra en realidad (CREDITS.md) | Autor | Licencia |
|---|---|---|---|
| `purmamarca.jpg` | Cerro de los Siete Colores | Bernard Gagnon | CC BY-SA 4.0 |
| `garganta.jpg` | Garganta del Diablo, Tilcara | Marcelo Toconás | CC BY-SA 4.0 |
| `tilcara.jpg` | Pucará de Tilcara | Bernard Gagnon | CC BY-SA 4.0 |
| `hornocal.jpg` | Serranía de Hornocal | Bernard Gagnon | CC BY-SA 4.0 |
| `humahuaca.jpg` | **Cabildo** de Humahuaca | César Pérez | CC BY-SA 4.0 |
| `tren.jpg` | Tren Solar en la estación Volcán | Argentina.gob.ar | CC BY 4.0 |
| `salinas.jpg` | Salinas Grandes | Bernard Gagnon | CC BY-SA 4.0 |
| `puna.jpg` | Vicuñas en la Puna (genérica) | Jäkel.Andrés | CC BY-SA 4.0 |
| `calilegua.jpg` | Camino interno del PN Calilegua | Andrés Octavio Arias | CC BY-SA 4.0 |
| `salsaju.jpg` | **Cabildo** de San Salvador de Jujuy | Dpalma01 | CC BY-SA 4.0 |

Disponible y sin usar: `docs/mockups/assets/artesanias.jpg` (feria de
artesanos de la plaza de Purmamarca, CC BY-SA 4.0, Vanina Rossi).

Hoy no hay créditos visibles en la app. CC BY-SA exige atribución: el
footer del 036 lo resuelve.

## Inventario

Estados posibles: **disponible y correcta** · **disponible pero incorrecta**
· **repetida** · **faltante** · **pendiente de verificar** · **no aplica**.

### 1. Home (maqueta)

| Página/sección | Elemento exacto | Imagen actual | Estado | Imagen necesaria | Prioridad |
|---|---|---|---|---|---|
| Home · hero | **H-01**: colectivo en una ruta jujeña con cardones | `purmamarca.jpg` (Siete Colores) | faltante (hay una provisoria) | Foto real de un colectivo interurbano en la RN9 o la RN52 en la Quebrada, con cardones. **La consigue Franco** (requisitos abajo) | P0 |
| Home · hero móvil | Recorte vertical de H-01 | — | faltante | El mismo H-01 recortado a 9:16 con el colectivo dentro de la zona segura. Si el encuadre no lo permite, hace falta una toma vertical aparte | P0 |
| Home · regiones | Quebrada | `purmamarca.jpg` (Cerro Siete Colores, por `lugar_destacado`) | disponible y correcta | — (mientras H-01 no llegue, se repite con el hero provisorio) | — |
| Home · regiones | Valles | `salsaju.jpg` (Cabildo SSJ) | disponible pero incorrecta: es un edificio urbano y no representa el paisaje de Valles | Paisaje de los Valles. Sirve la misma foto de Lagunas de Yala o de Termas de Reyes (ver L-16 y L-15), sin foto extra | P1 |
| Home · regiones | Yungas | `calilegua.jpg` (camino en selva) | disponible y correcta | Opcional: la maqueta muestra una cascada. No es necesaria | P2 |
| Home · regiones | Puna | `salinas.jpg` (Salinas Grandes) | disponible y correcta | Opcional: la maqueta muestra flamencos. Si llega L-09 (Pozuelos), puede usarse | P2 |
| Home · yapa destacada | Lugar propuesto: Pucará de Tilcara | `tilcara.jpg` | disponible y correcta | — (si Franco elige otro lugar, va la foto de ese lugar) | — |
| Home · «¿Dónde dormir?» | **H-08**: imagen de la banda | ninguna | faltante | Arquitectura de adobe típica de un pueblo de la Quebrada (fachada o calle), **sin identificar ningún hospedaje**, para no sugerir una recomendación | P1 |
| Home · «Armá tu travesía» | Ilustración lineal de cerros | ninguna | faltante (recurso gráfico) | **G-02**, SVG en código. No es foto | P1 |
| Home · pausa fotográfica | Cita sobre la Puna | `puna.jpg` | no aplica | Sale del Home según la maqueta. No se necesita | — |

### 2. Zonas y regiones (panel de zona en el Home)

El hero del panel usa la foto del `lugar_destacado`: el primer lugar con
foto, en orden de `id`.

| Página/sección | Elemento exacto | Imagen actual | Estado | Imagen necesaria | Prioridad |
|---|---|---|---|---|---|
| Panel de zona | Quebrada | `purmamarca.jpg` | disponible y correcta | — | — |
| Panel de zona | Puna | `salinas.jpg` | disponible y correcta | — | — |
| Panel de zona | Yungas | `calilegua.jpg` | disponible y correcta | — | — |
| Panel de zona | Valles | `salsaju.jpg` (Cabildo, sale de Plaza Belgrano) | disponible pero incorrecta para representar la región | La misma de Valles de arriba | P1 |

### 3. Lugares del catálogo (17; se ven en el detalle, Imperdibles, el mapa, Travesía y el panel de zona)

`lugar-detalle` muestra la foto como hero cuando `lugar.foto` no es nula.
Desde la migración 004, **los 17 tienen valor**, así que en 9 detalles hoy
se ve como foto del lugar una imagen de otro sitio.

| Página/sección | Elemento exacto | Imagen actual | Estado | Imagen necesaria | Prioridad |
|---|---|---|---|---|---|
| Lugar L-01 | Cerro de los Siete Colores (Purmamarca) | `purmamarca.jpg` | disponible y correcta | — | — |
| Lugar L-02 | Garganta del Diablo (Tilcara) | `garganta.jpg` | disponible y correcta | — | — |
| Lugar L-03 | Pucará de Tilcara | `tilcara.jpg` | disponible y correcta | — | — |
| Lugar L-04 | Serranía del Hornocal | `hornocal.jpg` | disponible y correcta | — | — |
| Lugar L-05 | Tren Solar de la Quebrada — estación Volcán | `tren.jpg` | disponible y correcta | — | — |
| Lugar L-06 | Paleta del Pintor (Maimará) | `purmamarca.jpg` | repetida e incorrecta (es Siete Colores, en Purmamarca) | La ladera de la Paleta del Pintor vista desde Maimará | P1 |
| Lugar L-07 | Monumento a los Héroes de la Independencia (Humahuaca) | `humahuaca.jpg` (Cabildo de Humahuaca) | disponible pero incorrecta (otro edificio del mismo pueblo) | El monumento y su escalinata | P1 |
| Lugar L-08 | Salinas Grandes | `salinas.jpg` | disponible y correcta | — | — |
| Lugar L-09 | Laguna de los Pozuelos | `puna.jpg` (genérica) | repetida y genérica | La laguna o sus aves (flamencos), tomada en el área protegida | P1 |
| Lugar L-10 | Abra Pampa | `puna.jpg` | repetida y genérica | La localidad de Abra Pampa | P2 |
| Lugar L-11 | La Quiaca | `puna.jpg` | repetida y genérica | La ciudad de La Quiaca (mercado, paso fronterizo o calle) | P2 |
| Lugar L-12 | Parque Nacional Calilegua | `calilegua.jpg` | disponible y correcta | — | — |
| Lugar L-13 | Termas de Caimancito | `calilegua.jpg` | repetida e incorrecta | Las termas de Caimancito | P2 |
| Lugar L-14 | San Francisco (Yungas) | `calilegua.jpg` | repetida e incorrecta | El pueblo de San Francisco o su entorno de selva | P2 |
| Lugar L-15 | Termas de Reyes | `salsaju.jpg` (Cabildo SSJ) | disponible pero incorrecta | El valle o el complejo termal de Reyes | P1 |
| Lugar L-16 | Lagunas de Yala | `salsaju.jpg` (Cabildo SSJ) | disponible pero incorrecta | Las lagunas del Parque Potrero de Yala. **También resuelve la región Valles** | P1 |
| Lugar L-17 | Casa de Gobierno y Plaza Belgrano | `salsaju.jpg` (Cabildo SSJ) | pendiente de verificar: el Cabildo está sobre la Plaza Belgrano, pero no es la Casa de Gobierno | Franco decide si el Cabildo alcanza o hace falta la Casa de Gobierno | P2 |

### 4. Hospedajes (los seis de `003-hospedaje.sql`; todos `verificado: false`, `fuente: 'por verificar'`)

Ninguno tiene foto: hoy se muestran iniciales. No se agrega ningún dato; la
columna «Región» sale de `zona_slug`.

| Establecimiento (nombre exacto) | Localidad | Región | Tipo (en la base) | Imagen actual | ¿Correcta? | ¿Repetida? | Imágenes necesarias | Estado | Prioridad |
|---|---|---|---|---|---|---|---|---|---|
| Hotel Huacalera | Huacalera | Quebrada | hotel | ninguna (iniciales «HH») | no aplica | no | 1 | faltante | P2 |
| Las Terrazas | Purmamarca | Quebrada | hotel | ninguna (iniciales) | no aplica | no | 1 | faltante | P2 |
| La Comarca | Purmamarca | Quebrada | hotel | ninguna (iniciales) | no aplica | no | 1 | faltante | P2 |
| El Reposo del Diablo | Tilcara | Quebrada | hotel | ninguna (iniciales) | no aplica | no | 1 | faltante | P2 |
| Posada Con Los Ángeles | Tilcara | Quebrada | posada | ninguna (iniciales) | no aplica | no | 1 | faltante | P2 |
| Vientonorte | Tilcara | Quebrada | hotel | ninguna (iniciales) | no aplica | no | 1 | faltante | P2 |

Condición para cada fila: la foto entra **solo** si el establecimiento está
verificado y la foto es propia o tiene permiso explícito del alojamiento.
Mientras sigan «por verificar», no se agregan fotos (darían apariencia de
recomendación confirmada).

No hay más hoteles, hostales, cabañas ni campings en el proyecto: la tabla
`hospedaje` tiene 6 filas y no hay otras fuentes en el código.

### 5. Transporte y mapas

| Página/sección | Elemento exacto | Imagen actual | Estado | Imagen necesaria | Prioridad |
|---|---|---|---|---|---|
| Cómo llegar | Fotos | ninguna | no aplica | La pantalla es operativa y no necesita fotos | — |
| Mapa (Home y Cómo llegar) | **G-04**: marcador de parada (verde, con ícono de colectivo) | `divIcon` sin ícono | faltante (recurso gráfico) | SVG inline (043) | P1 |
| Mapa | Marcador de lugar (óxido) | `divIcon` existente | disponible y correcta | — | — |
| Mapa | Marcadores de origen, destino y terminal (Cómo llegar) | `divIcon` existentes | disponible y correcta | — | — |
| Mapa | Leyenda (tres ítems y nota de paradas sin ubicación) | no existe | faltante (componente) | Va en el 043 | P1 |
| Mapa | Distinción entre Purmamarca Pueblo y Cruce | un solo tipo de marcador | faltante | En el 043: el Cruce es parada y el Pueblo queda sin marcador hasta Q1 | P1 |

### 6. Otras páginas y recursos gráficos

| Página/sección | Elemento exacto | Imagen actual | Estado | Imagen necesaria | Prioridad |
|---|---|---|---|---|---|
| Travesía | Fotos de los lugares elegidos | Las de la sección 3 | según cada lugar (sección 3) | — | — |
| Travesía | Avatar del usuario | URL de Google | no aplica | — | — |
| Yapas | Foto del lugar sugerido | Las de la sección 3 | según cada lugar | — | — |
| Guías | Fotos de guías | ninguna (iniciales; las migraciones no cargan filas en `guia`) | no aplica | No se muestran personas sin consentimiento | — |
| No encontrado | — | ninguna | no aplica | — | — |
| Header y footer | **G-03**: logo JujuyGo (wordmark + cerros) | `docs/mockups/logo/*.svg` dice «Yapa» | disponible pero incorrecta (marca) | El wordmark JujuyGo en texto Fraunces con el trazo de cerros de `logo-mark.svg` (042). Sin archivo nuevo | P0 |
| Global | **G-01**: borde de papel rasgado | ninguno | faltante (recurso gráfico) | SVG en código (036) | P1 |
| Global | **G-05**: íconos (pin, bandera, buscar del botón del buscador, info, cama, estrella, flecha, colectivo, menú) | ninguno (sin librería de íconos) | faltante (recurso gráfico) | SVG inline en código, sin dependencias | P1 |
| Pestaña del navegador | **G-06**: favicon | `frontend/public/favicon.ico` | pendiente de verificar (puede ser el de Angular por defecto) | Favicon con el trazo de cerros de JujuyGo | P2 |
| Compartir y SEO | **G-07**: imagen OG de 1200×630 | ninguna | faltante | Recorte derivado de H-01, con su crédito | P2 |
| `pitch/` | Landing de pitch | Fotos propias del sitio | no aplica | Está fuera de la app y no se inventarió | — |

## Totales (solo fotografías; los recursos G-xx son gráficos en código)

Las fotos distintas se cuentan una vez aunque se usen en varios lugares: la
de Siete Colores sirve para el lugar, la región y el panel.

| | Cantidad |
|---|---|
| **Fotos distintas necesarias** | **25** (17 lugares + hero H-01 + banda Dormir H-08 + 6 hospedajes). La región Valles sale de L-15 o L-16 |
| Disponibles y correctas | **7** (L-01, L-02, L-03, L-04, L-05, L-08, L-12) |
| Pendientes de verificar | **1** (L-17) |
| Faltantes | **17** = 9 lugares (L-06, L-07, L-09, L-10, L-11, L-13, L-14, L-15, L-16) + H-01 + H-08 + 6 hospedajes |
| A conseguir personalmente por Franco | **11 obligatorias** (H-01, H-08 y los 9 lugares) · **6 condicionales** (hospedajes, solo si se verifican y con permiso) · **1 según decisión** (L-17) |
| Recortes derivados (no son fotos nuevas) | H-01 vertical para móvil · G-07 imagen OG |
| Recursos gráficos a crear en código | 7 (G-01 a G-07) |

## Fotos que tiene que conseguir Franco (descripción concreta)

Requisitos comunes:
- **Real**, no generada por IA.
- **Licencia** que permita publicar (propia, cedida por escrito o CC BY /
  BY-SA con autor). Se registra en `CREDITS.md`.
- Al menos **2400 px** en el lado largo.
- Sin caras reconocibles sin consentimiento. Sin patentes legibles.
- Sin logos de empresas en primer plano, salvo permiso: un logo sugiere un
  servicio recomendado.

1. **H-01 — Hero.**
   - Qué tiene que mostrar: un colectivo interurbano real circulando por la
     RN9 o la RN52 en la Quebrada, con cardones y cerros de color.
   - Encuadre horizontal 16:9 o más ancho (mínimo 2560×1440), con el
     colectivo en el **tercio derecho** y cielo o ladera calma a la
     izquierda para el titular y el buscador.
   - Tiene que dejar un recorte vertical 9:16 con el colectivo entero. Si
     no se puede, hace falta una segunda toma vertical.
   - Luz de mañana o de tarde, sin cielo quemado.
   - **No inventa recorridos:** se registra en qué ruta y dónde se tomó.
2. **H-08 — «¿Dónde dormir?».** Una fachada o calle de adobe de un pueblo
   de la Quebrada (Tilcara, Purmamarca o Humahuaca), **sin cartel de ningún
   alojamiento**. Horizontal; el sujeto puede estar a la derecha.
3. **L-06 — Paleta del Pintor.** La ladera multicolor vista desde Maimará o
   desde la RN9 frente al pueblo.
4. **L-07 — Monumento a los Héroes de la Independencia.** El monumento con
   la escalinata, en Humahuaca.
5. **L-09 — Laguna de los Pozuelos.** El espejo de agua o las aves
   (flamencos, parinas), tomada desde un sector habilitado. También puede
   servir para la tarjeta Puna.
6. **L-10 — Abra Pampa.** Una vista de la localidad (calle, iglesia o
   paisaje inmediato).
7. **L-11 — La Quiaca.** La ciudad: mercado, calle o el paso fronterizo.
8. **L-13 — Termas de Caimancito.** Las piletas o el entorno termal.
9. **L-14 — San Francisco (Yungas).** El pueblo o el camino de selva de
   montaña.
10. **L-15 — Termas de Reyes.** El valle o el complejo termal.
11. **L-16 — Lagunas de Yala.** Las lagunas con el bosque montano. **También
    es la imagen de la región Valles.**

Condicionales:
- **Hospedajes (6):** una foto por establecimiento, solo después de
  verificarlo y con permiso escrito.
- **L-17:** solo si Franco decide que el Cabildo no alcanza para «Casa de
  Gobierno y Plaza Belgrano».

## Riesgo detectado (para decidir)

En 9 páginas de detalle, hoy se muestra como foto del lugar una imagen de
otro sitio. Ejemplos: Termas de Reyes con el Cabildo de SSJ, la Paleta del
Pintor con el Siete Colores. La migración 004 asignó fotos de la zona como
relleno.

Hasta que lleguen las fotos, propuesta para un slice P1: que en esos casos
el detalle muestre «Foto ilustrativa de la región» como pie, o que no
muestre hero. Ver la decisión D-11 del plan.

---

<!-- ARCHIVO: docs/design.md -->

# JujuyGo — design system v0 (kero-system)

Dirección aprobada por el dueño sobre `docs/mockups/mock-04.html` (fuente de verdad visual de tokens y patrones).
**Composición del Home: manda la maqueta aprobada «Descubrí Jujuy»** (`docs/mockups/maqueta-descubri-jujuy.png`; decisión de Franco 2026-11-15). Donde este documento y la maqueta choquen en el Home, gana la maqueta; el resto de este sistema sigue vigente.
Gobierna toda pantalla de JujuyGo. Referencias madre: travel-sensations.com (calidez editorial, GPS-como-ornamento), Citymapper/Moovit (precisión operativa), Explora (datos como ornamento).

## Identidad

**JujuyGo** es la marca pública. «Jujuy se descubre. También se puede recorrer sin auto.» Los itinerarios se llaman **travesías**. Las recomendaciones inteligentes se llaman **yapas** (el extra que te regala Jujuy): son un feature dentro del plan, no la identidad principal. Los identificadores técnicos `yapa*`, `TipoYapa`, `/api/yapa/*` no se renombran.

## Personalidad

Editorial cálida + precisión quirúrgica. Revista para soñar, instrumento para moverse.
Jamás: look de template, emoji como ícono, círculos de colores con iniciales, cards iguales en grilla (excepción única: las cuatro regiones del Home, según la maqueta), píldoras de colores, pasteles dulzones, tipografía system-font a 14px para títulos.

## Tokens

```css
--tinta: #241610;  --papel: #F4EDE3;  --arena: #EDE2D0;
--oxido: #B5492A;  /* acento único */
--ocre:  #C9A86A;  /* sol, detalles, itálicas sobre foto */
--verde: #2E4A3E;  /* banda operativa / transporte */
--t60: rgba(36,22,16,.62); --t30: rgba(36,22,16,.32); --t14: rgba(36,22,16,.14);
```

- **Display/serif:** Fraunces (variable; weight 340–520, itálica para acentos)
- **Texto/datos:** Archivo 300–600; números `tabular-nums` siempre
- **Espaciado:** escala 4·n; secciones 110px verticales; radios 3–4px en imagen, 999px solo nav/CTA
- **Grano:** overlay SVG feTurbulence 5% global — mata el plástico
- **Sombras:** ninguna decorativa; profundidad solo por capa foto↔texto

## Patrones de página (del mock aprobado; el Home sigue la maqueta)

- **Hero a sangre:** foto a sangre, velo gradiente. En el Home (maqueta): header compartido sobre la foto, titular serif alineado a la izquierda, buscador Desde/Hasta funcional y nota de verificación de horarios; sin coordenadas al pie
- **Secuencia narrativa:** Imaginá → Armalo → Vivílo → Acordate como columnas con regla fina (no tarjetas). No forma parte del Home de la maqueta
- **Zonas / regiones:** en el Home, cuatro tarjetas iguales (Quebrada, Valles, Yungas, Puna) con foto, nombre y flecha, según la maqueta. Fuera del Home, el collage asimétrico (1 grande + 3 laterales, foto con datos `KM · MSN`) sigue disponible
- **Mapa del Home:** OpenStreetMap con lugares (óxido), paradas (verde) y leyenda; sin simular terreno ni satélite; Purmamarca Pueblo y Cruce separados
- **Bordes de papel rasgado y línea de cerros:** ornamentos SVG en código, `aria-hidden`
- **Imperdibles:** filas editoriales `num itálica | nombre serif | texto | meta | →`, reglas finas
- **Pausa fotográfica:** foto a sangre + cita entre secciones
- **Banda operativa (verde):** la herramienta — timeline de tramos con nodos-punto ocre
- **Footer:** wordmark + frase («Turismo de Jujuy, con identidad.») + solo enlaces a destinos que existen + créditos de fotos; sin redes ni páginas inexistentes

## Modelo de interacción (4 momentos)

1. **Soñar** — sin login, modo revista: zonas/imperdibles/dormir/guías; cada lugar responde qué es y cómo se llega
2. **Armar** — 3 preguntas (fechas, llegada, intereses) → plan día por día validado contra horarios reales; edición re-valida en vivo con aviso de conflicto
3. **Viajar** — tarjeta grande "lo que toca ahora"; alerta antes de bajar; plan B si perdés el bondi
4. **Recordar** — travesía guardada local + link compartible; sin cuenta en MVP

## Capa IA — las yapas

Gemini genera sugerencias **por usuario, por contexto, por momento** — nunca plantillas:

- **Contexto por llamada:** itinerario actual + catálogo real + horarios + historial del usuario + hora `America/Argentina/Jujuy`
- **Memoria (vía Supabase):** yapas aceptadas/rechazadas alimentan el próximo prompt — efecto "aprende de vos"
- **Disparadores sanos:** al editar el plan, víspera del viaje, mañana del día, al llegar a un waypoint. Nunca notificaciones intempestivas; la yapa vive dentro del plan
- **Validador backend (antes de mostrar):** solo lugares del catálogo, solo si cierra logísticamente (tiempo + bondi). Lo inválido se descarta invisible
- **UI:** tarjeta `✳ yapa` insertada en el timeline del día, con la sugerencia y el porqué logístico

## Movimiento — capa de verdad (no mentir nunca)

- Tiempo real (si la API de Santa Ana responde): "el bondi llega en 6 min"
- Horario publicado (default): "sale ~9:40 (horario publicado, llegá 15 min antes)"
- Mismo diseño, dos verdades — la honestidad es el feature

## Fuera del sistema

- Sin e-commerce, sin chat libre, sin login en MVP, sin WebGL pesado
- Idiomas: ES base; PT/EN cuando haya texto de producto (15% extranjeros, Brasil primero)

---

<!-- ANEXO: diff de docs/design.md contra master -->

```diff
diff --git a/docs/design.md b/docs/design.md
index ddaf45e..6ede3fb 100644
--- a/docs/design.md
+++ b/docs/design.md
@@ -1,16 +1,17 @@
-# Yapa — design system v0 (kero-system)
+# JujuyGo — design system v0 (kero-system)
 
-Dirección aprobada por el dueño sobre `docs/mockups/mock-04.html` (fuente de verdad visual).
-Gobierna toda pantalla de Yapa. Referencias madre: travel-sensations.com (calidez editorial, GPS-como-ornamento), Citymapper/Moovit (precisión operativa), Explora (datos como ornamento).
+Dirección aprobada por el dueño sobre `docs/mockups/mock-04.html` (fuente de verdad visual de tokens y patrones).
+**Composición del Home: manda la maqueta aprobada «Descubrí Jujuy»** (`docs/mockups/maqueta-descubri-jujuy.png`; decisión de Franco 2026-11-15). Donde este documento y la maqueta choquen en el Home, gana la maqueta; el resto de este sistema sigue vigente.
+Gobierna toda pantalla de JujuyGo. Referencias madre: travel-sensations.com (calidez editorial, GPS-como-ornamento), Citymapper/Moovit (precisión operativa), Explora (datos como ornamento).
 
 ## Identidad
 
-**Yapa** = el extra que te regala Jujuy. El producto regala algo de más: el plan que cierra, la sugerencia que no pediste. Los itinerarios se llaman **travesías**. Las sugerencias de la IA se llaman **yapas** — la marca ES el feature.
+**JujuyGo** es la marca pública. «Jujuy se descubre. También se puede recorrer sin auto.» Los itinerarios se llaman **travesías**. Las recomendaciones inteligentes se llaman **yapas** (el extra que te regala Jujuy): son un feature dentro del plan, no la identidad principal. Los identificadores técnicos `yapa*`, `TipoYapa`, `/api/yapa/*` no se renombran.
 
 ## Personalidad
 
 Editorial cálida + precisión quirúrgica. Revista para soñar, instrumento para moverse.
-Jamás: look de template, emoji como ícono, círculos de colores con iniciales, cards iguales en grilla, píldoras de colores, pasteles dulzones, tipografía system-font a 14px para títulos.
+Jamás: look de template, emoji como ícono, círculos de colores con iniciales, cards iguales en grilla (excepción única: las cuatro regiones del Home, según la maqueta), píldoras de colores, pasteles dulzones, tipografía system-font a 14px para títulos.
 
 ## Tokens
 
@@ -28,15 +29,17 @@ Jamás: look de template, emoji como ícono, círculos de colores con iniciales,
 - **Grano:** overlay SVG feTurbulence 5% global — mata el plástico
 - **Sombras:** ninguna decorativa; profundidad solo por capa foto↔texto
 
-## Patrones de página (del mock aprobado)
+## Patrones de página (del mock aprobado; el Home sigue la maqueta)
 
-- **Hero a sangre:** foto cubre 100svh, velo gradiente, nav píldora flotante, titular serif centrado, coordenadas al pie
-- **Secuencia narrativa:** Imaginá → Armalo → Vivílo → Acordate como columnas con regla fina (no tarjetas)
-- **Zonas:** collage asimétrico (1 grande + 3 laterales), foto con datos (`KM · MSN`)
+- **Hero a sangre:** foto a sangre, velo gradiente. En el Home (maqueta): header compartido sobre la foto, titular serif alineado a la izquierda, buscador Desde/Hasta funcional y nota de verificación de horarios; sin coordenadas al pie
+- **Secuencia narrativa:** Imaginá → Armalo → Vivílo → Acordate como columnas con regla fina (no tarjetas). No forma parte del Home de la maqueta
+- **Zonas / regiones:** en el Home, cuatro tarjetas iguales (Quebrada, Valles, Yungas, Puna) con foto, nombre y flecha, según la maqueta. Fuera del Home, el collage asimétrico (1 grande + 3 laterales, foto con datos `KM · MSN`) sigue disponible
+- **Mapa del Home:** OpenStreetMap con lugares (óxido), paradas (verde) y leyenda; sin simular terreno ni satélite; Purmamarca Pueblo y Cruce separados
+- **Bordes de papel rasgado y línea de cerros:** ornamentos SVG en código, `aria-hidden`
 - **Imperdibles:** filas editoriales `num itálica | nombre serif | texto | meta | →`, reglas finas
 - **Pausa fotográfica:** foto a sangre + cita entre secciones
 - **Banda operativa (verde):** la herramienta — timeline de tramos con nodos-punto ocre
-- **Footer:** wordmark gigante + frase + coordenadas
+- **Footer:** wordmark + frase («Turismo de Jujuy, con identidad.») + solo enlaces a destinos que existen + créditos de fotos; sin redes ni páginas inexistentes
 
 ## Modelo de interacción (4 momentos)
 
```

<!-- ANEXO: script que reproduce el hash d4c832b4 -->

```js
// Reproduce el hash canónico del dataset de horarios.
// Uso: node hash-canonico.mjs <ruta a horario-quebrada.js>
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const sortKeys = v => Array.isArray(v) ? v.map(sortKeys)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])]))
  : v;
const hashDe = async ruta => {
  const mod = await import(pathToFileURL(ruta).href);
  const d = mod.default ?? mod;
  return { d, h: createHash('sha256').update(JSON.stringify(sortKeys(d))).digest('hex') };
};

const ruta = process.argv[2];
const { d, h } = await hashDe(ruta);
console.log('archivo   ', ruta);
console.log('sha256    ', h);
console.log('registros ', d.horarios.length, '| claves raiz', Object.keys(d).sort().join(','));

// Prueba de independencia del fin de línea: copia con CRLF y con LF.
const raw = readFileSync(ruta, 'utf8').replace(/\r\n/g, '\n');
const dir = mkdtempSync(join(tmpdir(), 'hq-'));
for (const [nombre, contenido] of [['lf.mjs', raw], ['crlf.mjs', raw.replace(/\n/g, '\r\n')]]) {
  const p = join(dir, nombre); writeFileSync(p, contenido);
  console.log(nombre.padEnd(9), (await hashDe(p)).h);
}
```

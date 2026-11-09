# Plan de desarrollo — JujuyGo / Yapa

Documento de revisión previa al desarrollo. Se ajusta acá y recién después se codifica.
Fuentes: `docs/research.md` (tesis), `docs/scope.md` (features), `docs/design.md` (sistema),
`specs/`, `slices.conf`, `docs/agents/orquestacion.md`, `docs/spike-santa-ana-api.md`.
Fecha: 2026-11-09.

## 1. Contexto

**Qué es.** **Yapa** — un itinerario *operable* sobre transporte público real para Jujuy.
No es una guía más: responde "qué colectivo me lleva a Purmamarca, a qué hora vuelve y qué
entra en un día" usando horarios reales/publicados, más sugerencias de IA (**yapas**) que
respetan el reloj del colectivo. La ventana de mercado: Santa Ana publicó datos en tiempo
real en oct-2026 y nadie los convirtió en planificación de viaje (spike #11: hay endpoints
públicos de líneas, paradas y recorridos).

**Para quién.** El turista sin auto: el 68% llega por tierra. 85% nacional, 15% extranjero
(Brasil primero → PT antes que EN). Estadía media 2,89 días. El 62% se informa por redes:
el competidor real es Instagram + Google Maps, no otra app.

**Tono.** Editorial cálida + precisión quirúrgica: "revista para soñar, instrumento para
moverse". Marca **Yapa** = el extra que te regala Jujuy; los itinerarios son **travesías**;
las sugerencias IA son **yapas**. La honestidad es el feature: si el dato es horario
publicado se dice ("salí 15 min antes"); si es tiempo real, se dice. Sin look de template,
sin emojis como íconos, sin grilla de cards iguales.

**No hace.** Trámites ni agenda de gobierno (es de Tu Jujuy), reservas ni pagos, seguridad/911,
chat libre con IA, guía enciclopédica, colectivos urbanos como producto (se usan como dato).

## 2. Resultado

**Una sola app**, monorepo: `frontend/` Angular + Leaflet/OSM · `backend/` Node + Express ·
Postgres local para tests · Supabase cloud para auth/datos/memoria de yapas.

| Feature scope | Qué ve el usuario | Estado 2026-11-09 |
|---|---|---|
| ZON catálogo | `/` home revista + `/lugares/:slug` detalle (qué es, cómo se llega) | mergeado (slice 03) |
| MOV horarios | líneas y horarios RN9 como dato de la app | mergeado (04) |
| MAP mapa | atractivos y paradas sobre OSM | mergeado (05) |
| ITI travesía | `/travesia` — plan día por día por rango de fechas | mergeado (07); refinado en 10 |
| HOT/GUI | hospedaje y guías por zona | parcial (09: migration 003 + datos) |
| RUT cómo llegar | paso a paso terminal → pueblo, guiado sobre mapa | **en curso** (06, a medias) |
| REC yapas | sugerencias IA contextuales dentro del plan | **en curso** (10, pendiente verificar) |
| SAV guardar/compartir | travesía persistente + link | sin construir |
| LNG i18n | ES base, PT/EN | sin construir |
| Tiempo real | posiciones Santa Ana en vivo | spike hecho; integración pendiente |

## 3. Imágenes

| Recurso | Dónde | Licencia/nota |
|---|---|---|
| 9 fotos de destinos (purmamarca, tilcara, hornocal, salinas, puna, calilegua, garganta, salsaju, tren) | `frontend/public/img/` | CC BY-SA / CC BY, Wikimedia — créditos en `CREDITS.md` |
| 2 fotos extra (artesanias, humahuaca) | `docs/mockups/assets/` | mismas fuentes, sin copiar aún a `public/` |
| Logo | `docs/mockups/logo/` | 3 SVG: `logo-mark`, `logo-wordmark`, `logo-lockup` |
| Referencia visual | `docs/mockups/mock-04.html` | **fuente de verdad aprobada** por el dueño |
| Stand-ins futuros | taste-skill `photos.mjs` | búsqueda de fotos con licencia si faltan |

Regla: toda foto usada lleva atribución (CC BY-SA exige share-alike; `tren.jpg` es CC BY).
Los créditos van en una línea de footer, nunca captions bajo la imagen (design.md + taste-skill).

## 4. Plan de desarrollo

### Apps

Una sola: **Yapa web** (Angular, instalable vía PWA más adelante si se decide). El backend
es su API, no un producto separado. No hay segunda app en el horizonte del plan.

### Fases

**Fase 0 — cimientos (hecha):** andamio monorepo, catálogo, horarios, mapa, travesía base,
pulido editorial sobre mock-04. Slices 01→09 mergeados.

**Fase 1 — cerrar lo abierto (ahora):**
1. `./slices verificar 10-plan-elegido` (checks) → subagente-juez → `verificar` → merge si cierra verde (trabajo + recibo listos).
2. Relanzar `06-como-llegar` (retoma sobre las +443 líneas ya escritas; el último worker
   murió en dispatch, `agent_prompt_blocked`).
3. Higiene: `worker-release` de dispatches muertos; decidir `environment.ts` (túnel
   cloudflare ¿se revierte?); commitear specs 06/10 y este plan.

**Fase 2 — completar scope MVP (slices nuevos, a definir el DAG):**
- SAV: travesía guardada local + link compartible (sin login en MVP).
- GUI/HOT: completar directorio de guías y hospedaje por zona.
- Santa Ana: integrar endpoints públicos (líneas/paradas/recorridos) en el layer MOV.
- REC profundo: memoria de yapas vía Supabase + validador anti-boludeces backend.

**Fase 3 — post-MVP:** LNG (PT primero), tiempo real si la API auth se habilita, PWA.

### Agentes

| Rol | Quién |
|---|---|
| Coordinador + verificador + juez | **Devin** (DAG, `./slices verificar`, `code-review-en-loop`, reporta) |
| Worker en paralelo (un slice por ola) | **Devin** |
| Workers | **Copilot / Antigravity** vía Orca (`LANZADOR=orca`) |
| Tareas mínimas local | **Kimi** (`EJECUTOR=cmd`) — pausado: sin suscripción Kimi Code |
| Juez LLM | **Devin** (`JUEZ="devin"`): subagente de contexto fresco escribe `juez.txt`; `verificar` lo exige. Si `claude -p` revive → juez de otro vendor |
| Supervisión | la persona — revisa al final de cada ola, no aprueba cada paso |

### Skills por momento

| Momento | Skill |
|---|---|
| Pedido nuevo | `start` → ruta: leer / directo / orquestar |
| Partir y lanzar | `orquestar-slices` (`./slices`: SPEC, DAG, verificar, merge) |
| Diseñar UI | `impeccable`; `docs/design.md` + `mock-04` como ley |
| UI tipo place (home, detalle) | `taste-skill` — criterio photo-led + `gate.mjs` manual |
| Medir pantalla renderizada | `kero-audit` sobre `playwright-cli` (browser propio, screenshots, sesiones por slice `-s=`) |
| Review de código UI | `web-design-guidelines` (Vercel) — *pendiente vendor-ear* |
| Trabajar con tests | `tdd` en el SPEC del worker |
| Verificar slice | `./slices verificar` (checks; juez cuando haya LLM) |
| Cerrar ticket | `code-review-en-loop` → `qa-con-video` (video con playwright-cli) |
| Dominio / issues | `domain-modeling` (GLOSSARY+ADR), `gh` + triage-labels |

### Decisiones abiertas (para ajustar en esta revisión)

1. **Pagador**: hoteleros/guías vs turista gratis — research lo marca como decisión previa
   al código de monetización; hoy no bloquea el MVP.
2. **`environment.ts` en master**: apiUrl apunta a un túnel cloudflare — ¿lo revierto o es
   setup intencional de desarrollo?
3. **Specs 06/10 sin commitear** en master + este plan nuevo — ¿los commiteo juntos?
4. **`web-design-guidelines`**: ¿lo vendor-eo en `.agents/skills/` o lo descartamos?
5. **02 y 08**: números de slice libres si hacen falta slices chicos en Fase 2.

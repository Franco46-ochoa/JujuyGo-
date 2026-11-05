# JujuyGo

App de turismo de Jujuy: zonas, hoteles, guías, itinerarios y colectivos. Monorepo: `frontend/` (Angular + Leaflet/OSM), `backend/` (Node + Express), Postgres local para tests, Supabase cloud para auth/datos. Tracker: GitHub Issues.

## Agent skills

### Issue tracker

Issues y specs viven como GitHub issues (`gh` CLI, repo `Franco46-ochoa/JujuyGo-`). See `docs/agents/issue-tracker.md`.

### Triage labels

Los cinco roles canónicos, con el mismo nombre de label. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` en la raíz. See `docs/agents/domain.md`.

### Orquestación

Devin coordina (DAG, verificación, merges) y también toma un slice por ola. Los workers son Gemini vía Orca; Kimi corre tareas mínimas local. `./slices` verifica con tests + juez antes de mergear. Qué skill usar en cada momento: `docs/agents/orquestacion.md`.

<!-- slices:reglas -->
## Cómo se trabaja en este repo (slices)

- El trabajo se parte en slices. Cada uno tiene un SPEC en `specs/<id>.spec.md`.
- Trabajá en el directorio donde estás parado: es el worktree de tu slice. No
  escribas en otro checkout.
- No toques archivos fuera del "Alcance de archivos" de tu SPEC. Si hace
  falta, decilo en el recibo: no lo hagas en silencio.
- Un slice está hecho cuando pasan los chequeos de `slices.conf` y están los
  tests que el SPEC exige. Los chequeos se vuelven a correr por fuera.
- Terminá con un recibo: qué hiciste, qué archivos tocaste, qué corriste y con
  qué resultado, y qué NO quedó (gaps). Si no tenés certeza, no digas "listo".
- No hagas `git commit`, `git push` ni cambies de rama: de eso se ocupa `./slices`.
<!-- /slices:reglas -->

# Slice 002 — Prueba worker Antigravity

**Depende de:** nada
**Fuente:** prueba de humo del worker Antigravity vía Orca
**Alcance de archivos:** `divide.js`, `divide.test.js`, `package.json`

## Por qué

Verificar que Antigravity (`--agent antigravity`) trabaja un slice de punta a
punta: worktree, recibo, verificación y merge. Trivial a propósito.

## Qué tiene que pasar

1. `divide.js` exporta `function divide(a, b)` que devuelve `a / b`.
2. Si `b` es `0` devuelve `null`.
3. `package.json` raíz con `"scripts": { "test": "node divide.test.js" }` (si existe, solo ajustar el script).

## Tests exigidos

1. `divide(10, 2)` devuelve `5`.
2. `divide(10, 0)` devuelve `null`.

Ambos en `divide.test.js`, ejecutables con `node divide.test.js` (exit 0 si pasan).

## Criterios de aceptación

- [ ] Pasan los chequeos de `slices.conf`.

## Fuera de alcance

Cualquier otra funcionalidad o configuración.

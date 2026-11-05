# Slice 002 — Slice de prueba Orca

**Depende de:** nada
**Fuente:** prueba de humo del setup de orquestación (worker Orca/agy)
**Alcance de archivos:** `multiplica.js`, `multiplica.test.js`, `package.json`

## Por qué

Verificar de punta a punta que un worker de Orca (agy) trabaja un slice:
worktree, recibo, verificación y merge. Trivial a propósito.

## Qué tiene que pasar

1. `multiplica.js` exporta `function multiplica(a, b)` que devuelve `a * b`.
2. Si algún argumento no es número, devuelve `0`.
3. `package.json` en la raíz con `"scripts": { "test": "node multiplica.test.js" }` (si ya existe, solo agregar el script).

## Tests exigidos

1. `multiplica(3, 4)` devuelve `12`.
2. `multiplica("x", 4)` devuelve `0`.

Ambos en `multiplica.test.js`, ejecutables con `node multiplica.test.js` (exit 0 si pasan).

## Criterios de aceptación

- [ ] Pasan los chequeos de `slices.conf`.

## Fuera de alcance

Cualquier otra funcionalidad o configuración.

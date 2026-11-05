# Slice 001 — Slice de prueba

**Depende de:** nada
**Fuente:** prueba de humo del setup de orquestación
**Alcance de archivos:** `saluda.js`, `saluda.test.js`, `package.json`

## Por qué

Verificar de punta a punta que el pipeline de slices funciona: worktree, worker,
recibo, verificación y merge. El contenido es trivial a propósito.

## Qué tiene que pasar

1. `saluda.js` exporta `function saluda(nombre)` que devuelve `"Hola, <nombre>!"`.
2. Con string vacío devuelve `"Hola, mundo!"`.
3. `package.json` en la raíz con `"scripts": { "test": "node saluda.test.js" }`.

## Tests exigidos

1. `saluda("Jujuy")` devuelve `"Hola, Jujuy!"`.
2. `saluda("")` devuelve `"Hola, mundo!"`.

Ambos tests en `saluda.test.js`, ejecutables con `node saluda.test.js` (exit 0 si pasan, exit 1 si fallan).

## Criterios de aceptación

- [ ] Pasan los chequeos de `slices.conf`.

## Fuera de alcance

Cualquier otra funcionalidad, frontend, backend, configuración extra.

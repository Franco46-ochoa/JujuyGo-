===RECIBO===
hecho: Migración idempotente 004-fotos-lugares.sql que asigna humahuaca.jpg al Monumento a la Independencia y fotos representativas de zona a todos los destinos con foto NULL; copia del asset humahuaca.jpg a frontend/public/img/ y actualización de CREDITS.md con autoría y licencia CC BY-SA 4.0; conteo dinámico real del catálogo en home.html ({{ lugares().length }}); fallback coherente por zona en home.ts, lugar-detalle.ts y travesia.ts asegurando que ningún destino con foto NULL use una foto de otra región; tests unitarios en home.spec.ts, lugar-detalle.spec.ts y travesia.spec.ts verificando conteo dinámico y comportamiento estricto del fallback.
archivos:
- backend/migrations/004-fotos-lugares.sql
- frontend/public/img/humahuaca.jpg
- frontend/public/img/CREDITS.md
- frontend/src/app/home/home.html
- frontend/src/app/home/home.ts
- frontend/src/app/home/home.spec.ts
- frontend/src/app/lugar-detalle/lugar-detalle.ts
- frontend/src/app/lugar-detalle/lugar-detalle.spec.ts
- frontend/src/app/travesia/travesia.html
- frontend/src/app/travesia/travesia.ts
- frontend/src/app/travesia/travesia.spec.ts
- recibos/16-catalogo-fotos/recibo-agente.md
chequeos:
- cd frontend && npm test -- --watch=false (8/8 test files, 34/34 tests verdes)
- cd backend && npm test (12/12 suites, 45/45 tests verdes)
- cd backend && node --test test/catalogo.test.js con DB (7/7 tests verdes)
- cd frontend && npm run build (compilación de Angular exitosa sin errores)
- Verificación directa en base de datos: 0 lugares con foto = NULL, todas las fotos asignadas coinciden con su respectiva región.
gaps: Curaduría fotográfica individual pendiente: los destinos de Puna (laguna-de-los-pozuelos, abra-pampa, la-quiaca) comparten puna.jpg como imagen genérica de zona por entorno sin descarga externa directa; asimismo paleta-del-pintor usa purmamarca.jpg (Quebrada), termas-de-caimancito y san-francisco usan calilegua.jpg (Yungas), y termas-de-reyes y lagunas-de-yala usan salsaju.jpg (Valles). Se tocó frontend/src/app/travesia/travesia.html para suministrar lugar.zona_slug a fotoUrl().
===FIN===
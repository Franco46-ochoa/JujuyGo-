===RECIBO===
hecho: Migración 002-transporte.sql con tablas linea, parada y horario; seed idempotente de línea RN9 con paradas reales en orden (Terminal SS.Jujuy a La Quiaca), distinción Cruce ≠ Pueblo en Purmamarca Cruce (tipo='cruce' + notas), horarios ida y vuelta basados en horario-quebrada.netlify.app con fuente y confianza ('publicado'/'estimado'); router en backend/src/routes/transporte.js montado en index.js bajo /api con GET /api/transporte/paradas y GET /api/transporte/proximos (soporta hora estimada, duración aproximada y filtro por hora); suite completa de tests automatizados node --test contra DATABASE_URL_TEST.
archivos:
- backend/migrations/002-transporte.sql
- backend/src/db.js
- backend/src/seed.js
- backend/src/routes/transporte.js
- backend/src/index.js
- backend/package.json
- backend/.env.example
- backend/.env
- backend/test/transporte.test.js
- recibos/04-horarios/recibo-agente.md
chequeos:
- node src/migrate.js (dev DB y test DB): aplicado con éxito e idempotente
- node src/seed.js (dev DB y test DB): ejecutado e idempotente (sin duplicación de registros)
- cd backend && npm test: 13/13 tests pasando en verde (orden de paradas, regla cruce!=pueblo, cálculo de próximos servicios ida/vuelta, confianza y fuente obligatorias, idempotencia del seed)
- cd frontend && npm test -- --watch=false: pasando en verde (2 tests OK)
gaps: ninguno
===FIN===

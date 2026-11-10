===RECIBO===
hecho: Para origen dentro de SSJ y destino fuera, muestra candidatas urbanas hacia paradaOrigen solo si tiene coordenadas válidas; mantiene el trayecto intraurbano, el fallback de paradas cercanas y limita la flota a buses fresh de líneas candidatas. En acceso RN9, el mapa conserva la polilínea original y omite marcadores urbanos para no confundirla.
archivos: frontend/src/app/como-llegar/como-llegar.ts, frontend/src/app/como-llegar/como-llegar.html, frontend/src/app/como-llegar/como-llegar.spec.ts, recibos/19-urbano-acceso-rn9/recibo-agente.md
chequeos: frontend `npm test -- --watch=false` (49/49); frontend `npm run build` (OK, con avisos de presupuesto de bundle/CSS); backend `npm test` (56 pasaron); auditoría Kero en ambas rutas a 390x844 y 1440x900 (sin fallas duras ni errores de consola); interacción GPS simulada en Cerro Siete Colores mostró el encabezado de acceso RN9 y la fuente.
gaps: La prueba de API de catálogo del backend requiere DATABASE_URL_TEST y no se ejecutó; GPS validado con ubicación simulada, no en dispositivo físico.
===FIN===

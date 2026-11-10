# Plan completo de desarrollo — JujuyGo / Yapa

**Estado:** propuesta de producto para aprobación. Fecha: 2026-11-09.
**Decisiones confirmadas por el propietario:** autenticación Google desde el inicio; exploración permitida; herramienta gratuita de la marca; empezar por una ruta; recomendar recursos; portada con carrusel de imágenes en movimiento.
**Esta revisión reemplaza las prioridades de implementación de la versión anterior de este documento.** No autoriza nuevos commits, merges, pushes ni cambios de configuración de producción.

## 1. Qué vamos a construir y para quién

Yapa ayuda a una persona que llega a Jujuy a decidir qué visitar y cómo moverse, con datos que pueda comprobar. La primera versión será una herramienta gratuita para enriquecer la experiencia turística de la marca. No es una OTA ni una reserva de pasajes.

**Problema que resolvemos:** el visitante no solo quiere saber dónde queda Purmamarca. Necesita saber si puede llegar ese día, desde dónde toma el servicio, dónde baja, cómo accede al destino y cómo vuelve antes de perder su conexión. Una foto atractiva o una tarifa sin fecha no responde eso.

**Diferencial propuesto:** una travesía donde cada tramo tiene origen, fecha, empresa, horario o estimación identificada, precio con vigencia, acceso final y una alternativa cuando el servicio no alcanza. Las yapas se incorporan solo si respetan esas restricciones. No se promete tiempo real ni disponibilidad de asientos.

**Exclusiones del primer MVP:** compra de pasajes, pagos, reservas hoteleras, chat libre, cotizaciones por WhatsApp, registros de guías como producto comercial y expansión simultánea a todos los corredores.

### Evidencia y límites

La investigación existente documenta crecimiento turístico y la necesidad de movilidad. No demuestra demanda de esta app ni disposición a pagar: esos estudios siguen pendientes. El producto gratuito no necesita inventar un pagador para empezar, pero sí necesita una persona que mantenga datos y contenido correctos.

No se han comprobado tarifas actuales en boleterías ni salidas reales de todos los servicios. Los ejemplos obtenidos en la investigación son material para contrastar fuentes, no datos autorizados para publicar.

## 2. Experiencia propuesta

### Inicio y catálogo

- **Hero:** carrusel editorial de fotos reales, una imagen grande por vez. Nombre de destino y frase editorial visibles. Controles anterior/siguiente, indicadores del lugar actual, pausa al tocar, hover o foco. Sin autoplay en la primera versión: el movimiento viene de transiciones entre imágenes, no de videos automáticos que consuman datos y distraigan.
- **Galería del lugar:** carrusel compacto con varias imágenes verificadas del mismo destino. No repetir la misma foto como si fueran distintas perspectivas. Una imagen sin alternativa válida se muestra sola, sin controles inútiles.
- Mantener el sistema visual Yapa: Fraunces, Archivo, papel, óxido, verde y grano. La portada sigue siendo editorial y operativa; no se convierte en una secuencia de tarjetas genéricas.
- Explorar zonas, lugares, fotos y cómo llegar sigue disponible sin cuenta.

**Regla de movimiento:** transiciones de 180–280 ms, reducción de movimiento respetada, controles accesibles por teclado y área táctil de al menos 44 px. No hay slides infinitos, texto dentro de la imagen que corte ni cambio automático que impida leer.

### Primer recorrido completo

Propuesta: **Terminal de San Salvador → Maimará → Tilcara → Humahuaca**, con regreso según disponibilidad. Es una ruta para validar conectividad real, no una promesa de que todas las paradas estén en el mismo servicio.

La persona puede ver una propuesta de ejemplo sin cuenta. Para generar, personalizar, guardar o compartir una travesía, inicia sesión con Google desde el inicio, según la decisión confirmada.

Cada resultado debe distinguir:

1. Qué quiere visitar y cuándo.
2. Qué servicios encontrados cubren cada tramo.
3. Qué horarios son publicados y cuáles estimados.
4. Cuánto cuesta, para qué fecha y con qué fuente.
5. Dónde baja y cómo llega al atractivo.
6. Cómo vuelve y qué hacer si pierde el servicio.
7. Qué información falta para cerrar el plan.

Si no hay datos suficientes para una conexión, la app muestra la limitación y propone consultar la terminal o un medio local identificado. No completa el hueco con horarios inventados ni selecciona silenciosamente otro destino.

## 3. Autenticación y privacidad

### Google desde el inicio

- El botón principal es **Continuar con Google** mediante Supabase Auth. No se añade email/contraseña como segundo camino si Google resuelve el caso principal.
- Antes de OAuth, mostrar qué datos se usan y para qué: identidad mínima para asociar planes y preferencias; no se solicitan contactos de Google ni permisos adicionales.
- Supabase valida la identidad y emite la sesión. El backend verifica el token antes de guardar o recuperar datos personales. Una sesión del navegador no equivale a autorización para modificar datos de otro usuario.
- Rutas públicas: catálogo, imágenes y consultas generales de transporte. Rutas privadas: planes propios, preferencias y yapas personales.
- Un enlace público de una travesía solo muestra los datos necesarios para leerla. No concede acceso al perfil, preferencias, borradores privados ni historial del propietario. Los enlaces públicos requieren un identificador no adivinable; tener la URL no es equivalente a poder editar.
- Si Google no está configurado o no responde, mostrar un error accionable. No caer silenciosamente en un modo local que parezca guardar cuando no guarda.

### Persistencia y borrado

Los planes guardados pertenecen a la cuenta. La memoria de yapas se guarda por usuario y se usa únicamente para mejorar las sugerencias dentro del producto. No se venden datos ni se usan para publicidad.

Debe existir una forma clara de eliminar la cuenta y sus datos asociados, incluyendo planes y preferencias personales. Definir retención y procedimiento antes de publicar; no conservar tokens de proveedores ni registrar conversaciones sensibles. Las copias públicas deliberadamente compartidas requieren una explicación de qué queda accesible al compartir el enlace.

**Dependencia externa:** configurar proyecto Supabase, proveedor Google, dominios autorizados, callback HTTPS y credenciales de forma segura. Nunca poner secretos en el repositorio ni en prompts. El acceso a una consola no equivale a haber probado OAuth.

## 4. Medios: inventario, fuentes y movimiento

### Qué tenemos y qué falta

- Existen nueve imágenes en `frontend/public/img/` y dos en `docs/mockups/assets/`. Los créditos actuales no reflejan completamente el estado de la base y no acreditan un video nuevo.
- `humahuaca.jpg` existe en mockups, pero no prueba por sí sola que represente el Monumento de Humahuaca. Hay que revisar su contenido y procedencia.
- No hay un video del hero confirmado. La decisión de carrusel elimina la necesidad de producir o descargar un video para la primera versión.
- **No exigir 15 imágenes nuevas ni una foto única por cada atractivo.** Priorizar fotografías correctas de los lugares incluidos en la ruta.

### Curaduría

Cada imagen seleccionada tendrá una ficha con:

- Identificador del lugar, autor, fuente original, licencia y fecha de consulta.
- Comprobación visual de que representa el lugar correcto.
- Resolución, formato, peso y derechos de uso para la presentación propuesta.
- Ubicación de la atribución en `CREDITS.md` y en el footer cuando corresponda.

Priorizar Wikimedia Commons con filtros de licencia y procedencia. Una foto encontrada por búsqueda no queda aprobada solo porque aparezca en una página de resultados. No descargar material de bancos de imágenes con términos restrictivos ni reutilizar imágenes de terceros con licencias incompatibles.

Si no hay una fotografía adecuada con derechos claros, usar un tratamiento tipográfico o un mapa del lugar, no una imagen de otro destino. No generar paisajes realistas con IA para presentarlos como fotografías del lugar.

### Carrusel: implementación y aceptación

- Datos de presentación separados de los datos operativos del catálogo.
- Soporte de una, dos o varias imágenes por destino.
- Controles visibles, foco accesible, alternativa textual y respeto de movimiento reducido.
- Carga diferida de imágenes fuera del viewport; versión optimizada para móvil sin descargar innecesariamente todas las fotos del hero.
- Si falla una imagen, mostrar un estado de error sin romper la página; no sustituirla silenciosamente por otro lugar.
- Registrar peso y rendimiento antes y después en una conexión móvil.

## 5. Transporte: una ruta antes que una red completa

### Fuentes y verdad operativa

El modelo debe distinguir **servicio**, **línea comercial**, **empresa**, **parada**, **horario**, **tarifa**, **acceso local** y **fecha del viaje**. Una empresa puede operar distintos servicios y una línea puede tener precios por tramo; no son sinónimos.

Fuentes candidatas a contrastar:

- Terminal de Ómnibus de Jujuy: [horarios locales](https://terminaldeomnibusdejujuy.com.ar/horarios-locales/).
- Tarifario provincial publicado por [El Tribuno, 2 de marzo de 2026](https://eltribunodejujuy.com/informacion-general/2026-3-2-0-0-0-desde-hoy-nuevas-tarifas-en-el-transporte-interurbano), sujeto a confirmación de vigencia y cobertura.
- Actualización [JujuyOnline, 1 de octubre de 2026](https://jujuyonline.com/2026/10/01/nuevas-tarifas-transporte-interjurisdiccional-jujuy-1-octubre-2026/), que no coincide con valores anteriores del plan; requiere validación adicional.
- Sitios de las empresas y consulta presencial en boletería para salidas, disponibilidad y excepciones.

**No usar el cuadro de la versión anterior del plan como tarifario vigente.** No copiar automáticamente cifras de agregadores comerciales ni presentar horarios estimados como publicados.

### Datos mínimos de la primera ruta

- Terminal de origen y llegada confirmadas.
- Empresa y servicio identificables.
- Paradas físicas y orden de recorrido, con correspondencia validada.
- Salidas y llegadas por fecha, con vigencia y estado de verificación.
- Frecuencia por día de semana y feriados, si está documentada.
- Tarifa por tramo, tipo de asiento y condiciones de venta, si aplica.
- Distinción entre servicio común, semi-cama y ejecutivo: sus horarios y precios no se mezclan.
- Horarios nocturnos con fecha de salida y fecha de llegada explícitas.
- Acceso peatonal/local, con duración y origen de la estimación.
- Casos sin conexión suficiente, rutas suspendidas y cierres informados.

Las coordenadas no prueban dónde para el colectivo. Un punto sobre el mapa tampoco demuestra una parada habilitada.

### Diseño del módulo

Mantener un módulo de transporte con una interfaz pequeña y una implementación profunda: catálogo de servicios, resolución de conexiones, reglas de vigencia, tarifas y validación. El itinerario y “Cómo llegar” consumen ese módulo; no deben mantener tres versiones distintas de las mismas reglas.

Para el primer corte:

- Conexión manual asistida por datos, con tramos explícitos.
- Búsqueda por origen, destino y fecha para los servicios que realmente estén cargados.
- Comparación de alternativas solo cuando los datos sean comparables: mismo origen, destino, fecha y clase de servicio.
- Precio mostrado junto a su vigencia; si no se puede establecer el precio final para esa fecha, mostrar “consultar boletería” en vez de un importe engañoso.
- No calcular automáticamente combinaciones imposibles ni prometer escalas que la empresa no ofrece.

### Fuentes externas y scraping

No scraping indiscriminado de Plataform10 ni de sitios de empresas. Primero verificar si existe una API o distribución autorizada de datos. Si se usa scraping, limitarlo a fuentes públicas y compatibles con sus términos, con identificación del robot, frecuencia razonable, respeto de `robots.txt`, caché y posibilidad de apagarlo. No saltar captchas, no evadir controles de acceso y no copiar material protegido.

Si no hay permiso o una fuente confiable, cargar los datos mínimos de la ruta con fichas de verificación y actualización manual. Un CSV editable es aceptable para el primer corte si tiene dueño, fecha y fuente.

## 6. Estado real y correcciones prioritarias

| Área | Estado comprobado | Trabajo pendiente |
|---|---|---|
| Explorar | Home, catálogo y detalle existen | Corregir datos y presentación; carrusel real |
| Mapa | Leaflet/OSM implementado | Validar que los marcadores sean accesos y paradas reales |
| Cómo llegar | Implementado para un subconjunto | No confundir cobertura RN9 con cobertura provincial; mostrar empresa, fecha y tarifa |
| Travesía | Generador, validación y yapas implementados | Corregir itinerario multi-tramo; no llamar “real” a horarios estimados |
| Transporte | RN9 y algunos datos sembrados | Añadir ruta completa con fuentes; no asumir cobertura Ramal/Valles |
| Hospedaje | Home consulta una lista y muestra estado de verificación | Los 6 registros del seed no son un directorio completo ni verificado |
| Guías | Registro PDF oficial localizado | No hay integración automática ni transcripción validada; el PDF no se muestra como consulta actualizada |
| Auth/SAV | No implementado | Google, sesiones, permisos y borrado de datos |
| Internacionalización | Español y locale es-AR | PT/EN después del uso real del producto |

### Defectos que no deben pasar inadvertidos

1. **Imágenes:** seis lugares tienen `foto NULL`; tres lugares de Puna repiten `puna.jpg`; varios componentes cambian una ausencia de foto por `purmamarca.jpg`. El catálogo de mockups y la base no están reconciliados.
2. **Acceso:** el acceso local solo contempla Purmamarca Cruce y Hornocal. Otros destinos pueden recibir “llegada” sin instrucción final real.
3. **Generación del plan:** el modelo front usa mapas locales por nombre de localidad y un contexto limitado de horarios. El validador backend también está centrado en RN9. Agregar líneas a la base no basta para que el plan las use.
4. **Primera salida:** el generador propone 05:30 para el primer día sin verificar que exista un servicio que permita llegar al primer evento. Debe buscar la primera conexión compatible, no asumir una hora universal.
5. **Retorno nocturno:** la validación suma minutos sin representar explícitamente cambios de fecha. Un servicio de las 23:50 puede llegar al día siguiente. Definir y probar esa semántica antes de ofrecer planes nocturnos.
6. **Fechas:** la generación actual no tiene calendario de feriados, vigencias de tarifas ni excepciones por día. No presentarla como validación para cualquier fecha futura.
7. **Datos duros:** el home afirma “17 atractivos” aunque la base tiene 15 lugares. Los conteos deben provenir del catálogo.
8. **Verificación:** los tests de catálogo se omiten sin `DATABASE_URL_TEST`; el entorno local no respondió a la consulta de diagnóstico intentada. No afirmar suite completa ni datos locales verificados hasta ejecutarla correctamente.
9. **Seguridad:** CORS permite cualquier origen y los datos de transporte usan consultas SQL parametrizadas. Al incorporar identidad, definir orígenes permitidos, límites de solicitudes y autorización por recurso. No habilitar escritura anónima como atajo.
10. **Operación:** `docs/agents/orquestacion.md` contiene afirmaciones desactualizadas sobre workers, juez y Supabase compartido. La revisión de código no equivale a una auditoría de seguridad ni a una prueba de carga.

## 7. Arquitectura objetivo

```text
Angular: explorar, autenticación, plan editable, “cómo llegar”
                     |
             contratos de API versionados
                     |
        Express: autorización y casos de uso
             |                 |
  Transporte y tarifas    Cuentas y planes
  (fuentes + reglas)      (Supabase Auth/Postgres)
             |                 |
       Postgres: datos       Supabase: identidad
       con procedencia       y permisos del recurso
```

### Reglas de implementación

- Un único origen de horarios/tarifas para itinerario, guía y yapas.
- Datos con `fuente`, `vigente_desde`, `vigente_hasta`, `confianza` y fecha de verificación donde aplique. `publicado` describe el origen del dato; no garantiza disponibilidad actual.
- No almacenar secretos en el frontend ni confiar en un `user_id` enviado por el cliente.
- IDs internos estables, slugs públicos legibles, entidades distintas para paradas y atractivos. Evitar depender de coincidencias de texto o coordenadas.
- Transacciones al guardar un plan; validar tamaño, fechas y referencias antes de persistir.
- Preparar migraciones hacia adelante. No reescribir datos de producción mediante un seed de desarrollo.
- Supabase puede alojar identidad y datos; el Postgres local de desarrollo no debe asumirse como la misma base de producción. Definir ambientes separados antes de configurar.
- Repositorio remoto: `origin` apunta a GitHub, pero las operaciones de red/push no se ejecutaron como parte de esta revisión.

## 8. Roadmap: orden de entrega, no estimación de fechas

### Hito A — que la historia sea verdad

1. Reconciliar catálogo, assets y créditos.
2. Validar una ruta y sus datos operativos.
3. Corregir generador/validador para esa ruta.
4. Implementar carrusel y primera experiencia autenticada de plan.
5. Medir pantallas reales y flujos completos antes de ampliar.

### Hito B — utilizable fuera del recorrido de prueba

- Guardado y enlaces públicos con permisos correctos.
- Búsqueda por fecha, alternativas y plan B.
- Cobertura progresiva de Ramal y Valles, solo con datos comprobados.
- Panel editorial mínimo para actualizar fuentes y retirar datos vencidos.

### Hito C — consolidación

- Directorio de hospedajes y guías basado en fuentes verificadas.
- Memoria de yapas y validación contextual.
- PT/EN según demanda.
- Tiempo real solo si una fuente autorizada y fiable lo permite; offline/PWA como siguiente prioridad.

La antigua numeración 11–14 no debe reutilizarse automáticamente: ya existe una rama/PR histórica con el número 11. Los nuevos SPECs tendrán identificadores propios al aprobar el corte.

## 9. Plan de ejecución por agentes y skills

| Trabajo | Entregable | Dependencia | Agente sugerido | Verificación |
|---|---|---|---|---|
| Mapa de datos y ruta piloto | Inventario de entidades, fuentes y preguntas sin respuesta | Ninguna | Devin | Revisión de fuentes y muestras, sin inventar confirmaciones |
| Catálogo y carrusel | Fotos correctas, créditos, galería y portada | Mapa de datos | Worker independiente + revisión Devin | Prueba visual en 4 anchos y rutas reales |
| Ruta piloto | Datos de servicios, tarifas y accesos de una ruta | Mapa de datos | Worker + responsable de verificar fuentes | Fixtures, casos límite y contraste con fuente |
| Transporte compartido | Motor único de consulta y validación | Contrato del módulo acordado | Devin | Tests de conexiones, fechas, precios y ausencia de datos |
| Auth y SAV | Google, sesiones, planes y enlaces públicos | Infraestructura y contrato de identidad | Worker especializado + revisión Devin | OAuth real, permisos, borrado y errores |
| Itinerario integrado | Propuesta completa de la ruta piloto | Transporte + Auth según funciones | Devin o worker acotado | Recorrido extremo a extremo con datos de prueba y reales controlados |
| Yapas | Sugerencias que respetan la ruta | Itinerario integrado | Worker acotado | Casos de incompatibilidad, límites y privacidad |

**Regla de paralelismo:** dos workers máximo según la configuración actual. No lanzar trabajo dependiente antes de cerrar su contrato. Las tareas que comparten archivos se ejecutan en secuencia o con ownership explícito. La investigación y las decisiones de producto no se delegan como si fueran hechos.

**Juez:** revisión de SPEC contra diff por contexto fresco. Si se vuelve a usar el subagente de Devin, se declara que no es un revisor de otro vendor. Los tests y la revisión visual son gates separados; un CIERRA del juez no sustituye un navegador abierto.

**Skills por etapa:** kero-method/orchestrate para dirección y delegación; taste-skill para dirección visual de lugares; impeccable para estados, formularios y accesibilidad; kero-audit para medición real; tdd/diagnosing-bugs para comportamiento; codebase-design para costuras del módulo; research para fuentes; wizard para configuración humana; code-review-en-loop antes de integrar.

Las skills guían el trabajo, pero no garantizan calidad por sí mismas. No se modifica el hook global de Taste ni se desactivan controles para hacer pasar una auditoría.

## 10. Criterios de aceptación del primer MVP

### Producto

- Un visitante entiende qué es Yapa y puede explorar sin cuenta.
- La portada muestra carruseles funcionales con imágenes pertinentes; no hay imágenes repetidas o rotas por error de asignación.
- La ruta piloto tiene un resultado completo o una explicación precisa de qué falta.
- Cada horario/estimación y precio tiene fuente, fecha y límites claros.
- No se promete conexión, tarifa o acceso que no está sustentado.
- Google permite acceder a funciones personales y los permisos se verifican en servidor.
- Un plan guardado se recupera; un enlace público no permite editar ni acceder a datos privados.
- Eliminar cuenta retira los datos personales definidos en la política de privacidad.
- Yapa no introduce lugares fuera del catálogo ni rompe restricciones de horario/zona.

### Ingeniería

- Tests de reglas de negocio significativas, no solo snapshots de texto.
- Tests de ausencia de conexión, fechas inválidas, cruces de medianoche, feriados no cubiertos, tarifa vencida y permisos denegados.
- Tests de frontend para estados de carga, error, reintento, carrusel y formulario.
- Tests de integración con base aislada y fixtures; nunca contra producción con datos personales reales.
- Build de producción, migraciones reversibles según capacidad y verificación del entorno objetivo.
- Revisión de privacidad, dependencias, secretos y límites de API antes de publicación.

### Visual y móvil

- Medir a 390×844 y 1440×900, además de un ancho intermedio y zoom.
- Sin overflow, controles inaccesibles ni contraste insuficiente en estados relevantes.
- Carrusel usable con mouse, touch y teclado.
- Animaciones reducidas cuando el usuario lo solicita.
- Probar carga en red lenta, imágenes rotas y sesión expirada.
- Capturas y videos de los flujos reales; ningún “auditado” basado solo en suposiciones.

## 11. Decisiones que siguen abiertas

1. **Responsable de validar la ruta:** quién confirma fuentes, boleterías y excepciones operativas. Sin ese rol, el itinerario seguirá dependiendo de inferencias.
2. **Supabase y Google:** proyecto, plan, región, dominios y responsable de credenciales. Supabase free puede pausarse por inactividad; no asumir disponibilidad permanente.
3. **Retención de enlaces públicos y datos de usuario:** cuánto tiempo se conserva cada cosa y cómo se atiende una solicitud de eliminación.
4. **Fuentes de hospedaje y guías:** no integrar listas comerciales no verificadas para aparentar un directorio completo. El PDF oficial de guías localizado no equivale a datos estructurados actualizados.
5. **Cobertura del primer MVP:** confirmar Maimará/Tilcara/Humahuaca como ruta de validación. Yala/Lagunas de Yala y el Ramal requieren un mapa de accesos propio antes de incluirse.
6. **Publicación:** definir hosting, dominio, variables por ambiente y procedimiento de rollback antes del despliegue. Esta revisión no publica la aplicación.

## 12. Definición de “plan completo”

Un plan completo no es una lista de pantallas ni una colección de slices verdes. Incluye producto, datos con procedencia, experiencia, privacidad, operación, pruebas y responsables. Este documento deja preparado el contrato de trabajo; no declara implementadas las capacidades pendientes.

**Siguiente paso propuesto:** revisar y ajustar este documento; después producir el mapa de datos de la ruta piloto y los SPECs concretos. No lanzar otra ola de desarrollo basada en las suposiciones anteriores.

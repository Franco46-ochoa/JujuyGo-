# JujuyGo — diagnóstico (kero-research)

**Tesis:** Jujuy no tiene un problema de "falta app turística" — tiene cuatro oficiales que nadie usa porque son catálogos estáticos o trámites. Lo que falla es **moverse**: el turista sin auto (el 68% llega por tierra) no puede armar un día real — qué colectivo lo lleva a Purmamarca, a qué hora vuelve, qué entra en un día según los horarios reales. JujuyGo no es una guía más: es un **itinerario operable sobre transporte público real**, con recomendaciones de IA que respetan el reloj del colectivo, no el folleto.

## Hallazgos

### El mercado (fuente y fecha)

- **1.500.000+ turistas en 2025**, récord histórico; +56% vs 2015. Estadía promedio 2,89 días (+69%), 4M+ pernoctes (+150% en una década). Impacto ~US$315–336M; turismo = 7–7,5% del PBG y 28.000 empleos. (Prensa Gob. Jujuy, 23-dic-2025; El Tribuno, ago-2025)
- **68% llega por vía terrestre**, 32–37% por aire. 85% nacional, 15% extranjeros (Brasil = 18% de los extranjeros; luego Francia y España). 60% ya había venido antes. (El Tribuno, jul-2024 y ago-2025)
- **62% conoce Jujuy por redes sociales**; 55% busca contacto con naturaleza. Top-3 nacional en temporada invernal (172.000 turistas, ocupación 84,4%). (El Tribuno, ago-2025; jul-2024)
- Plan de Turismo Sostenible 2025–2035: 4 regiones (Puna, Quebrada, Valles, Yungas), objetivo explícito de aumentar estadía y dispersar la demanda fuera de la Quebrada. Registro de guías: 96 inscriptos (+23%, Ley N°6308). (El Tribuno, ago-2025; Diario El Paso, mar-2026)

### Lo que existe hoy (y por qué no es esto)

| Producto | Qué es | Estado al 05-nov-2026 |
|---|---|---|
| **Tu Jujuy** (gobierno, jul-2024) | Trámites + agenda cultural + info turística + hoteles + geolocalización + botón de pánico | Viva pero es app de **servicios al ciudadano**: 2 reseñas en App Store, 96,7 MB, turismo es sección secundaria. Fuente: App Store, prensa.jujuy.gob.ar |
| **Jujuy Energía Viva** (Jujuy Digital SAPEM, ene-2019) | Hoteles, restaurantes, circuitos, **horarios de colectivos** — Purmamarca/Tilcara/Humahuaca | **Muerta**: no aparece en las stores. El precedente más cercano a JujuyGo — murió por ser catálogo estatal sin mantenimiento ni pagador. Fuente: viapais.com.ar (ene-2019) |
| **Jujuy Destino Seguro** (Min. Seguridad, feb-2022) | Acompañamiento de seguridad al turista | Nicho de seguridad, no planificación. Fuente: seguridad.jujuy.gob.ar |
| **Santa Ana app** (oct-2026, hace un mes) | Colectivos urbanos SS. Jujuy en tiempo real (20 líneas, 502 paradas, Alto Comedero ↔ centro): app.santaanasrl.com.ar + Play Store `ar.com.santaana.bus` | **Recién lanzada**: cubre lo urbano, no el turismo interurbano (su línea 3 SS.Jujuy↔Humahuaca sí sirve al turista pero la app no la expone como viaje). Fuente: lavozdejujuy.com (oct-2026), transplo.com |
| Moovit | Cubre las 20 líneas urbanas de Santa Ana con horarios | Global, genérica; no sabe qué es un día en la Quebrada. Fuente: moovitapp.com |

### La competencia regional (leída por lo que prueba gratis)

- **Salta** tiene tres años de ventaja digital y aun así: `Senderos de Salta` (catálogo de 40+ circuitos con registro + 911), `App Valle de Lerma`, `ChatIA` (IA por WhatsApp, declarada de interés municipal, ago-2024) y `Salta.travel` (5 descargas, abandonada 2022). **Lo que prueban: la IA aplicada al turismo local ya validó interés institucional; las guías estáticas siguen muriendo.** (salta.gob.ar, prensa.municipalidadsalta.gob.ar, apppage.net)
- El 62% de los turistas se informa por redes: el competidor real de una guía es Instagram/TikTok + Google Maps, no otra app.

### Lo que cambia la conversación

**Santa Ana publicó datos en tiempo real hace un mes.** Hasta octubre 2026, "qué colectivo me lleva a la Quebrada y cuándo vuelve" se respondía con un PDF de la Terminal o preguntando en la parada (línea 3: Humahuaca→SS.Jujuy con ~6 salidas diarias que pasan por Tilcara, Purmamarca, Volcán — la espina dorsal del turismo sin auto). Ahora hay una API detrás de app.santaanasrl.com.ar: la capa de movilidad **existe como dato por primera vez**, y nadie la convirtió en planificación de viaje. Esa es la ventana.

### Advertencia honesta

- Jujuy Energía Viva ya intentó "hoteles + circuitos + horarios" y murió: la razón probable no fue el producto sino **quién lo mantenía y quién lo pagaba**. Quien paga no es quien usa (turista gratis) — riesgo: hoteleros/guías como pagadores (promoción, agenda) vs usuario turista. Definir esto antes de escribir código.
- "La API de Santa Ana" está asumida, no confirmada: hay una app/web con datos en tiempo real; un endpoint público/documentado es una **suposición a validar en el primer sprint técnico** (puede ser privada). Alternativa declarada: los horarios estáticos de la Terminal + Moovit cubren lo mínimo.

## Cuenta de fuentes

12 resultados revisados: stores (App Store, Play Store vía apppage/transplo), prensa provincial (prensa.jujuy.gob.ar, seguridad.jujuy.gob.ar), diarios locales (El Tribuno, La Voz de Jujuy, Vía País, Diario El Paso, Que Pasa Salta), páginas de servicio (santaanasrl.com.ar, terminaldeomnibusdejujuy.com.ar, moovitapp.com). Datos de mercado: gobierno y prensa local (2024–2026). Nada de esto es encuesta propia: donde dice "probable/asumido" está marcado como opinión.

## Siguiente

`kero-scope` convierte esta tesis en la lista de lo que JujuyGo hace (y no hace). La decisión de pagador (hotelero/guía vs turista gratis) y la validación de la API de Santa Ana son las dos preguntas que el scope tiene que responder.
